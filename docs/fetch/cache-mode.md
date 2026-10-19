# Fetch 缓存机制完整解析

> 深入理解 fetch API 的缓存行为与 Cache Mode

## 目录

- [fetch 下载资源时是否会先使用 cache？](#fetch-下载资源时是否会先使用-cache)
- [Cache Mode 详解](#cache-mode-详解)
- [HTTP 缓存与 fetch 缓存的交互](#http-缓存与-fetch-缓存的交互)
- [代码示例](#代码示例)
- [常见问题解答](#常见问题解答)

---

## fetch 下载资源时是否会先使用 cache？

**简短回答：默认情况下，fetch 不会主动使用 HTTP 缓存。**

这与浏览器的默认行为不同。当你在地址栏输入 URL 时，浏览器会发送请求并根据 HTTP 缓存机制（Cache-Control、ETag、Last-Modified 等）决定是否使用缓存。但 `fetch()` 默认的 `cache` 选项为 `default`，它的行为取决于请求是否满足某些条件。

### fetch 默认行为

```javascript
// 以下两种写法等价，默认不强制使用缓存
fetch('/api/data')
fetch('/api/data', { cache: 'default' })
```

`default` 模式下的缓存行为：

| 条件 | 行为 |
|------|------|
| 请求带 `If-None-Match` 或 `If-Modified-Since` | 发送条件请求，使用缓存 |
| 请求是导航请求（navigation） | 遵循 HTTP 缓存语义 |
| 其他普通 fetch 请求 | **不查缓存，直接请求网络** |

> ⚠️ **关键点**：普通脚本中的 `fetch('/api/data')` 不会先检查缓存，而是直接发网络请求。只有当响应返回 304（Not Modified）时，才算是"用上了缓存"。

---

## Cache Mode 详解

fetch API 提供 `cache` 选项，支持以下五种模式：

```javascript
fetch(url, { cache: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached' })
```

### 1. `default` — 遵循 HTTP 缓存规则

**使用场景**：普通的 API 请求，希望享受 HTTP 缓存但不想强制控制。

```javascript
// 典型场景：数据可能缓存在服务器端，但不想强制使用
fetch('/api/config')
```

**行为**：
- 如果请求命中 HTTP 缓存且新鲜，直接返回缓存
- 否则发送网络请求
- 遵循 `Cache-Control`、`ETag`、`Last-Modified` 等 HTTP 缓存头

---

### 2. `no-store` — 完全忽略缓存

**使用场景**：获取实时数据（如股票价格、实时监控）或携带敏感信息的请求。

```javascript
// 典型场景：不使用任何缓存，每次都获取最新数据
fetch('/api/stock-price', { cache: 'no-store' })
```

**行为**：
- **不检查** HTTP 缓存
- 发送请求时**不添加** `If-None-Match` / `If-Modified-Since`
- 响应**不会**存入 HTTP 缓存
- 等价于请求头 `Cache-Control: no-store`

---

### 3. `reload` — 忽略缓存，强制重新获取

**使用场景**：需要最新版本资源（如应用更新、静态资源版本刷新）。

```javascript
// 典型场景：强制刷新到最新版本
fetch('/static/app.js', { cache: 'reload' })
```

**行为**：
- 不检查缓存，直接发送请求
- 请求头**不添加**条件请求字段
- 响应会更新 HTTP 缓存（如果有）
- 常用于 service worker 拦截并强制更新缓存资源的场景

---

### 4. `no-cache` — 强制验证缓存（重新验证）

**使用场景**：希望使用缓存，但每次都要服务器确认缓存是否仍然有效。

```javascript
// 典型场景：CDN 缓存资源，但希望确认是否最新
fetch('/api/dynamic-data', { cache: 'no-cache' })
```

**行为**：
- **先检查** HTTP 缓存
- 发送请求时**添加** `If-None-Match` / `If-Modified-Since`
- 如果服务器返回 **304**，使用缓存数据
- 如果服务器返回 **200**，使用新数据并更新缓存
- 等价于请求头 `Cache-Control: no-cache`

> 💡 **no-cache vs no-store**：no-cache 会用缓存但每次验证，no-store 完全不看缓存也不存缓存。

---

### 5. `force-cache` — 有缓存就用缓存，没有才请求

**使用场景**：优先使用缓存，不在乎数据是否稍微过时（如文档、静态资源）。

```javascript
// 典型场景：离线可用或不在意稍微过时的资源
fetch('/api/guide-doc', { cache: 'force-cache' })
```

**行为**：
- 如果缓存命中且新鲜，直接返回
- 如果缓存命中但不新鲜，**仍直接返回**（不验证）
- 如果缓存不命中，发送网络请求
- ⚠️ **可能返回过期数据**

> ⚠️ **注意**：当缓存命中但不新鲜时，`force-cache` 不会发送条件请求，直接返回缓存。这意味着用户可能看到过期数据。

---

### 6. `only-if-cached` — 只用缓存，没缓存就失败

**使用场景**：在 service worker 中实现离线优先策略。

```javascript
// 典型场景：service worker 离线缓存策略
fetch('/api/data', { cache: 'only-if-cached', mode: 'same-origin' })
```

**行为**：
- 只有当请求命中 HTTP 缓存时才返回
- 如果缓存命中，直接返回
- 如果缓存不命中，返回 **net::ERR_CACHE_MISS** 网络错误
- 只能用于 `mode: 'same-origin'` 或 `mode: 'cors'` 的请求
- 常配合 service worker 使用

---

## Cache Mode 对比表

| Mode | 检查缓存 | 发送验证请求 | 存储响应 | 缓存未命中行为 |
|------|---------|------------|---------|--------------|
| `default` | ✅ 按 HTTP 规则 | ✅ 按 HTTP 规则 | ✅ 按 HTTP 规则 | 发网络请求 |
| `no-store` | ❌ | ❌ | ❌ | 发网络请求 |
| `reload` | ❌ | ❌ | ✅ | 发网络请求 |
| `no-cache` | ❌（跳过直接发） | ✅ 强制添加 | ✅ | 发网络请求 |
| `force-cache` | ✅ | ❌ 不验证 | ✅ | 发网络请求 |
| `only-if-cached` | ✅ | ❌ | ❌ | **返回网络错误** |

---

## HTTP 缓存与 fetch 缓存的交互

fetch 的 cache 选项**不能**替代 HTTP 缓存机制，它们是层层叠加的关系：

```
浏览器缓存层次
├── HTTP 缓存（Disk/Memory Cache）
│   └── 受 Cache-Control, ETag, Last-Modified 控制
└── Service Worker 缓存
    └── 可编程控制缓存策略
```

### 缓存决策流程

```
fetch 请求
    │
    ▼
Service Worker（如果注册）
    │ 拦截 → 决定返回缓存或继续
    ▼
HTTP Cache 检查
    │
    ├─── Cache Mode = no-store / reload ──→ 跳过缓存，直接网络
    │
    ├─── Cache Mode = default ──→ 按 HTTP 规则
    │       │
    │       ├── 有新鲜缓存 → 直接返回
    │       └── 无/过期 → 发请求（含条件头）
    │
    ├─── Cache Mode = no-cache ──→ 发请求（含条件头）
    │
    ├─── Cache Mode = force-cache ──→ 有缓存就返回，不验证
    │
    └─── Cache Mode = only-if-cached ──→ 有缓存返回，无则错误
```

### 与 Request Credentials 的关系

```javascript
// 携带 cookies 的同源请求
fetch('/api/data', {
  credentials: 'include',
  cache: 'no-store'  // 敏感请求不使用缓存
})
```

---

## 代码示例

### 基础示例

```javascript
// 1. default：普通请求，遵循 HTTP 缓存
const response = await fetch('/api/user')

// 2. no-store：每次都获取最新，不缓存
const fresh = await fetch('/api/stock', { cache: 'no-store' })

// 3. no-cache：每次验证缓存有效性
const validated = await fetch('/api/config', { cache: 'no-cache' })

// 4. force-cache：优先使用缓存
const cached = await fetch('/static/app.js', { cache: 'force-cache' })

// 5. only-if-cached：只在缓存中找（离线场景）
try {
  const offline = await fetch('/api/data', {
    cache: 'only-if-cached',
    mode: 'same-origin'
  })
} catch (e) {
  console.log('离线且无缓存')
}
```

### 服务端模拟缓存验证

```javascript
// Node.js 服务端示例：处理带 If-None-Match 的请求
const http = require('http')
const crypto = require('crypto')

const resourceEtag = '"abc123"'

const server = http.createServer((req, res) => {
  const ifNoneMatch = req.headers['if-none-match']

  if (ifNoneMatch === resourceEtag) {
    // 资源未修改，返回 304
    res.writeHead(304, { 'ETag': resourceEtag })
    res.end()
  } else {
    // 资源已修改，返回新内容
    const data = JSON.stringify({ message: 'Hello, Cache!', time: Date.now() })
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'ETag': resourceEtag,
      'Cache-Control': 'max-age=86400'
    })
    res.end(data)
  }
})

server.listen(3000)
```

### Service Worker 中的缓存策略

```javascript
// sw.js - 在 Service Worker 中使用 fetch cache 选项
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith('/api/')) {
    // API 请求：网络优先，失败时用缓存
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    )
  } else if (url.pathname.startsWith('/static/')) {
    // 静态资源：缓存优先，验证更新
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request, { cache: 'no-cache' })
          .then(response => {
            if (response.ok) {
              const clone = response.clone()
              caches.open('static-v1').then(cache => cache.put(event.request, clone))
            }
            return response
          })
        return cached || fetchPromise
      })
    )
  }
})
```

---

## 常见问题解答

### Q1: fetch 默认会使用缓存吗？

**A**: 不会主动使用。`fetch()` 默认 `cache: 'default'`，对于普通脚本请求，**不会先查缓存**，而是直接发网络请求。只有导航请求（地址栏回车）或带条件请求头（`If-None-Match`）时，才会利用 HTTP 缓存。

### Q2: 如何让 fetch 先检查缓存再发请求？

**A**: 使用 `cache: 'force-cache'`，它会优先返回缓存（即使不新鲜），不发送验证请求。如果要"先检查，发现过期才请求"，目前 fetch API **没有直接支持**这种模式，需要配合 Cache API 或 Service Worker 实现。

### Q3: `no-cache` 和 `no-store` 有什么区别？

| | `no-cache` | `no-store` |
|---|---|---|
| 查缓存 | ❌ 不查 | ❌ 不查 |
| 发条件请求 | ✅ 发送 `If-None-Match` | ❌ 不发送 |
| 存缓存 | ✅ 存储响应 | ❌ 不存储 |

简单记忆：**no-cache = 不用缓存但验证它，no-store = 完全不看缓存**

### Q4: `force-cache` 会返回过期数据吗？

**A**: 会。当缓存命中但不新鲜时，`force-cache` **直接返回缓存**，不会向服务器验证。如果你的数据变化频繁，用 `force-cache` 可能导致用户看到过期内容。

### Q5: `only-if-cached` 什么时候用？

**A**: 主要在 Service Worker 中实现**离线优先**策略。当用户离线时，所有请求走 `only-if-cached` 可以避免发起真实网络请求，直接从缓存返回。

### Q6: fetch 缓存和 HTTP 缓存是一回事吗？

**A**: 不是完全相同，但相互关联：
- **HTTP 缓存**：浏览器对 HTTP 响应的存储，受 HTTP 头（Cache-Control、ETag 等）控制
- **fetch cache 选项**：控制 fetch 请求**如何与** HTTP 缓存交互

fetch 的 `cache` 选项是**请求端**对缓存行为的偏好声明，服务器返回的缓存头仍然生效，两者共同决定最终缓存行为。

### Q7: POST 请求会被缓存吗？

**A**: 默认情况下，**不会**。HTTP 规范不建议缓存 POST 请求，且 fetch 默认也不会缓存。但你可以通过 Service Worker 或 Cache API 手动实现 POST 请求的缓存。

---

## 参考资料

- [MDN: fetch() - cache](https://developer.mozilla.org/en-US/docs/Web/API/fetch#cache)
- [Fetch API 规范 - cache mode](https://fetch.spec.whatwg.org/#concept-request-cache-mode)
- [HTTP Caching - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
