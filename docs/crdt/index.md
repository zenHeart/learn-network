# CRDT 协同算法

## 概述

CRDT（Conflict-free Replicated Data Type，冲突无关复制数据类型）是一种能够在网络延迟、分区和独立操作情况下，无需中心协调即可自动合并的数据结构。

CRDT 解决了分布式协同编辑的核心问题：**如何在无中心服务器的情况下，让多个副本最终收敛到一致状态**。

## 核心属性

| 属性 | 说明 |
|------|------|
| 可合并性 | 多个副本的修改可以自动合并，无需手动解决冲突 |
| 无冲突 | 不需要人工干预或中心服务器转换 |
| 最终一致性 | 所有副本在无新操作后，最终会收敛到相同状态 |
| 无需协调 | 各节点可独立操作，不依赖中心服务器 |

## CRDT vs OT

| 维度 | CRDT | OT (Operational Transformation) |
|------|------|----------------------------------|
| 架构 | 无需中心服务器 | 需要中心服务器转换操作 |
| 复杂度 | 数据结构复杂，操作简单 | 操作转换逻辑复杂 |
| 扩展性 | 节点越多越复杂（状态增长） | 依赖服务器，存在单点 |
| 延迟容忍 | 高（可离线操作） | 中（需要服务器参与） |
| 典型应用 | 分布式数据库、纯 P2P 编辑 | 早期协同编辑器（如 Google Docs 早期方案） |

## 主要类型

### G-Counter（只增计数器）

只能递增的计数器，每个节点维护自己的计数，合并时取各节点的最大值。

```javascript
class GCounter {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.counts = {};
    this.counts[nodeId] = 0;
  }

  increment() {
    this.counts[this.nodeId]++;
  }

  merge(other) {
    for (const [nodeId, count] of Object.entries(other.counts)) {
      this.counts[nodeId] = Math.max(this.counts[nodeId] || 0, count);
    }
  }

  value() {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }
}
```

### PN-Counter（可增可减计数器）

支持递增和递减的计数器，由两个 G-Counter 组成（正数计数和负数计数）。

```javascript
class PNCounter {
  constructor(nodeId) {
    this.pos = new GCounter(nodeId);
    this.neg = new GCounter(nodeId);
  }

  increment() { this.pos.increment(); }
  decrement() { this.neg.increment(); }

  merge(other) {
    this.pos.merge(other.pos);
    this.neg.merge(other.neg);
  }

  value() {
    return this.pos.value() - this.neg.value();
  }
}
```

### LWW-Register（最后写入胜出寄存器）

每个操作附带时间戳，合并时取时间戳最大的值。简单但依赖物理时钟或逻辑时钟。

```javascript
class LWWRegister {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.value = null;
    this.timestamp = 0;
  }

  set(value) {
    this.timestamp = Date.now();
    this.value = value;
  }

  merge(other) {
    if (other.timestamp > this.timestamp) {
      this.value = other.value;
      this.timestamp = other.timestamp;
    }
  }
}
```

### OR-Set（观察移除集合）

基于添加和移除标签的集合，每个元素带有唯一的添加标签。

```javascript
class ORSet {
  constructor() {
    this.addSet = new Map(); // tag -> value
    this.removeSet = new Set(); // tags removed
  }

  add(value) {
    const tag = `${value}_${Date.now()}_${Math.random()}`;
    this.addSet.set(tag, value);
  }

  remove(value) {
    for (const [tag, v] of this.addSet) {
      if (v === value) this.removeSet.add(tag);
    }
  }

  merge(other) {
    for (const [tag, value] of other.addSet) {
      if (!this.addSet.has(tag)) this.addSet.set(tag, value);
    }
    for (const tag of other.removeSet) {
      this.removeSet.add(tag);
    }
  }

  get() {
    const result = [];
    for (const [tag, value] of this.addSet) {
      if (!this.removeSet.has(tag)) result.push(value);
    }
    return result;
  }
}
```

## 文本 CRDT — RGA

RGA（Replicated Growable Array）是用于协同文本编辑的 CRDT 算法。

核心思想：
- 链表结构，每个字符有唯一 ID
- 插入操作：指定在某个字符之后插入
- 通过唯一 ID 和链表合并实现文本同步

```javascript
// RGA 节点
class RGANode {
  constructor(id, value, prevId = null) {
    this.id = id;        // 唯一标识（通常用 Lamport timestamp + nodeId）
    this.value = value;
    this.prevId = prevId;
    this.deleted = false;
  }
}

class RGAText {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.nodes = new Map(); // id -> node
    this.clock = 0;
  }

  // 生成唯一 ID
  generateId(prevId = null) {
    this.clock++;
    return `${this.clock}_${this.nodeId}`;
  }

  // 插入字符
  insert(value, afterId = null) {
    const id = this.generateId(afterId);
    const node = new RGANode(id, value, afterId);
    this.nodes.set(id, node);
    return id;
  }

  // 删除字符（逻辑删除）
  delete(id) {
    const node = this.nodes.get(id);
    if (node) node.deleted = true;
  }

  // 合并来自其他副本的操作
  mergeRemote(remoteNodes) {
    for (const remoteNode of remoteNodes) {
      if (!this.nodes.has(remoteNode.id)) {
        this.nodes.set(remoteNode.id, new RGANode(
          remoteNode.id, remoteNode.value, remoteNode.prevId
        ));
        this.clock = Math.max(this.clock, parseInt(remoteNode.id.split('_')[0]));
      }
    }
  }

  // 获取文本
  getText() {
    // 按链表顺序重建（简化版，实际需要拓扑排序）
    const nodes = Array.from(this.nodes.values()).filter(n => !n.deleted);
    return nodes.map(n => n.value).join('');
  }
}
```

## CRDT 在富文本编辑器中的应用

| 编辑器 | CRDT 实现 |
|--------|-----------|
| **Figma** | 基于 Moveable OT + CRDT 混合 |
| **Atom/Electron** | Yjs（Yjs = 高效 CRDT 框架）|
| **Notion** | Block 级别 CRDT |
| **Mercure** | Automerge（JSON CRDT）|
| **拓跋 "Yjs"** | 最流行的 JS CRDT 库 |

### Yjs 示例

```javascript
import * as Y from 'yjs'

const doc = new Y.Doc()
const text = doc.getText('editor')

// 本地操作
text.insert(0, 'Hello ')

// 与远程同步（通过 WebSocket 等）
// const provider = new WebsocketProvider('wss://demo.yjs.dev', 'room', doc)
```

## 参考资源

- [知乎：协作同步 OT和CRDT详解](https://zhuanlan.zhihu.com/p/616794280)
- [博客园：初探富文本之CRDT协同算法](https://www.cnblogs.com/WindRunnerMax/p/17114099.html)
- [ONES：OT vs CRDT 对比](https://ones.cn/blog/knowledge/online-collaborative-editing-ot-vs-crdt)
- [WICG CRDT Specification](https://github.com/wicg/crdt)
