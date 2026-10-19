# 服务单与本地存储数据同步：通用解决方案和最佳策略

> 编写目的：为前端开发者提供一套完整的本地存储数据同步解决方案，适用于服务单、审批流、购物车等业务场景。  
> 适用对象：前端工程师、全栈工程师、产品技术负责人  
> 前置知识：JavaScript ES6+、HTTP 基础、RESTful API 概念

---

## 目录

1. [本地存储方案对比](#1-本地存储方案对比)
2. [数据同步策略](#2-数据同步策略)
3. [冲突处理方案](#3-冲突处理方案)
4. [离线优先架构](#4-离线优先架构)
5. [常见场景实战](#5-常见场景实战)
6. [最佳实践 Checklist](#6-最佳实践-checklist)

---

## 1. 本地存储方案对比

### 1.1 四种方案全景对比

| 特性 | localStorage | sessionStorage | IndexedDB | Cookie |
|------|-------------|----------------|-----------|--------|
| **容量** | ~5MB | ~5MB | ~50MB+ (浏览器定) | ~4KB |
| **数据持久性** | 永久（手动清除） | 标签页关闭即清除 | 永久（手动清除） | 可设置过期时间 |
| **数据结构** | 纯字符串 KV | 纯字符串 KV | 结构化对象存储 | 字符串 KV |
| **API 风格** | 同步 | 同步 | 异步（回调/Promise） | 随 HTTP 请求自动发送 |
| **事务支持** | ❌ | ❌ | ✅ ACID 事务 | ❌ |
| **索引查询** | ❌ | ❌ | ✅ 支持 | ❌ |
| **适合场景** | 配置、偏好、草稿 | 临时表单状态 | 大量结构化数据 | 会话识别、小数据 |
| **同域共享** | ✅ | ❌ (标签页隔离) | ✅ | ✅ |
| **移动端支持** | ✅ | ✅ | ✅ | ⚠️ 受 httponly 限制 |

### 1.2 localStorage 基础操作

```javascript
// ✅ 存 — 只能存字符串，需手动 JSON 序列化
localStorage.setItem('service_form_draft', JSON.stringify({
  id: 'SR20260329001',
  title: '设备维修服务单',
  content: '空调不制冷...',
  updatedAt: Date.now()
}));

// ✅ 取 — 记得做异常处理和反序列化
try {
  const draft = JSON.parse(localStorage.getItem('service_form_draft'));
  console.log('草稿加载成功:', draft);
} catch (e) {
  console.error('草稿解析失败', e);
}

// ✅ 删
localStorage.removeItem('service_form_draft'); // 删除单项
localStorage.clear(); // 清除所有（慎用）

// ✅ 监听变化（其他标签页）
window.addEventListener('storage', (e) => {
  console.log(`键 ${e.key} 从 ${e.oldValue} 变为 ${e.newValue}`);
});
```

### 1.3 IndexedDB 核心操作

```javascript
// 📦 打开/创建数据库
function openDB(name = 'ServiceDB', version = 1) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    // 数据库版本升级（结构变更）
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('service_orders')) {
        const store = db.createObjectStore('service_orders', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'uuid', autoIncrement: true });
      }
    };
  });
}

// 📝 增删改查
async function saveServiceOrder(order) {
  const db = await openDB();
  const tx = db.transaction('service_orders', 'readwrite');
  const store = tx.objectStore('service_orders');
  await store.put(order); // put = 插入或更新
  return '保存成功';
}

async function getServiceOrder(id) {
  const db = await openDB();
  const tx = db.transaction('service_orders', 'readonly');
  const store = tx.objectStore('service_orders');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllPendingOrders() {
  const db = await openDB();
  const tx = db.transaction('service_orders', 'readonly');
  const store = tx.objectStore('service_orders');
  const index = store.index('status');
  return new Promise((resolve, reject) => {
    const req = index.getAll('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
```

---

## 2. 数据同步策略

### 2.1 乐观更新（Optimistic Update）

**核心理念**：先更新本地，立刻给用户反馈，后台异步同步服务端。假设大部分操作会成功。

```
用户提交 → 本地立即更新 UI → 发送请求 → 成功则完成 / 失败则回滚 + 提示
```

**适用场景**：
- 用户操作频繁但可撤销（如评论、点赞）
- 服务单草稿自动保存
- 购物车增删改

```javascript
// 🎯 乐观更新实现
class OptimisticSync {
  constructor(storeKey) {
    this.storeKey = storeKey;
    this.pendingQueue = []; // 待确认操作队列
  }

  // 先更新本地
  updateLocal(partial) {
    const current = this.getLocal();
    const updated = { ...current, ...partial, updatedAt: Date.now() };
    localStorage.setItem(this.storeKey, JSON.stringify(updated));
    return updated;
  }

  // 后台同步
  async syncToServer(data) {
    const tempId = `temp_${Date.now()}`; // 临时 ID 标识
    const op = { tempId, data, status: 'pending', retries: 0 };

    this.pendingQueue.push(op);
    this.updateLocal(data); // 立即更新 UI

    try {
      const res = await fetch('/api/service-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const serverData = await res.json();
      // 用服务端返回的真实数据覆盖本地（确保一致性）
      this.updateLocal(serverData);
      this.removePending(tempId);

      return { success: true, data: serverData };
    } catch (err) {
      console.error('同步失败，已加入重试队列', err);
      // 不删除 pending，保留在队列等待重试
      return { success: false, error: err.message, tempId };
    }
  }

  getLocal() {
    try {
      return JSON.parse(localStorage.getItem(this.storeKey) || '{}');
    } catch { return {}; }
  }

  removePending(tempId) {
    this.pendingQueue = this.pendingQueue.filter(op => op.tempId !== tempId);
  }

  // 获取当前待同步操作数
  getPendingCount() {
    return this.pendingQueue.length;
  }
}
```

### 2.2 悲观更新（Pessimistic Update）

**核心理念**：必须等服务端返回成功，才更新本地 UI。宁可让用户等待，也要确保数据一致。

```
用户提交 → 显示 loading → 服务端确认成功 → 更新本地
```

**适用场景**：
- 金融交易、支付操作
- 状态不可逆的操作（如审批通过/拒绝）
- 数据一致性要求极高

```javascript
// 🎯 悲观更新实现
async function submitServiceOrder(order) {
  const ui = document.getElementById('submit-btn');
  ui.disabled = true;
  ui.textContent = '提交中...';

  try {
    const res = await fetch('/api/service-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `提交失败 (${res.status})`);
    }

    const serverData = await res.json();

    // ✅ 只有服务端返回成功，才更新本地
    localStorage.setItem('current_order', JSON.stringify(serverData));
    showToast('提交成功！');
    return { success: true, data: serverData };

  } catch (err) {
    showToast(`提交失败: ${err.message}`, 'error');
    return { success: false, error: err.message };
  } finally {
    ui.disabled = false;
    ui.textContent = '提交';
  }
}
```

### 2.3 策略对比

| 维度 | 乐观更新 | 悲观更新 |
|------|---------|---------|
| **用户体验** | 响应快，无等待感 | 有等待感，但结果可预期 |
| **数据一致性** | 存在回滚风险 | 强一致 |
| **网络依赖** | 低（离线可用） | 高（离线无法操作） |
| **适合操作类型** | 可重复、可覆盖 | 唯一性、不可逆 |
| **实现复杂度** | 较高（需回滚机制） | 较低 |

---

## 3. 冲突处理方案

### 3.1 冲突的来源

在多端编辑、网络延迟、离线操作等场景下，客户端与服务端的数据版本会产生分歧：

```
客户端本地版本: { ..., updatedAt: 1743225600000 }
服务端当前版本: { ..., updatedAt: 1743225500000 }  // 时间戳更早？
```

常见的冲突触发条件：
1. 用户在标签页 A 和 B 同时编辑
2. 离线修改后联网同步
3. 多人同时协作编辑同一服务单
4. 客户端与服务端时钟不同步

### 3.2 Last-Write-Wins（LWW，最后写入胜出）

**规则**：以时间戳或版本号判断，谁最新谁优先。

```javascript
// 📝 LWW 实现 — 基于 updatedAt 时间戳
function resolveLWW(localData, serverData) {
  return new Date(localData.updatedAt) >= new Date(serverData.updatedAt)
    ? localData     // 本地更新，更新服务端
    : serverData;   // 服务端更新，更新本地
}

// 使用场景：草稿自动保存（允许覆盖）
async function saveWithLWW(key, localData) {
  const serverRes = await fetch(`/api/service-order/${localData.id}`);
  const serverData = await serverRes.json();

  const winner = resolveLWW(localData, serverData);

  if (winner === localData) {
    // 本地胜出，推送服务端
    await fetch(`/api/service-order/${localData.id}`, {
      method: 'PUT',
      body: JSON.stringify(localData)
    });
  } else {
    // 服务端胜出，更新本地
    localStorage.setItem(key, JSON.stringify(serverData));
  }

  return winner;
}
```

### 3.3 服务端为主（Server-Wins）

**规则**：无脑以服务端数据为准，客户端修改在冲突时丢弃。适合严格管控数据的业务（如审批流）。

```javascript
// 📝 Server-Wins 实现
async function saveWithServerWins(key, localData) {
  try {
    // 尝试推送本地
    const res = await fetch(`/api/service-order/${localData.id}`, {
      method: 'PUT',
      body: JSON.stringify(localData)
    });

    if (res.status === 409) {
      // ⚠️ 冲突！丢弃本地，以服务端为准
      const serverData = await fetch(`/api/service-order/${localData.id}`).then(r => r.json());
      localStorage.setItem(key, JSON.stringify(serverData));
      showToast('内容已被其他人更新，本地修改已合并', 'warn');
      return serverData;
    }

    return await res.json();
  } catch (err) {
    console.error('保存失败', err);
    throw err;
  }
}
```

### 3.4 三路合并（Three-Way Merge）

**规则**：对比「共同祖先」「本地版本」「服务端版本」，自动合并无冲突区域，标记冲突区域由用户决定。

```
共同祖先 (Base):    "产品名称: 空调\n维修原因: 不制冷\n状态: 待派单"
本地版本 (Local):   "产品名称: 空调\n维修原因: 不制冷+漏水\n状态: 已派单"
服务端 (Remote):    "产品名称: 空调\n维修原因: 不制冷\n状态: 已接单"
                        ↓
合并结果 (Merge):   "产品名称: 空调\n维修原因: 不制冷+漏水 ⚠️ 冲突\n状态: 已派单"
```

```javascript
// 📝 三路合并简化实现
function threeWayMerge(base, local, remote) {
  const merged = { ...base };
  const conflicts = [];

  for (const key of Object.keys(local)) {
    if (local[key] === base[key] && remote[key] !== base[key]) {
      // 情况1：本地未变，服务端变了 → 接受服务端
      merged[key] = remote[key];
    } else if (local[key] !== base[key] && remote[key] === base[key]) {
      // 情况2：本地变了，服务端未变 → 接受本地
      merged[key] = local[key];
    } else if (local[key] === remote[key]) {
      // 情况3：双方都变了但一样 → 接受任一方
      merged[key] = local[key];
    } else {
      // 情况4：双方都变了且不一样 → 冲突
      conflicts.push({
        key,
        base: base[key],
        local: local[key],
        remote: remote[key]
      });
      merged[key] = null; // 待用户手动解决
    }
  }

  return { merged, conflicts };
}
```

### 3.5 冲突处理策略选择

| 策略 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **LWW** | 草稿、用户偏好、可覆盖数据 | 自动化程度高 | 可能丢失修改 |
| **Server-Wins** | 审批流、状态机、严格数据 | 简单可控 | 用户体验差 |
| **三路合并** | 多人协作、文档编辑 | 最大限度保留数据 | 实现复杂 |

---

## 4. 离线优先架构

### 4.1 架构概览

```
┌─────────────────────────────────────────────────────┐
│                      用户界面                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 表单编辑    │  │ 购物车操作  │  │ 数据列表    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
└─────────┼────────────────┼────────────────┼──────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────┐
│                   本地数据层                         │
│  ┌──────────────────────────────────────────────┐   │
│  │  IndexedDB: service_orders + sync_queue     │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  localStorage: 用户偏好、Session 状态        │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
          │                              ▲
          │ sync()                       │
          ▼                              │
┌─────────────────────────────────────────────────────┐
│                   同步引擎层                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 变更检测   │  │ 冲突解决    │  │ 重试队列    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                   Service Worker                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 缓存静态资源│  │ 拦截请求    │  │ Background  │  │
│  │             │  │ (离线可用)  │  │ Sync        │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                     服务端 API                       │
└─────────────────────────────────────────────────────┘
```

### 4.2 同步队列实现

```javascript
// 📦 同步队列 — 离线操作的缓冲区
class SyncQueue {
  constructor(db) {
    this.db = db;
  }

  // 加入队列
  async enqueue(operation) {
    const db = await this.db;
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const op = {
      ...operation,
      uuid: crypto.randomUUID(),
      createdAt: Date.now(),
      status: 'pending',
      retries: 0
    };
    await store.add(op);
    return op.uuid;
  }

  // 批量出队
  async dequeue(limit = 10) {
    const db = await this.db;
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const req = index.getAll('pending');
      req.onsuccess = () => resolve(req.result.slice(0, limit));
      req.onerror = () => reject(req.error);
    });
  }

  // 标记完成
  async markDone(uuid) {
    const db = await this.db;
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');

    const op = await new Promise((resolve, reject) => {
      const getReq = store.get(uuid);
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    });

    if (op) {
      op.status = 'done';
      op.doneAt = Date.now();
      await store.put(op);
    }
  }

  // 标记失败（带重试）
  async markFailed(uuid, maxRetries = 3) {
    const db = await this.db;
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');

    const op = await new Promise((resolve, reject) => {
      const getReq = store.get(uuid);
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    });

    if (op) {
      op.retries++;
      if (op.retries >= maxRetries) {
        op.status = 'failed';
      } else {
        op.status = 'pending';
        op.lastError = new Date().toISOString();
      }
      await store.put(op);
    }
  }
}
```

### 4.3 同步引擎

```javascript
// 🔄 同步引擎 — 协调本地与服务端
class SyncEngine {
  constructor(queue, options = {}) {
    this.queue = queue;
    this.apiBase = options.apiBase || '/api';
    this.syncInterval = options.syncInterval || 30000; // 30s
    this.syncTimer = null;
    this.isOnline = navigator.onLine;
    this.listeners = [];

    // 监听网络状态
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
  }

  start() {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => this.sync(), this.syncInterval);
    this.sync(); // 立即同步一次
    console.log('[SyncEngine] 已启动');
  }

  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async sync() {
    if (!this.isOnline) {
      console.log('[SyncEngine] 离线，跳过同步');
      return;
    }

    console.log('[SyncEngine] 开始同步...');
    const pending = await this.queue.dequeue();

    if (pending.length === 0) {
      console.log('[SyncEngine] 无待同步操作');
      return;
    }

    for (const op of pending) {
      try {
        const res = await fetch(`${this.apiBase}${op.endpoint}`, {
          method: op.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.payload)
        });

        if (res.ok) {
          await this.queue.markDone(op.uuid);
          console.log(`[SyncEngine] ✓ 已同步: ${op.uuid}`);
        } else if (res.status === 409) {
          // 冲突 — 丢给冲突处理器
          await this.handleConflict(op, await res.json());
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        console.error(`[SyncEngine] ✗ 同步失败: ${op.uuid}`, err);
        await this.queue.markFailed(op.uuid);
      }
    }

    this.notifyListeners({ type: 'sync_complete', pending: pending.length });
  }

  async handleConflict(op, serverData) {
    // 简单策略：服务端优先
    // 复杂场景可改为三路合并
    console.warn('[SyncEngine] 检测到冲突，服务端数据优先', serverData);
    await this.queue.markDone(op.uuid);
    this.notifyListeners({ type: 'conflict_resolved', op, serverData });
  }

  onOnline() {
    console.log('[SyncEngine] 网络恢复');
    this.isOnline = true;
    this.sync();
  }

  onOffline() {
    console.log('[SyncEngine] 网络断开');
    this.isOnline = false;
  }

  addListener(fn) { this.listeners.push(fn); }
  removeListener(fn) { this.listeners = this.listeners.filter(l => l !== fn); }
  notifyListeners(event) { this.listeners.forEach(l => l(event)); }
}
```

### 4.4 Service Worker 注册

```javascript
// 📝 Service Worker 注册（独立文件 sw.js）
// sw.js 内容：
/*
self.addEventListener('fetch', (e) => {
  // 缓存优先策略
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-orders') {
    e.waitUntil(syncAllOrders());
  }
});
*/

// 前端注册
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW 注册成功', reg.scope))
    .catch(err => console.error('SW 注册失败', err));
}
```

---

## 5. 常见场景实战

### 5.1 场景一：表单草稿自动保存

**需求**：用户填写服务单时，每隔 10 秒自动保存草稿到本地，网络恢复后自动同步。

```javascript
// 📝 表单草稿管理器
class DraftManager {
  constructor(storageKey, autoSaveInterval = 10000) {
    this.storageKey = storageKey;
    this.timer = null;
    this.autoSaveInterval = autoSaveInterval;
  }

  // 启动自动保存
  start(formSelector) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    this.timer = setInterval(() => {
      const data = this.extractFormData(form);
      this.saveDraft(data);
    }, this.autoSaveInterval);

    // 表单失焦时立即保存一次
    form.addEventListener('blur', () => this.saveDraft(this.extractFormData(form)), true);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  extractFormData(form) {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    data._draftSavedAt = Date.now();
    return data;
  }

  saveDraft(data) {
    const existing = this.loadDraft() || {};
    const merged = { ...existing, ...data, updatedAt: Date.now() };
    localStorage.setItem(this.storageKey, JSON.stringify(merged));
    console.log('[Draft] 已保存草稿', new Date().toLocaleTimeString());
  }

  loadDraft() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || 'null');
    } catch { return null; }
  }

  clearDraft() {
    localStorage.removeItem(this.storageKey);
  }
}
```

### 5.2 场景二：购物车

**需求**：购物车操作（增删改）即时更新本地，网络恢复后同步；支持多标签页同步。

```javascript
// 🛒 购物车管理器
class CartManager {
  constructor() {
    this.storageKey = 'cart_items';
    this.items = this.loadCart();
    this.setupStorageListener();
  }

  loadCart() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch { return []; }
  }

  saveCart() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    // 触发其他标签页更新
    window.dispatchEvent(new StorageEvent('storage', {
      key: this.storageKey,
      newValue: JSON.stringify(this.items)
    }));
  }

  setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey && e.newValue) {
        try {
          this.items = JSON.parse(e.newValue);
          this.renderCart();
        } catch {}
      }
    });
  }

  addItem(product) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += product.quantity || 1;
    } else {
      this.items.push({ ...product, quantity: product.quantity || 1 });
    }
    this.saveCart();
    this.scheduleSync({ type: 'add_to_cart', product, at: Date.now() });
  }

  removeItem(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.saveCart();
    this.scheduleSync({ type: 'remove_from_cart', productId, at: Date.now() });
  }

  updateQuantity(productId, quantity) {
    const item = this.items.find(i => i.id === productId);
    if (item) {
      item.quantity = quantity;
      this.saveCart();
      this.scheduleSync({ type: 'update_quantity', productId, quantity, at: Date.now() });
    }
  }

  async scheduleSync(operation) {
    // 离线时加入同步队列
    if (!navigator.onLine) {
      await this.syncQueue.enqueue({
        ...operation,
        endpoint: '/api/cart/sync',
        method: 'POST'
      });
    }
  }

  getTotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  renderCart() {
    // 渲染购物车 UI
    console.log('购物车内容:', this.items, '总计:', this.getTotal());
  }
}
```

### 5.3 场景三：离线数据编辑

**需求**：用户可在离线状态下编辑服务单，联网后自动同步，支持冲突提示。

```javascript
// 📋 离线数据编辑器
class OfflineEditor {
  constructor(db, syncEngine) {
    this.db = db;
    this.syncEngine = syncEngine;
  }

  // 读取数据（优先 IndexedDB，fallback 服务端）
  async loadOrder(id) {
    // 1. 尝试从 IndexedDB 读取
    const local = await this.getLocalOrder(id);
    if (local) return local;

    // 2. 在线则从服务端拉取
    if (navigator.onLine) {
      const res = await fetch(`/api/service-order/${id}`);
      if (res.ok) {
        const data = await res.json();
        await this.saveLocalOrder(data);
        return data;
      }
    }

    return null; // 离线且无本地缓存
  }

  // 编辑（立即写入 IndexedDB + 加入同步队列）
  async editOrder(id, changes) {
    const order = await this.getLocalOrder(id) || {};

    const updated = {
      ...order,
      ...changes,
      id,
      updatedAt: Date.now(),
      _localVersion: (order._localVersion || 0) + 1,
      _syncStatus: 'pending'
    };

    // 立即保存本地
    await this.saveLocalOrder(updated);

    // 加入同步队列
    await this.syncEngine.queue.enqueue({
      endpoint: `/api/service-order/${id}`,
      method: 'PUT',
      payload: updated,
      conflictStrategy: 'merge'
    });

    // 触发立即同步（如果有网）
    if (navigator.onLine) {
      this.syncEngine.sync();
    }

    return updated;
  }

  async getLocalOrder(id) {
    const db = await this.db;
    const tx = db.transaction('service_orders', 'readonly');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore('service_orders').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveLocalOrder(order) {
    const db = await this.db;
    const tx = db.transaction('service_orders', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore('service_orders').put(order);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
```

---

## 6. 最佳实践 Checklist

### 存储选型
- [ ] 小配置（< 5MB）→ localStorage
- [ ] 临时表单状态 → sessionStorage
- [ ] 结构化业务数据 → IndexedDB
- [ ] 会话标识/服务端读取 → Cookie

### 同步策略
- [ ] 高频草稿保存 → 乐观更新（本地优先）
- [ ] 不可逆操作 → 悲观更新（服务端确认）
- [ ] 允许多版本 → LWW 或三路合并
- [ ] 严格数据管控 → Server-Wins

### 离线架构
- [ ] Service Worker 注册（缓存静态资源）
- [ ] IndexedDB 作为主数据源（而非 localStorage）
- [ ] 同步队列持久化（应用重启后不丢失）
- [ ] 网络状态监听（自动触发同步）
- [ ] 冲突提示 UI（让用户知情和决策）

### 性能优化
- [ ] IndexedDB 操作在 Web Worker 中执行（避免阻塞 UI）
- [ ] 批量同步（合并多次小更新为一次请求）
- [ ] 定期清理过期同步记录（保持队列健康）
- [ ] localStorage 写操作在 `requestIdleCallback` 中执行

### 安全性
- [ ] 敏感数据不存 localStorage（可被 XSS 读取）
- [ ] IndexedDB 数据加密（AES 或 Web Crypto API）
- [ ] 同步前做数据校验（防止注入）
- [ ] HTTPS 环境使用 Service Worker（HTTP 禁用手稿注册）

---

## 参考资料

1. [MDN — Storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage)
2. [MDN — IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
3. [Google — Offline Web Apps](https://web.dev/articles/offline)
4. [Service Workers — W3C Spec](https://www.w3.org/TR/service-workers/)
5. [Background Sync — Spec](https://wicg.github.io/background-sync/spec/)

---

*文档版本：v1.0 | 最后更新：2026-03-29*
