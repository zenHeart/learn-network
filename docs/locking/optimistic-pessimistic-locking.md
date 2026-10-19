# 乐观锁与悲观锁：并发控制策略详解

> 本文深入解析分布式系统和数据库并发控制中两种核心策略：乐观锁（Optimistic Locking）和悲观锁（Pessimistic Locking）。涵盖实现原理、代码示例、适用场景对比，以及常见问题（ABA 问题、死锁）的解决方案。

---

## 一、核心概念

### 1.1 什么是并发控制？

并发控制是确保多个事务或线程同时访问共享资源时，数据一致性和完整性的机制。在没有并发控制的情况下，会出现以下典型问题：

| 问题 | 描述 |
|------|------|
| **脏读（Dirty Read）** | 读取到其他事务未提交的修改 |
| **不可重复读（Non-repeatable Read）** | 同一数据在事务内多次读取，结果不一致 |
| **幻读（Phantom Read）** | 事务按条件读取数据时，另一个事务插入了新数据 |
| **丢失更新（Lost Update）** | 两个事务基于相同初始值更新，后者覆盖了前者的修改 |

### 1.2 悲观锁（Pessimistic Locking）

**核心思想**：悲观的认为数据一定会被并发修改，所以**先加锁再操作**，操作完成后释放锁。

```
事务A: 获取锁 → 操作数据 → 释放锁
事务B:     等待锁... → 获取锁 → 操作数据 → 释放锁
```

**特点**：
- 强调**预防优先**：宁可多消耗资源，也要确保数据安全
- 适用于**冲突频繁**的场景
- 锁持有时间较长，可能导致性能瓶颈

### 1.3 乐观锁（Optimistic Locking）

**核心思想**：乐观的认为冲突很少见，**先操作后检查**，检测到冲突时重试或回滚。

```
事务A: 操作数据 → 检查版本 → 提交成功
事务B: 操作数据 → 检查版本 → 冲突! 重试...
```

**特点**：
- 强调**乐观进取**：假设无冲突，出现冲突再处理
- 适用于**冲突较少**的场景
- 无锁等待，最大化并发性能

---

## 二、实现方法

### 2.1 悲观锁实现

#### 2.1.1 数据库行锁（SELECT ... FOR UPDATE）

```sql
-- 事务A：锁定用户余额行
BEGIN;
SELECT balance FROM accounts WHERE user_id = 1 FOR UPDATE;
-- 锁定后，其他事务无法修改这条记录

UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
COMMIT;
```

```sql
-- 事务B：尝试锁定同一行（会被阻塞）
SELECT balance FROM accounts WHERE user_id = 1 FOR UPDATE;
-- 等待事务A释放锁后，才能获取
```

**MySQL 实现细节**：

```sql
-- 间隙锁（Gap Lock）：锁定一个范围内的数据
SELECT * FROM orders WHERE status = 'pending' FOR UPDATE;
-- 锁定所有 status='pending' 的行及它们之间的间隙

-- 记录锁（Record Lock）：锁定单条索引记录
SELECT * FROM orders WHERE id = 123 FOR UPDATE;
-- 仅锁定 id=123 的记录
```

#### 2.1.2 分布式锁（Redis / ZooKeeper）

**Redis SETNX 实现**：

```javascript
// 获取锁
const acquireLock = async (lockKey, ttlMs = 30000) => {
  const result = await redis.set(lockKey, '1', 'NX', 'PX', ttlMs);
  return result === 'OK';
};

// 释放锁（Lua 脚本保证原子性）
const releaseLock = async (lockKey, expectedValue) => {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  return await redis.eval(script, 1, lockKey, expectedValue);
};

// 使用示例
const lockKey = `order:lock:${userId}`;
const lockValue = Date.now().toString();

if (await acquireLock(lockKey)) {
  try {
    // 执行业务操作
    await processOrder(userId);
  } finally {
    await releaseLock(lockKey, lockValue);
  }
} else {
  throw new Error('获取锁失败，请稍后重试');
}
```

**ZooKeeper 实现**：

```java
// 使用 Curator 框架
InterProcessMutex lock = new InterProcessMutex(client, "/orders/lock");
try {
  if (lock.acquire(30, TimeUnit.SECONDS)) {
    // 执行业务操作
    processOrder();
  }
} finally {
  lock.release();
}
```

#### 2.1.3 Java synchronized / ReentrantLock

```java
public class OrderService {
  private final ReentrantLock lock = new ReentrantLock();

  public void processOrder(Long userId) {
    lock.lock();
    try {
      // 读取用户余额
      BigDecimal balance = getBalance(userId);
      // 检查余额是否充足
      if (balance.compareTo(orderAmount) < 0) {
        throw new InsufficientBalanceException();
      }
      // 扣减余额
      updateBalance(userId, balance.subtract(orderAmount));
      // 创建订单
      createOrder(userId, orderAmount);
    } finally {
      lock.unlock(); // 必须在 finally 中释放
    }
  }
}
```

### 2.2 乐观锁实现

#### 2.2.1 版本号机制（最常用）

```sql
-- 添加 version 字段
ALTER TABLE accounts ADD COLUMN version INT DEFAULT 0;

-- 读取数据
SELECT balance, version FROM accounts WHERE user_id = 1;
-- 返回: balance=1000, version=3

-- 更新时检查版本
UPDATE accounts 
SET balance = balance - 100, version = version + 1 
WHERE user_id = 1 AND version = 3;

-- 影响行数判断
-- 影响 1 行 → 成功
-- 影响 0 行 → 版本已变化，冲突！
```

**MyBatis 实现**：

```xml
<update id="deductBalance">
  UPDATE accounts
  SET balance = balance - #{amount},
      version = version + 1
  WHERE user_id = #{userId}
    AND version = #{version}
    AND balance >= #{amount}
</update>
```

```java
public boolean deductBalance(Long userId, BigDecimal amount, Long version) {
  int rows = accountMapper.deductBalance(userId, amount, version);
  return rows == 1; // 影响行数为1表示成功，0表示版本冲突
}
```

**Spring Data JPA 实现**：

```java
@Entity
public class Account {
  @Id
  private Long id;

  @Version  // JPA 自动管理版本号
  private Long version;

  private BigDecimal balance;
}
```

```java
@Service
public class AccountService {
  @Transactional
  public void transfer(Long fromId, Long toId, BigDecimal amount) {
    Account from = accountRepo.findById(fromId).orElseThrow();
    Account to = accountRepo.findById(toId).orElseThrow();

    from.setBalance(from.getBalance().subtract(amount));
    to.setBalance(to.getBalance().add(amount));

    // JPA 自动检查版本，若冲突则抛出 OptimisticLockException
    accountRepo.saveAll(List.of(from, to));
  }
}
```

#### 2.2.2 CAS（Compare And Swap）

CAS 是乐观锁的 CPU 级别实现，属于**无锁并发控制**（Lock-free）。

**工作原理**：

```
CAS(address, expectedValue, newValue)
  if current_value_at_address == expectedValue:
    store newValue at address
    return TRUE
  else:
    return FALSE
```

**Java atomic 包示例**：

```java
public class Counter {
  private AtomicInteger count = new AtomicInteger(0);

  public void increment() {
    int current;
    do {
      current = count.get();
      // 如果当前值等于 expected，则设置为 new
      // 否则循环重试（其他线程已修改）
    } while (!count.compareAndSet(current, current + 1));
  }

  // 非竞争场景下一次成功
  public void incrementFast() {
    count.incrementAndGet(); // Unsafe + CAS 内部实现
  }
}
```

**多变量 CAS 的局限性**：

```java
// 问题：只能保证单个变量原子性
AtomicInteger balance = new AtomicInteger(1000);
AtomicInteger version = new AtomicInteger(1);

// 这个操作不是原子的！
balance.addAndGet(-100);
version.incrementAndGet(); // 可能在两次操作之间被其他线程修改
```

#### 2.2.3 时间戳机制

```sql
UPDATE accounts
SET balance = balance - 100, last_modified = NOW()
WHERE user_id = 1
  AND last_modified = '2024-01-01 10:00:00';
```

**缺点**：时间戳精度依赖系统时钟，时钟回拨会导致问题。

---

## 三、核心区别对比

| 维度 | 乐观锁 | 悲观锁 |
|------|--------|--------|
| **策略** | 先操作，后验证 | 先加锁，后操作 |
| **实现** | 版本号 / CAS | 数据库锁 / 分布式锁 |
| **冲突处理** | 重试 / 回滚 | 阻塞等待 |
| **性能特征** | 冲突少时高效 | 冲突多时低效 |
| **适用场景** | 读多写少 | 写多读少 |
| **锁范围** | 无锁（最多重试） | 持有期间独占 |
| **死锁风险** | 无 | 有（需额外处理） |
| **适用并发度** | 高并发 | 低并发 |

---

## 四、适用场景分析

### 4.1 乐观锁适用场景

**特点**：冲突概率低、对响应时间敏感

```
✅ 库存扣减（下单量 << 库存量）
✅ 用户信息更新（用户各自修改自己的数据）
✅ 配置读取（读远多于写）
✅ 文档协作（最终一致即可）
```

**库存扣减示例**：

```java
public boolean deductStock(Long productId, Integer quantity) {
  int retryCount = 3;
  while (retryCount-- > 0) {
    Product product = productRepo.findById(productId).orElseThrow();

    if (product.getStock() < quantity) {
      return false; // 库存不足
    }

    // 乐观锁更新
    int updated = productRepo.deductWithVersion(
      productId,
      quantity,
      product.getVersion()
    );

    if (updated == 1) {
      return true; // 成功
    }
    // 版本冲突，重试
    log.info("库存更新冲突，重试... 剩余次数: {}", retryCount);
  }
  throw new OptimisticLockException("库存更新失败，请重试");
}
```

### 4.2 悲观锁适用场景

**特点**：冲突概率高、数据一致性要求严格

```
✅ 金融交易（余额扣减必须精确）
✅ 库存秒杀（超卖后果严重）
✅ 座位预订（座位只能被一人占有）
✅ 顺序号生成（全局递增序列）
```

**余额扣减示例**：

```sql
-- 使用悲观锁确保余额不会超扣
BEGIN;
SELECT balance FROM accounts WHERE user_id = 1 FOR UPDATE;

-- 此时其他事务都在等待，无法读取旧值
-- 检查余额是否充足
IF balance >= 100 THEN
  UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
  INSERT INTO transactions(user_id, amount) VALUES (1, -100);
  COMMIT;
ELSE
  ROLLBACK;
END IF;
```

### 4.3 混合使用策略

```java
public class InventoryService {
  // 第一层：乐观锁快速检测
  public boolean tryDeduct(Long productId, Integer quantity) {
    int updated = productRepo.deductWithVersion(productId, quantity);
    return updated == 1;
  }

  // 第二层：悲观锁兜底（重试失败后）
  public void forceDeduct(Long productId, Integer quantity) {
    // 使用 SELECT FOR UPDATE 悲观锁
    productRepo.findByIdWithLock(productId).ifPresent(product -> {
      if (product.getStock() >= quantity) {
        product.setStock(product.getStock() - quantity);
        productRepo.save(product);
      } else {
        throw new InsufficientStockException();
      }
    });
  }

  // 最终一致性补偿
  @Transactional
  public void handleDeduction(Long productId, Integer quantity) {
    if (!tryDeduct(productId, quantity)) {
      // 乐观锁失败，降级到悲观锁
      forceDeduct(productId, quantity);
    }
  }
}
```

---

## 五、常见问题与解决方案

### 5.1 ABA 问题

**问题描述**：A → B → A，CAS 通过但实际数据已被修改过。

```
线程A: 读取 X=100
线程B: X = 200 → X = 100  (修改后恢复原值)
线程A: CAS(X, 100, 300)  →  成功！
```

**场景危害**：

```java
// 栈操作示例
Stack stack = new Stack();
stack.push(A);
stack.pop();    // B
stack.push(B);
stack.pop();   // 栈空，但实际上 A 已被移除

// ABA 问题：栈认为没动过，实际上内容已变
```

**解决方案 1：版本号扩展 CAS**

```java
public class AtomicStampedReference<T> {
  private volatile Pair<T, Integer> pair;

  public boolean compareAndSet(T expectedRef, T newRef,
                                int expectedStamp, int newStamp) {
    Pair<T, Integer> current = pair;
    return expectedRef == current.reference &&
           expectedStamp == current.stamp &&
           ((newRef == current.reference && newStamp == current.stamp) ||
             casPair(current, new Pair<>(newRef, newStamp)));
  }
}

// 使用
AtomicStampedReference<Node> stack = new AtomicStampedReference<>(top, 0);
// CAS 时同时检查引用和版本号
```

**解决方案 2：LinkedTransferQueue（Java 并发包）**

Java 的 `LinkedTransferQueue` 使用 **MCS 锁**或 **CLH 锁**变体，彻底避免 ABA 问题。

**解决方案 3：延迟删除（Logical Deletion）**

```sql
-- 物理删除 → 逻辑删除
UPDATE items SET deleted = true, version = version + 1 WHERE id = ?;
-- 而不是 DELETE FROM items WHERE id = ?;
```

### 5.2 死锁（Deadlock）

悲观锁的典型问题：多个事务相互等待对方释放锁。

```
事务A: 锁定 行1，等待 行2
事务B: 锁定 行2，等待 行1
→ 死锁！
```

**解决方案 1：按固定顺序获取锁**

```java
// ❌ 错误：不同顺序导致死锁
public void transfer1(Long fromId, Long toId, BigDecimal amount) {
  if (fromId < toId) {
    lock(fromId); lock(toId);
  } else {
    lock(toId); lock(fromId);  // 可能死锁！
  }
}

// ✅ 正确：统一顺序
public void transfer2(Long fromId, Long toId, BigDecimal amount) {
  Long first = fromId < toId ? fromId : toId;
  Long second = fromId < toId ? toId : fromId;
  lock(first); lock(second);
}
```

**解决方案 2：设置锁超时**

```java
// Redis 分布式锁超时
String lockKey = "order:lock:" + orderId;
String lockValue = UUID.randomUUID().toString();

// 尝试获取锁，最多等待 5 秒，锁 10 秒后自动释放
Boolean acquired = redis.set(lockKey, lockValue,
  SetArgs.Builder.nx().px(5000));

if (Boolean.TRUE.equals(acquired)) {
  try {
    // 业务操作
  } finally {
    // 释放锁
    unlock(lockKey, lockValue);
  }
} else {
  throw new LockTimeoutException("获取锁超时");
}
```

**解决方案 3：死锁检测（数据库）**

```sql
-- MySQL 自动死锁检测
SHOW ENGINE INNODB STATUS;
-- 输出包含 LATEST DETECTED DEADLOCK 部分

-- 设置锁等待超时
SET innodb_lock_wait_timeout = 5; -- 秒
```

### 5.3 乐观锁重试风暴

大量并发更新同一行时，乐观锁会导致大量重试。

**问题**：

```
100 个请求同时更新同一库存
第 1 个成功，剩余 99 个全部重试
→ 99 次无意义的重试
```

**解决方案：退避策略 + 限流**

```java
public Result updateWithRetry(Long id, UpdateRequest req) {
  int maxRetries = 5;
  long backoffMs = 10;

  for (int i = 0; i < maxRetries; i++) {
    try {
      return doUpdate(id, req);
    } catch (OptimisticLockException e) {
      if (i == maxRetries - 1) throw e;

      // 指数退避 + 随机抖动
      long sleepTime = backoffMs * (1L << i)
                     + (long)(Math.random() * backoffMs);
      try {
        Thread.sleep(sleepTime);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw new RuntimeException(ie);
      }
    }
  }
  throw new RuntimeException("Should not reach");
}
```

**更优方案：分段锁**

```
原方案：全局库存 → 100 个并发抢 1 把锁
优化方案：库存分 10 段，每段独立锁
         请求 hash(id) % 10 → 选择段
         锁竞争减少 10 倍
```

---

## 六、Redis 分布式锁最佳实践

### 6.1 Redisson 实现

```java
@Configuration
public class RedissonConfig {
  @Bean
  public RedissonClient redissonClient() {
    return Redisson.create(Config.loadFromFile("redisson.yaml"));
  }
}

@Service
public class OrderService {
  @Autowired private RedissonClient redisson;

  public void createOrder(Long userId, List<Item> items) {
    RLock lock = redisson.getLock("order:create:" + userId);
    boolean acquired = false;

    try {
      // 尝试获取锁，等待 10 秒，锁自动释放时间 30 秒
      acquired = lock.tryLock(10, 30, TimeUnit.SECONDS);

      if (!acquired) {
        throw new BusinessException("系统繁忙，请稍后重试");
      }

      // 业务逻辑
      checkStock(items);
      deductStock(items);
      saveOrder(userId, items);

    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new BusinessException("操作被中断");
    } finally {
      // 只能释放自己持有的锁
      if (acquired && lock.isHeldByCurrentThread()) {
        lock.unlock();
      }
    }
  }
}
```

### 6.2 RedLock 算法（多节点）

```
单机 Redis 问题：Redis 挂了 = 锁丢失

RedLock 方案：
1. 获取 N 个独立的 Redis 节点锁
2. 超过 N/2+1 个成功 = 获取锁成功
3. 容错：少数节点挂了不影响

⚠️ 注意：RedLock 有争议，详见 Martin Kleppmann 反驳
```

```java
public class RedissonMultiLock {
  private final RedissonClient[] clients;
  private final String[] lockKeys;

  public RedissonMultiLock(RedissonClient... clients) {
    this.clients = clients;
    this.lockKeys = Arrays.stream(clients)
      .map(c -> "lock:" + UUID.randomUUID())
      .toArray(String[]::new);
  }

  public boolean tryLock(long waitTime, TimeUnit unit) {
    long deadline = System.currentTimeMillis() + unit.toMillis(waitTime);
    int successCount = 0;

    for (RedissonClient client : clients) {
      if (tryAcquireOnce(client)) {
        successCount++;
      }
      if (successCount > clients.length / 2) {
        return true; // 过半成功
      }
    }
    return false;
  }
}
```

---

## 七、总结与选型决策树

### 决策树

```
遇到并发控制问题
     │
     ▼
冲突频率高吗？
     │
  Yes ──→ 数据一致性要求高吗？
              │
           Yes ──→ 悲观锁（SELECT FOR UPDATE / 分布式锁）
              │
           No  ──→ 混合方案（乐观锁优先 + 悲观锁兜底）
     │
  No ──→ 实时性要求高吗？
              │
           Yes ──→ 乐观锁 + 短重试
              │
           No ──→ 消息队列 / 最终一致性
```

### 关键原则

1. **优先乐观锁**：无锁等待，吞吐量大
2. **悲观锁保守用**：锁范围最小化，持锁时间最短化
3. **统一加锁顺序**：多锁场景下，防止死锁
4. **设置超时**：防止无限等待
5. **监控重试率**：乐观锁重试率 > 5% 需重新评估方案

---

## 参考资料

- [MySQL InnoDB Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [Martin Kleppmann: How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Redis Distributed Locks - Redisson](https://github.com/redisson/redisson/wiki/8.-Distributed-locks-and-synchronizers)
- [Java Concurrency in Practice](https://www.oreilly.com/library/view/java-concurrency-in/0321349601/)
