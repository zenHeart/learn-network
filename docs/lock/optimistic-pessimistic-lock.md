# 乐观锁与悲观锁：原因和解决方法

> 并发控制是分布式系统和数据库系统中的核心问题。本文深入解析悲观锁和乐观锁的原理、实现方式及适用场景。

---

## 目录

- [悲观锁 (Pessimistic Locking)](#悲观锁-pessimistic-locking)
- [乐观锁 (Optimistic Locking)](#乐观锁-optimistic-locking)
- [核心区别对比](#核心区别对比)
- [常见问题与解决方案](#常见问题与解决方案)

---

## 悲观锁 (Pessimistic Locking)

### 原理

**先加锁再操作** —— 悲观的认为并发冲突一定会发生，因此在操作数据前先获取锁，确保其他线程/进程无法访问。

```
线程A: [获取锁] → [操作数据] → [释放锁] → 完成
线程B:           等待...      等待...    [获取锁] → [操作数据] → [释放锁]
```

### 实现方式

#### 1. 数据库行锁

```sql
-- 使用 SELECT ... FOR UPDATE 锁定特定行
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 此时其他事务无法修改 id=1 的行，直到当前事务提交或回滚
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

#### 2. Redis 分布式锁

```java
// Redis SETNX 方式
public boolean acquireLock(String lockKey, String requestId, long expireTime) {
    String result = jedis.set(lockKey, requestId, "NX", "PX", expireTime);
    return "OK".equals(result);
}

// 释放锁（需验证持有者）
public boolean releaseLock(String lockKey, String requestId) {
    String script =
        "if redis.call('get', KEYS[1]) == ARGV[1] then " +
        "    return redis.call('del', KEYS[1]) " +
        "else " +
        "    return 0 " +
        "end";
    Object result = jedis.eval(script, 1, lockKey, requestId);
    return 1L.equals(result);
}
```

#### 3. Redis SET + NX + PX（推荐方式）

```java
// 使用 SET 命令的扩展参数
public boolean acquireLock(String lockKey, String requestId, long expireTimeMs) {
    String result = jedis.set(lockKey, requestId, SetParams.setParams().nx().px(expireTimeMs));
    return "OK".equals(result);
}
```

### 特点

| 特点 | 说明 |
|------|------|
| 独占资源 | 锁持有期间，其他请求阻塞等待 |
| 性能开销 | 高并发下，大量锁等待导致性能下降 |
| 死锁风险 | 多把锁无序获取时可能产生死锁 |
| 适用短事务 | 锁持有时间越短越好，避免长时间阻塞 |

### 适用场景

- **并发量大**：请求频繁，同时操作同一资源
- **冲突频繁**：数据竞争激烈，冲突是常态
- **短事务**：事务执行时间短，锁持有时间短
- **一致性要求高**：不允许脏读、脏写

---

## 乐观锁 (Optimistic Locking)

### 原理

**先操作后验证** —— 乐观的认为并发冲突很少见，先不加锁直接操作，最后验证是否发生冲突。若冲突则重试或报错。

```
线程A: [读取数据] → [业务计算] → [验证版本] → [更新] → 成功
线程B: [读取数据] → [业务计算] → [验证版本] → ❌ 版本已变化，重试
```

### 实现方式

#### 1. 版本号机制（最常用）

```sql
-- 表结构设计
CREATE TABLE products (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100),
    stock INT,
    version INT DEFAULT 0  -- 版本号字段
);

-- 更新时检查版本号
UPDATE products 
SET stock = stock - 1, 
    version = version + 1 
WHERE id = 1 
  AND version = 1;  -- 乐观锁核心：版本匹配才更新

-- 影响行数为 0 时表示版本冲突
```

#### 2. Java 代码示例（版本号机制）

```java
public boolean updateStock(long productId, int quantity) {
    for (int retry = 0; retry < MAX_RETRY; retry++) {
        // 1. 读取当前版本
        Product product = productDao.selectById(productId);
        int currentVersion = product.getVersion();
        
        // 2. 业务计算
        int newStock = product.getStock() - quantity;
        if (newStock < 0) {
            throw new InsufficientStockException();
        }
        
        // 3. 尝试更新（带版本条件）
        int affected = productDao.updateStockWithVersion(
            productId, 
            newStock, 
            currentVersion + 1,  // 新版本号
            currentVersion       // 当前版本号（条件）
        );
        
        // 4. 更新成功则退出
        if (affected == 1) {
            return true;
        }
        
        // 5. 版本冲突，重试
        log.warn("版本冲突，重试第 {} 次", retry + 1);
    }
    throw new OptimisticLockException("更新失败，重试次数耗尽");
}
```

```java
// MyBatis Mapper
@Update("<script>" +
    "UPDATE products " +
    "SET stock = #{newStock}, version = #{newVersion} " +
    "WHERE id = #{id} AND version = #{currentVersion}" +
    "</script>")
int updateStockWithVersion(
    @Param("id") long id,
    @Param("newStock") int newStock,
    @Param("newVersion") int newVersion,
    @Param("currentVersion") int currentVersion
);
```

#### 3. CAS (Compare And Swap)

```java
import java.util.concurrent.atomic.AtomicReference;

public class AtomicStock {
    private final AtomicReference<Integer> stock = new AtomicReference<>(100);
    
    // 乐观扣减：compareAndSet 返回 false 表示值已被其他线程修改
    public boolean deduct(int quantity) {
        while (true) {
            Integer current = stock.get();
            if (current < quantity) {
                return false; // 库存不足
            }
            // CAS 操作：只有当前值等于 expected 时才更新
            if (stock.compareAndSet(current, current - quantity)) {
                return true; // 扣减成功
            }
            // 否则自旋重试（值已被其他线程修改）
        }
    }
}
```

#### 4. 时间戳检测

```sql
-- 使用更新时间戳作为乐观锁
UPDATE orders 
SET status = 'PAID', 
    updated_at = NOW() 
WHERE id = 1 
  AND updated_at = '2024-01-01 10:00:00';  -- 时间戳匹配才更新
```

### 适用场景

- **并发量一般**：并发压力适中
- **冲突较少**：数据竞争不激烈
- **长事务**：事务执行时间长，不适合加锁
- **读多写少**：读操作远多于写操作

---

## 核心区别对比

| 维度 | 乐观锁 | 悲观锁 |
|------|--------|--------|
| **策略** | 先操作，后验证 | 先加锁，后操作 |
| **实现方式** | 版本号机制、CAS | 数据库行锁、分布式锁 |
| **冲突处理** | 失败后重试 | 阻塞等待获取锁 |
| **性能特征** | 冲突少时性能高 | 冲突多时性能低 |
| **适用场景** | 读多写少 | 写多读少 |
| **锁粒度** | 无锁（乐观） | 独占资源（悲观） |
| **死锁风险** | 无死锁 | 有死锁风险 |
| **响应延迟** | 冲突时重试，增加延迟 | 等待锁，增加延迟 |
| **一致性保证** | 最终一致（需重试） | 强一致（阻塞保证） |

### 选择决策树

```
开始
  │
  ├─ 并发量大、冲突频繁？
  │    ├─ 是 ──→ 悲观锁
  │    └─ 否
  │         │
  │         ├─ 事务时间长？
  │         │    ├─ 是 ──→ 乐观锁
  │         │    └─ 否
  │         │         │
  │         │         └─ 写多还是读多？
  │         │              ├─ 写多 ──→ 悲观锁
  │         │              └─ 读多 ──→ 乐观锁
  │         │
  └─ 需要强一致性？
       ├─ 是 ──→ 悲观锁
       └─ 否 ──→ 乐观锁
```

---

## 常见问题与解决方案

### 1. ABA 问题

**问题描述**：线程 A 读取数据为 A，线程 B 将数据改为 B，线程 C 又将数据改回 A。此时线程 A 看到的仍是 A，误以为数据没变。

```
时间线: 初始值=A
  T1: 线程A读取 → A，保存reference
  T2: 线程B修改 → B
  T3: 线程C修改 → A（变回来了！）
  T4: 线程A CAS → 成功（但实际上中间被改过）
```

**解决方案**：

```java
// 方案1：版本号机制（推荐）
// 在值之外增加版本号，即使值相同版本也不同
public class VersionedReference<T> {
    private T value;
    private long version;
    
    public boolean compareAndSet(T expectedValue, T newValue, long expectedVersion) {
        if (value.equals(expectedValue) && version == expectedVersion) {
            value = newValue;
            version++;
            return true;
        }
        return false;
    }
}

// 方案2：增加修改标记字段
// 表结构: value, version, modified_count
// 每次修改 both value and modified_count
```

### 2. 版本号冲突与重试风暴

**问题描述**：高并发下，大量请求同时版本冲突，触发重试，可能加剧系统负载。

**解决方案**：

```java
// 1. 指数退避重试
public <T> T executeWithRetry(Supplier<T> operation, int maxRetries) {
    for (int i = 0; i < maxRetries; i++) {
        try {
            return operation.get();
        } catch (OptimisticLockException e) {
            long backoff = (long) Math.pow(2, i) * 100; // 100ms, 200ms, 400ms...
            try {
                Thread.sleep(backoff + random.nextInt(100));
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(ie);
            }
        }
    }
    throw new OptimisticLockException("重试次数耗尽");
}

// 2. 随机化重试窗口（避免惊群效应）
int jitter = random.nextInt(100);
Thread.sleep(backoff + jitter);

// 3. 设置最大重试次数，超过后降级处理
public Result updateWithFallback(long id, int quantity) {
    try {
        return updateStock(id, quantity);
    } catch (OptimisticLockException e) {
        // 降级：记录日志、发送告警、返回友好提示
        log.error("更新失败，降级处理", e);
        return Result.degraded("系统繁忙，请稍后重试");
    }
}
```

### 3. 分布式环境下的锁

**问题描述**：单机 CAS 在分布式环境中无效，需要分布式锁。

**演进路径**：

```
单机应用
    │
    ├─→ 多线程 ──→ AtomicReference (CAS)
    │
    └─→ 多进程/多机器 ──→ 分布式锁
                              │
                              ├─→ Redis 分布式锁（推荐）
                              │
                              ├─→ etcd 分布式锁
                              │
                              └─→ ZooKeeper 分布式锁
```

**Redis 分布式锁实现（Redisson 风格）**：

```java
public class DistributedLock {
    private RedissonClient redisson;
    
    public void executeWithLock(String lockKey, Runnable task) {
        RLock lock = redisson.getLock(lockKey);
        boolean acquired = false;
        try {
            // 尝试获取锁，等待10秒，锁自动过期30秒
            acquired = lock.tryLock(10, 30, TimeUnit.SECONDS);
            if (acquired) {
                task.run();
            } else {
                throw new LockAcquisitionException("获取锁失败");
            }
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

**分布式环境一致性保证**：

| 层级 | 机制 | 说明 |
|------|------|------|
| 数据库 | 乐观锁版本号 | 应用层保证 |
| Redis | SETNX + 过期时间 | 需处理锁续期 |
| Zookeeper | Curator 分布式锁 | 可靠性高，性能较低 |
| etcd | Leases + Revision | 性能与可靠性平衡 |

### 4. 死锁预防

**问题描述**：多把锁无序获取时，可能导致循环等待，形成死锁。

**解决方案**：

```java
// 方案1：固定加锁顺序（必须全局遵守）
public void transfer(Account from, Account to, int amount) {
    // 始终按 ID 大小顺序加锁
    Account first = from.getId() < to.getId() ? from : to;
    Account second = from.getId() < to.getId() ? to : from;
    
    synchronized (first) {
        synchronized (second) {
            from.withdraw(amount);
            to.deposit(amount);
        }
    }
}

// 方案2：锁超时机制
RLock lock = redisson.getLock("resource");
boolean acquired = lock.tryLock(5, 30, TimeUnit.SECONDS);
if (!acquired) {
    throw new LockTimeoutException("获取锁超时");
}

// 方案3：检测死锁（较少用）
// 定期检测锁依赖图，发现循环等待则回滚
```

---

## 最佳实践总结

### 何时用悲观锁

1. 并发写操作频繁，数据冲突是常态
2. 事务执行时间短（锁持有时间短）
3. 需要强一致性，不容许更新丢失
4. 业务允许短时阻塞等待

### 何时用乐观锁

1. 读多写少，读操作远多于写操作
2. 并发量适中，冲突概率低
3. 事务执行时间长（不适合锁定）
4. 能够接受最终一致，允许短暂失败重试

### 混合使用

```java
// 分段锁：读用乐观锁，写用悲观锁
public class HybridLockService {
    public Result read(long id) {
        // 读操作：用乐观锁，无锁读取
        return cache.get(id); // 先从缓存读
    }
    
    public void write(long id, Data data) {
        // 写操作：用悲观锁
        distributedLock.execute(id, () -> {
            // 双重检查
            if (!validateVersion(id, data.getVersion())) {
                throw new ConflictException();
            }
            // 执行更新
            doWrite(id, data);
        });
    }
}
```

---

## 参考资料

- [Redis 分布式锁详解](https://redis.io/topics/distlock)
- [Java Concurrency in Practice](https://www.aliyun.com)
- [MySQL InnoDB Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
