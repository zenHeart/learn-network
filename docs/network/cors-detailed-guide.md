# CORS 跨域资源共享详解

CORS（Cross-Origin Resource Sharing，跨域资源共享）是 W3C 规范定义的机制，允许服务器通过添加特定的 HTTP 响应头，来控制浏览器是否允许当前页面从不同域名（或不同端口、不同协议）的服务器获取资源。理解 CORS 是前端工程师掌握网络安全和 API 设计的必备基础。

## 目录

- [为什么需要 CORS](#为什么需要-cors)
- [核心概念与术语](#核心概念与术语)
- [请求分类：简单请求 vs 预检请求](#请求分类简单请求-vs-预检请求)
- [Access-Control-* 响应头详解](#access-control--响应头详解)
- [Credentials（凭证）与安全](#credentials凭证与安全)
- [跨域限制与常见绕过方案](#跨域限制与常见绕过方案)
- [CORS vs JSONP](#cors-vs-jsonp)
- [常见 CORS 错误排查](#常见-cors-错误排查)
- [服务端配置示例](#服务端配置示例)

---

## 为什么需要 CORS

### 同源策略（Same-Origin Policy）

浏览器默认实施**同源策略**（Same-Origin Policy），限制来自一个 "origin" 的文档或脚本与另一个 "origin" 的资源交互。同源指：**协议 + 域名 + 端口** 三者完全一致。

| 对比项 | 同源 | 跨域 |
|--------|------|------|
| `https://example.com` vs `https://example.com:443` | ✅ 同源（端口一致） | — |
| `https://example.com` vs `https://api.example.com` | ❌ 不同源（子域名不同） | 跨域 |
| `https://example.com` vs `http://example.com` | ❌ 不同源（协议不同） | 跨域 |
| `https://example.com` vs `https://other.com` | ❌ 不同源（域名不同） | 跨域 |

> 注意：IE 浏览器对端口的处理有所不同，通常忽略端口比较。

同源策略是浏览器的安全基石，有效阻止恶意脚本读取敏感数据（如 Cookie、LocalStorage），但也阻断了合法的跨域数据请求。

### CORS 的角色

CORS 不是要打破同源策略，而是为服务器提供一种**显式授权机制**：服务器告诉浏览器，哪些跨域请求是可信的，浏览器据此放行响应数据给 JavaScript。

---

## 核心概念与术语

### Origin（源）

Origin 由三部分组成：

```
<scheme>://<host>:<port>
```

示例：`https://foo.example:8080`

- **URL 路径**（如 `/api/users`）不属于 Origin 的一部分
- 特殊值：`null`（如 `file://` 协议的页面）

### 跨域请求的触发场景

以下 API 会触发跨域限制：

| API | 说明 |
|-----|------|
| `fetch()` / `XMLHttpRequest` | 最常见的跨域请求 |
| Web Fonts（`@font-face`） | 跨域加载字体文件 |
| WebGL 纹理 | 通过 `drawImage()` 使用跨域图片 |
| Canvas 绘制跨域图片 | 使用跨域图片绘制到 Canvas |
| CSS Shapes | 从跨域图片提取 CSS 形状 |

### CORS 失败的特点

> **重要**：CORS 失败时，浏览器不会把响应数据交给 JavaScript。出于安全考虑，**错误详情对 JavaScript 不可见**，代码只知道 "发生了错误"。具体原因必须通过浏览器控制台查看。

---

## 请求分类：简单请求 vs 预检请求

### 简单请求（Simple Requests）

简单请求不会触发 CORS 预检（Preflight），可以直接发送。条件为**同时满足以下全部条件**：

1. **HTTP 方法**：仅限 `GET`、`HEAD`、`POST` 之一
2. **请求头**：只能使用**CORS 安全列表请求头**：
   - `Accept`
   - `Accept-Language`
   - `Content-Language`
   - `Content-Type`（且只能是以下三种）：
     - `application/x-www-form-urlencoded`
     - `multipart/form-data`
     - `text/plain`
   - `Range`（仅单个范围值，如 `bytes=256-`）
3. **无自定义请求头**：不能手动设置其他非安全列表头
4. **无 `ReadableStream`**：请求中不能使用 `ReadableStream` 对象
5. **无上传事件监听**：若使用 `XMLHttpRequest`，其 `upload` 属性上不能注册事件监听器

#### 简单请求流程

```
浏览器                          服务器
  │                               │
  │  1. 发送请求（含 Origin 头）    │
  │ ─────────────────────────────► │
  │                               │
  │  2. 返回响应（含 ACAO 头）      │
  │ ◄───────────────────────────── │
  │                               │
  │  3. 检查 ACAO 是否允许当前 origin │
  │     ✅ 允许 → 响应数据交 JS     │
  │     ❌ 不允许 → 响应被拦截       │
```

#### 示例 HTTP 交换

**请求**：

```http
GET /resources/public-data/ HTTP/1.1
Host: bar.other
Origin: https://foo.example
```

**响应（允许所有来源）**：

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Content-Type: application/json

[{"data": "value"}]
```

**响应（仅允许特定来源）**：

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://foo.example
Vary: Origin
Content-Type: application/json
```

> 服务器若动态根据请求 origin 返回不同的 ACAO 值，应同时返回 `Vary: Origin`，以便浏览器正确缓存。

### 预检请求（Preflight Requests）

不满足简单请求条件的请求，会先发送 **OPTIONS** 方法的预检请求，询问服务器是否允许实际请求。

#### 预检条件（满足任一即触发）

- 使用 `PUT`、`DELETE`、`CONNECT`、`OPTIONS`、`TRACE`、`PATCH` 方法
- `Content-Type` 不是简单请求的三种之一（如 `application/json`、`text/xml`）
- 设置了自定义请求头（如 `X-Custom-Header`）
- 使用了非安全列表请求头
- `XMLHttpRequest.upload` 注册了事件监听
- 使用 `ReadableStream`

#### 预检请求流程

```
浏览器                          服务器
  │                               │
  │  1. OPTIONS 预检请求           │
  │  (Access-Control-Request-Method: POST)  │
  │  (Access-Control-Request-Headers: Content-Type, X-Pingother) │
  │ ─────────────────────────────► │
  │                               │
  │  2. 预检响应（允许的方法/头）    │
  │ ◄───────────────────────────── │
  │                               │
  │  3. 实际请求（含 Origin）       │
  │ ─────────────────────────────► │
  │                               │
  │  4. 实际响应（含 ACAO）         │
  │ ◄───────────────────────────── │
  │                               │
  │  5. 检查 → 决定是否交付 JS     │
```

#### 预检响应关键头

```http
Access-Control-Allow-Origin: https://foo.example
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: X-Pingother, Content-Type
Access-Control-Max-Age: 86400
```

- `Max-Age` 表示预检结果可缓存的秒数，减少OPTIONS请求
- 各浏览器有最大缓存上限，Chrome 最大 2 小时，Firefox 最大 24 小时

#### 预检请求与重定向

> ⚠️ **浏览器兼容性问题**：部分浏览器在预检请求后收到重定向时，会报错并阻止请求。规范后来已修改为允许重定向跟随，但并非所有浏览器都已实现。

---

## Access-Control-* 响应头详解

### 响应头总览

| 响应头 | 说明 |
|--------|------|
| `Access-Control-Allow-Origin` | 允许的来源（`*` 或具体 origin） |
| `Access-Control-Expose-Headers` | 允许 JS 读取的响应头 |
| `Access-Control-Max-Age` | 预检结果缓存时长 |
| `Access-Control-Allow-Credentials` | 是否允许携带凭证 |
| `Access-Control-Allow-Methods` | 允许的 HTTP 方法（预检响应） |
| `Access-Control-Allow-Headers` | 允许的请求头（预检响应） |

### Access-Control-Allow-Origin

```http
Access-Control-Allow-Origin: <origin> | *
```

- `*` 表示允许任意来源（**但不能与 `credentials` 同时为 true**）
- 具体 origin 值（如 `https://foo.example`）表示仅允许该来源
- 若 origin 动态变化，应返回实际 origin 而非 `*`，并加上 `Vary: Origin`

### Access-Control-Expose-Headers

默认情况下，JS 只能读取"简单响应头"（`Cache-Control`、`Content-Language`、`Content-Type`、`Expires`、`Last-Modified`、`Pragma`）。要读取其他头，需显式暴露：

```http
Access-Control-Expose-Headers: X-My-Custom-Header, X-Another-Header, Content-Length
```

### Access-Control-Max-Age

```http
Access-Control-Max-Age: <delta-seconds>
```

表示预检结果可缓存的秒数。例如 `86400` = 24 小时。

### Access-Control-Allow-Credentials

```http
Access-Control-Allow-Credentials: true
```

- 允许跨域请求携带 Cookie、HTTP 认证信息
- 若为 `true`，则 `Access-Control-Allow-Origin` **不能为 `*`**，必须指定具体 origin
- JS 端需设置 `credentials: 'include'`（Fetch）或 `withCredentials = true`（XHR）

### Access-Control-Allow-Methods

预检响应中声明实际请求允许使用的 HTTP 方法：

```http
Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE
```

### Access-Control-Allow-Headers

预检响应中声明实际请求允许携带的请求头：

```http
Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization
```

### 请求方对应的请求头

| 请求头（浏览器自动设置） | 说明 |
|------------------------|------|
| `Origin` | 发起请求的源（所有跨域请求都带） |
| `Access-Control-Request-Method` | 预检请求：实际请求使用的方法 |
| `Access-Control-Request-Headers` | 预检请求：实际请求携带的头 |

---

## Credentials（凭证）与安全

### 默认行为

默认情况下，跨域请求**不会**携带 Cookie 和 HTTP 认证信息。这是浏览器的安全默认值。

### 开启凭证传输

**Fetch API**：

```javascript
fetch('https://api.example.com/data', {
  credentials: 'include'  // 始终发送凭证
});
```

**XMLHttpRequest**：

```javascript
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;
xhr.open('GET', 'https://api.example.com/data');
xhr.send();
```

### 凭证请求的约束（重要！）

当请求携带凭证时，服务器**必须**：

1. `Access-Control-Allow-Origin` 不能是 `*`，必须指定具体 origin
2. `Access-Control-Allow-Credentials` 必须为 `true`
3. `Access-Control-Allow-Headers` 不能是 `*`
4. `Access-Control-Allow-Methods` 不能是 `*`
5. `Access-Control-Expose-Headers` 不能是 `*`

### 第三方 Cookie

CORS 凭证请求仍受**第三方 Cookie 策略**约束。浏览器的第三方 Cookie 策略（`SameSite` 属性）可能阻止 Cookie 发送，即使 CORS 头允许。

---

## 跨域限制与常见绕过方案

### 跨域限制一览

| 限制类型 | 说明 |
|----------|------|
| `XMLHttpRequest` / `fetch` | 浏览器拦截无 ACAO 头的响应 |
| `localStorage` / `sessionStorage` | 不同源完全隔离，无法互相访问 |
| `Cookie` | 受同源策略限制，可通过 `document.domain` 调整（已逐步废弃） |
| `DOM` | 无法 `parent.window` 访问跨域 iframe 的内容 |
| `Canvas` 绘制 | 跨域图片绘制到 Canvas 会**污染（taint）** Canvas，导致无法 `toDataURL` / `toBlob` |

### 常见绕过方案

#### 1. 服务端代理（最推荐）

在同源服务器上搭建代理，将跨域请求转发到目标服务器：

```
浏览器 → 同源代理服务器 → 目标服务器
```

前端只请求同源地址，避免跨域。Nginx 配置示例：

```nginx
location /api/ {
    proxy_pass https://target-server.com/;
}
```

#### 2. JSONP（已不推荐）

利用 `<script>` 标签不受同源策略限制的特性，只能用于 `GET` 请求，且服务器需要配合返回特定格式数据。**安全性差**，无法发送 POST 请求，已基本被 CORS 取代。

#### 3. 跨域消息通信（postMessage）

`window.postMessage` 允许不同源的窗口之间安全传递消息：

```javascript
// A 窗口
otherWindow.postMessage('Hello', 'https://target-origin.com');

// B 窗口
window.addEventListener('message', (event) => {
  if (event.origin === 'https://expected-origin.com') {
    console.log(event.data);
  }
});
```

#### 4. WebSocket

WebSocket 协议**不受同源策略限制**（但要注意 Origin 头验证）。

#### 5. CORS 本身

最标准的方案：服务器配置正确的 CORS 响应头。

---

## CORS vs JSONP

| 特性 | CORS | JSONP |
|------|------|-------|
| 支持方法 | GET + POST + PUT + DELETE 等 | 仅 GET |
| 支持请求头 | 任意 | 仅简单请求头 |
| 错误处理 | 友好（控制台可查详情） | 不友好（静默失败） |
| 安全性 | 较高（服务器可控） | 较低（script 标签执行） |
| 兼容性 | 现代浏览器 | 旧版浏览器（IE7+） |
| 能否携带 Cookie | ✅ 可以 | ❌ 不支持 |
| 预检机制 | ✅ 有 | ❌ 无 |
| 推荐程度 | ✅ 首选 | ❌ 不推荐 |

---

## 常见 CORS 错误排查

### 错误 1：`Access-Control-Allow-Origin`  missing

```
Access to fetch at 'https://api.example.com' from origin 'https://foo.com'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
is present on the requested resource.
```

**解决**：服务器添加 `Access-Control-Allow-Origin` 响应头。

### 错误 2：wildcard `*` 与 credentials 同时使用

```
Access to fetch at 'https://api.example.com' from origin 'https://foo.com'
has been blocked by CORS policy: The value of the
'Access-Control-Allow-Origin' header must not be '*' when the request's
'credentials' mode is 'include'.
```

**解决**：服务器将 `Access-Control-Allow-Origin` 改为具体 origin，不能用 `*`。

### 错误 3：预检请求失败

```
Response to preflight request doesn't pass access control check
```

**解决**：检查服务器是否正确响应 OPTIONS 预检请求，并返回正确的 `Access-Control-Allow-*` 头。

### 排查工具

- 浏览器 DevTools → Network → 查看请求的 `Access-Control-*` 头
- 浏览器 DevTools → Console → 查看 CORS 错误详情
- 工具：[Will it CORS?](https://httptoolkit.com/will-it-cors/) 可视化 CORS 测试

---

## 服务端配置示例

### Node.js / Express

```javascript
const express = require('express');
const app = express();

// 全局 CORS 中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://trusted-site.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Custom-Header');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24小时

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// 或使用 cors 中间件
// const cors = require('cors');
// app.use(cors({ origin: 'https://trusted-site.com', credentials: true }));
```

### Nginx

```nginx
server {
    location / {
        # 允许特定来源
        add_header 'Access-Control-Allow-Origin' 'https://trusted-site.com' always;
        # 如果需要凭证
        # add_header 'Access-Control-Allow-Credentials' 'true' always;
        # add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Custom-Header' always;
        add_header 'Access-Control-Max-Age' '86400' always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
```

---

## 参考资料

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN: CORS Errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors)
- [Fetch 规范 - CORS 协议](https://fetch.spec.whatwg.org/#http-cors-protocol)
- [enable-cors.org](https://enable-cors.org/)
