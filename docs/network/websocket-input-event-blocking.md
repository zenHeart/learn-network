# Input 事件阻塞 WebSocket：Chrome 事件流优先级分析

## 问题背景

> Input 事件会阻塞 WebSocket 消息？理解 Chrome 事件流的优先级

在 Web 应用中，有时会发现：输入框输入时，接收到 WebSocket 消息的处理被延迟了。这是为什么？

## Chrome 事件循环基础

Chrome 使用 **渲染主线程**（Main Thread）处理所有任务，事件循环遵循以下层级：

```
┌─────────────────────────────────────────────────┐
│           Macrotask Queue（任务队列）            │
│   Task1 → Task2 → Input Event → WS Message →   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│          Microtask Queue（微任务队列）           │
│        Promises → queueMicrotask callbacks      │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│               Animation Frames                   │
│           requestAnimationFrame callbacks        │
└─────────────────────────────────────────────────┘
```

### 执行顺序（一轮事件循环）

1. **选择最老的 Task**（从 Macrotask Queue 取出）
2. **执行 Task**（同步代码，可能包含多个微任务）
3. **执行所有 Microtasks**（Promise 回调、queueMicrotask）
4. **requestAnimationFrame**（如果需要）
5. **重复**

## Input 事件 vs WebSocket 消息

### 都是 Task，没有优先级之分

从 HTML 规范角度：

- `input` 事件 → 加入 Task Queue
- `WebSocket.onmessage` → 加入 Task Queue

两者**没有内置优先级**，都是普通 Task。

### 为什么感觉 Input 阻塞了 WS？

#### 场景 1：同步长任务在 Input Handler 中

```js
input.addEventListener('input', (e) => {
  // 同步长任务 —— 阻塞整个 Task Queue
  heavyComputation(); // 假设耗时 500ms
});

ws.addEventListener('message', (e) => {
  console.log('WS message:', e.data); // 被延迟执行
});
```

**时间线**：
```
t=0ms    Input handler 开始执行 heavyComputation()
t=500ms  Input handler 完成
t=500ms  WS message handler 开始执行
```

⚠️ **关键**：Input handler 是同步代码，执行期间整个 Task Queue 被阻塞。

#### 场景 2：Input 事件触发大量 Task

```js
// 快速连续输入
input.addEventListener('input', () => {
  // 每个字符触发一个 microtask (Promise.resolve().then)
  queueMicrotask(processInput);
});
```

每个 input 事件会触发 microtasks，可能导致 WS 消息的 microtasks 被延迟。

#### 场景 3：Compositor Thread 的 Input 优先级

Chrome 在 **Linux** 上使用 `X11_Input` 或 `Wayland`，input 事件的采集和处理有特殊路径：

```
OS Input Event → Chrome Compositor Thread → Main Thread
                      ↓
              快速路径：只读 input 处理
              （可能绕过部分 Task Queue 检查）
```

Compositor thread 可以识别某些 input 事件为"紧急"，将其优先派发到主线程 Task Queue 头部。

## 真实阻塞场景分析

### 1. alert()/confirm() 阻塞一切

```js
input.addEventListener('keydown', () => {
  alert('Blocked!'); // 模态框完全阻塞事件循环
});
// 在 alert 对话框显示期间：
// - WS 消息无法处理
// - 页面完全冻结
```

这是最强的阻塞场景 —— `alert()` 是**同步**模态，消息循环完全暂停。

### 2. 大量微任务在 Input Handler 中

```js
input.addEventListener('input', () => {
  for (let i = 0; i < 10000; i++) {
    queueMicrotask(() => doSomething(i));
  }
});
// 微任务队列被 Input handler 填满
// WS 消息的微任务只能排队
```

### 3. Long Task 阻塞渲染和事件处理

Chrome DevTools 会标记 >50ms 的任务为 **Long Task**：

```
[Long Task: 523ms] ████████████████████████████░░░░░░░░░░░░░░
   └─ Input handler 执行了 523ms 的同步代码
```

Long Task 会：
- 阻塞所有 Task 队列中的事件（包括 WS 消息）
- 触发 **Clickjacking** 保护（长时间无响应可能触发浏览器警告）

## 浏览器输入处理优先级机制

Chrome 对输入事件有一套优先级策略（非公开实现）：

### 输入事件的"快速路径"

某些 input 事件（如 `keydown`、`keyup`）有**快速路径**：

```
1. Input 事件到达 Compositor Thread
2. Compositor 判断：是否可以走快速路径？
   - 快速路径：直接派发到渲染器，跳过部分检查
   - 普通路径：发送到主线程 Task Queue
3. 主线程 Task Queue 处理
```

### 与 WS 消息的竞争

当 WS 消息和 Input 事件同时到达时：

| 情况 | 结果 |
|------|------|
| WS 先到，Input 后到 | Input handler 在 WS 之后执行（正常） |
| Input 先到，WS 后到 | WS handler 在 Input 之后执行（正常） |
| Input handler 是 Long Task | WS handler 延迟到 Input handler 完成后 |
| 多个 Input 快速到达 | 可能出现 Input 积压，WS 消息被延后 |

## 实际影响：为什么 WebSocket 消息"丢失"了

### 现象

用户输入时，WebSocket 消息似乎被丢弃或延迟很久才处理。

### 原因

```
用户输入 "abc"（3 个 keydown + 3 个 input + 3 个 keyup）

Task Queue:
  keydown[0] → keydown[1] → keydown[2] → 
  input[0] → input[1] → input[2] → 
  keyup[0] → keyup[1] → keyup[2] → 
  [WS message from server]

如果 input handler 同步处理大量数据：
  input[0] handler (200ms) → 处理输入 → 
  input[1] handler (200ms) → 处理输入 → ...
  WS message handler 等待 600ms+
```

## 解决方案

### 1. 避免在 Input Handler 中做同步长任务

```js
// ❌ 错误：同步处理
input.addEventListener('input', (e) => {
  processInput(e.target.value); // 可能很慢
});

// ✅ 正确：异步处理
input.addEventListener('input', (e) => {
  requestAnimationFrame(() => {
    processInput(e.target.value);
  });
});

// ✅ 更好：使用 requestIdleCallback
input.addEventListener('input', (e) => {
  requestIdleCallback(() => {
    processInput(e.target.value);
  }, { timeout: 1000 });
});
```

### 2. Web Worker 处理计算密集任务

```js
input.addEventListener('input', (e) => {
  // 将计算密集任务移到 Worker
  worker.postMessage(e.target.value);
});

worker.addEventListener('message', (e) => {
  // 快速响应，不阻塞主线程
  updateUI(e.data);
});
```

### 3. 使用防抖/节流

```js
import { debounce } from 'lodash-es';

const handleInput = debounce((value) => {
  // WS 消息处理逻辑
  ws.send(JSON.stringify({ input: value }));
}, 300);

input.addEventListener('input', (e) => {
  handleInput(e.target.value);
});
```

### 4. WS 消息优先级设置

```js
// 使用 MessageChannel 给 WS 消息更高优先级
const channel = new MessageChannel();
channel.port1.onmessage = (e) => {
  // WS 消息处理 —— 在 port 消息队列中优先
  processMessage(e.data);
};

// 确保 WS 消息通过 port2 传递
ws.addEventListener('message', (e) => {
  channel.port2.postMessage(e.data);
});
```

### 5. 区分 Input 事件和 WS 事件的 Task 类型

```js
// 使用 scheduler.postTask()（如果支持）设置优先级
if ('scheduler' in window) {
  // WS 消息设为 high priority
  scheduler.postTask(() => processMessage(data), { priority: 'high' });
  
  // Input 事件设为 low priority
  input.addEventListener('input', (e) => {
    scheduler.postTask(() => processInput(e.target.value), { priority: 'low' });
  });
}
```

## Chrome DevTools 分析

### 1. Performance 面板查看 Task 顺序

1. 打开 DevTools → Performance
2. 录制用户输入场景
3. 查看 Main Thread 火焰图
4. 找 Long Task（红色三角形标记）

### 2. WebSocket Frames 面板

Chrome DevTools → Network → WS → 选择连接 → Frames

可以查看 WS 消息的实际收发时间，对比 JS 执行时间线。

### 3. 关键词：`input-event-blocking`

在 Performance 面板输入 `input-event-blocking` 过滤，查看是否有相关警告。

## 总结

| 维度 | Input 事件 | WebSocket 消息 |
|------|-----------|---------------|
| 事件类型 | Task（Macrotask） | Task（Macrotask） |
| 规范优先级 | 无 | 无 |
| Chrome 实现 | 可能有快速路径 | 普通 |
| 阻塞原因 | 同步长任务 | 被 Long Task 阻塞 |
| 解决方案 | 异步处理、Worker | requestIdleCallback、postTask |

**核心结论**：

1. **Input 事件本身不阻塞 WS 消息** —— 两者都是 Task，Chrome 没有内置优先级
2. **Input handler 的同步代码可能阻塞 WS 消息** —— Long Task 占用主线程
3. **大量 Input 事件可能积压 WS 消息** —— Task Queue 被 Input 事件填满
4. **alert()/confirm() 是最强阻塞** —— 完全暂停事件循环

## 参考资料

- [HTML Spec: Event loop processing model](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)
- [Chrome Source: Input event handling](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/INPUT/)
- [Jake Archibald: In the loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0)
- [Web Platform Podcast: Tasks, Microtasks, Queues and Schedules](https://www.youtube.com/watch?v=10JiSOLS-Gk)

---

*文档创建时间：2026-03-26*
