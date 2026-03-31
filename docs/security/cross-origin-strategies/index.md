# 跨域策略完全指南

> 跨域问题的本质：浏览器同源策略（Same-Origin Policy）限制了不同源之间的资源访问。本文梳理 7 种主流跨域方案的原理、优缺点和适用场景。

---

## 目录

1. [同源策略基础](#同源策略基础)
2. [CORS（跨域资源共享）](#cors-跨域资源共享)
3. [JSONP（JSON with Padding）](#jsonp-json-with-padding)
4. [postMessage](#postmessage)
5. [WebSocket](#websocket)
6. [iframe 技巧](#iframe-技巧)
7. [代理方案](#代理方案)
8. [其他方案](#其他方案)
9. [方案对比](#方案对比)

---

## 同源策略基础

### 什么是同源

同源 = 协议 + 域名 + 端口 三者完全相同。

```
https://example.com:443/path → 同源
https://example.com:80/path → 不同源（端口不同）
https://sub.example.com/path  → 不同源（子域不同）
http://example.com/path      → 不同源（协议不同）
```

### 同源策略限制

| 限制行为 | 说明 |
|---------|------|
| Cookie/LocalStorage | 无法读取不同源的存储 |
| DOM | 无法访问不同源的 iframe 内部 DOM |
| AJAX | 无法发起不同源的 XMLHttpRequest/fetch |
| Script | 可嵌入，但访问受限 |

### 为什么需要同源策略

保护用户数据安全，防止恶意网站恶意读取其他域下的敏感信息。

---

## CORS（跨域资源共享）

### 原理

CORS 通过 HTTP 响应头告知浏览器允许哪些来源访问哪些资源。

### 简单请求

请求方法为 GET/HEAD/POST，且 Content-Type 为以下之一：
- `application/x-www-form-urlencoded`
- `multipart/form-data`
- `text/plain`

浏览器自动在请求头添加 `Origin`，服务器在响应头返回 `Access-Control-Allow-Origin`。

```http
GET /api/data HTTP/1.1
Host: api.example.com
Origin: https://frontend.com

HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://frontend.com
Content-Type: application/json

{"data": "hello"}
```

### 预检请求（Preflight）

非简单请求会先发送 `OPTIONS` 预检：

```http
OPTIONS /api/data HTTP/1.1
Origin: https://frontend.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: Content-Type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://frontend.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

### Node.js 响应头示例

```javascript
// 允许所有来源（开发环境）
ctx.set('Access-Control-Allow-Origin', '*');

// 生产环境指定来源
ctx.set('Access-Control-Allow-Origin', 'https://frontend.com');
ctx.set('Access-Control-Allow-Credentials', 'true'); // 允许携带 cookie
ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 支持所有 HTTP 方法 | 需服务器配合修改响应头 |
| 支持请求头自定义 | 旧浏览器兼容性问题（IE10+） |
| 支持发送 Cookie | 预检请求增加延迟 |
| 语义清晰 | `Access-Control-Allow-Origin: *` 不支持携带凭证 |

### 适用场景

前后端分离架构、API 开放平台、微服务间通信。

---

## JSONP（JSON with Padding）

### 原理

利用 `<script>` 标签不受同源策略限制的特性，通过回调函数获取数据。

```javascript
// 前端定义回调
function handleResponse(data) {
  console.log(data);
}

// 动态创建 script 标签
const script = document.createElement('script');
script.src = 'https://api.example.com/data?callback=handleResponse';
document.body.appendChild(script);
```

```javascript
// 服务器返回
handleResponse({"name": "Alice", "age": 30});
```

### jQuery JSONP 示例

```javascript
$.ajax({
  url: 'https://api.example.com/data',
  dataType: 'jsonp',
  jsonp: 'callback',
  success: function(data) {
    console.log(data);
  }
});
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 兼容所有浏览器 | 仅支持 GET 请求 |
| 实现简单 | 存在 XSS 安全风险 |
| 不需要服务器特殊配置 | 无法获取请求头/状态码 |
| | 无法进行错误处理 |

### 适用场景

legacy 系统、第三方 API（已废弃）、仅需 GET 数据的简单场景。

> ⚠️ JSONP 已逐渐被 CORS 取代，新项目不推荐使用。

---

## postMessage

### 原理

`window.postMessage` 允许跨窗口发送消息，不受同源策略限制。

### 基本用法

```javascript
// 发送消息（任何窗口）
iframe.contentWindow.postMessage(
  { type: 'AUTH', token: 'abc123' },
  'https://target-origin.com'
);

// 监听消息
window.addEventListener('message', function(event) {
  // 验证来源
  if (event.origin !== 'https://expected-origin.com') return;
  
  console.log('Received:', event.data);
});
```

### 父子窗口通信示例

```javascript
// 父窗口（https://parent.com）
const childWindow = window.open('https://child.com');

// 发送消息到子窗口
setTimeout(() => {
  childWindow.postMessage('Hello Child!', 'https://child.com');
}, 1000);

// 监听子窗口消息
window.addEventListener('message', (e) => {
  if (e.origin === 'https://child.com') {
    console.log('From child:', e.data);
  }
});
```

```javascript
// 子窗口（https://child.com）
window.addEventListener('message', (e) => {
  if (e.origin === 'https://parent.com') {
    console.log('From parent:', e.data);
    // 回复父窗口
    e.source.postMessage('Hello Parent!', e.origin);
  }
});
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 支持双向通信 | 需手动验证 event.origin |
| 不需要服务器配置 | 消息格式需双方约定 |
| 可向任何窗口发消息 | 无法处理文件上传等场景 |
| 支持 iframe / window.open | 浏览器兼容（IE10+） |

### 适用场景

嵌入第三方 iframe、页面间通信、微前端跨应用通信、广告/支付回调。

---

## WebSocket

### 原理

WebSocket 是全双工通信协议，不受同源策略限制。建立连接时通过 HTTP 升级，之后双方平等通信。

### 握手过程

```
客户端请求：
GET /ws HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

服务器响应：
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

### 客户端示例

```javascript
const ws = new WebSocket('wss://api.example.com/ws');

// 连接成功
ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'news' }));
};

// 接收消息
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// 错误处理
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// 关闭连接
ws.onclose = () => {
  console.log('Disconnected');
};
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 全双工通信，低延迟 | 需要服务器支持 WebSocket |
| 不受同源策略限制 | 代理服务器可能不支持 |
| 支持二进制数据 | 需要处理断线重连 |
| 支持跨域 | 服务器资源消耗较大 |

### 适用场景

实时聊天、在线游戏、股票行情推送、协同编辑、IoT 设备通信。

---

## iframe 技巧

### 1. document.domain

同一主域的子域之间可设置 `document.domain` 相同来共享 iframe 内容。

```javascript
// https://a.example.com/page.html
document.domain = 'example.com';
const iframe = document.createElement('iframe');
iframe.src = 'https://b.example.com/other.html';
iframe.onload = () => {
  // 此时可以访问 iframe.contentWindow.document
  console.log(iframe.contentWindow.document.body.innerHTML);
};
document.body.appendChild(iframe);
```

```javascript
// https://b.example.com/other.html
document.domain = 'example.com';
```

**限制**：仅适用于主域相同、子域不同的情况。

### 2. location.hash

通过 URL hash 片段传递数据，父页面修改子 iframe 的 hash，子页面监听 `hashchange` 事件。

```javascript
// 父页面
const iframe = document.getElementById('child');
function sendToChild(data) {
  iframe.src = 'https://child.com/page.html#' + encodeURIComponent(JSON.stringify(data));
}

// 子页面
window.addEventListener('hashchange', () => {
  const data = JSON.parse(decodeURIComponent(location.hash.slice(1)));
  console.log('Received:', data);
});
```

**限制**：数据量有限（URL 长度限制）、单向通信、需要轮询检测变化。

### 3. window.name

设置 window.name 后，iframe 导航到任何 URL 都保留该值，父页面可读取。

```javascript
// 子页面
window.name = JSON.stringify({ type: 'data', value: 123 });

// 父页面（子页面加载完成后）
const iframe = document.getElementById('child');
iframe.onload = () => {
  const data = JSON.parse(iframe.contentWindow.name);
  console.log('Received:', data);
};
```

**限制**：单向通信、安全风险（任何页面都可访问）、数据量约 2MB。

### 4. 种子文件代理

在 iframe 内嵌入一个同域下的"种子文件"作为中转，绕过同源限制。

实际应用中很少单独使用，通常结合其他方案。

---

## 代理方案

### 1. Nginx 反向代理

通过 Nginx 将跨域请求代理到同域下。

```nginx
server {
    listen 80;
    server_name frontend.com;

    location /api/ {
        # 代理到后端 API
        proxy_pass http://api.example.com/;
        proxy_set_header Host api.example.com;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /third-party/ {
        # 代理到第三方服务
        proxy_pass https://external-api.com/;
    }
}
```

### 2. 开发环境代理（Vite/Webpack）

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
};
```

```javascript
// webpack.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
};
```

### 3. 服务端代理

Node.js 代理中间件：

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.get('/proxy', async (req, res) => {
  try {
    const response = await axios.get(req.query.url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 对前端代码无侵入 | 需要额外服务器配置 |
| 性能好（内网通信） | 增加了架构复杂度 |
| 支持所有请求方法 | 开发环境需要配置 |
| 安全（隐藏真实后端地址） | 代理层可能成为瓶颈 |

### 适用场景

生产环境 API 网关、开发环境跨域、开发测试第三方接口。

---

## 其他方案

### 1. 图片 ping

通过 `<img>` 标签加载 1x1 像素图片，携带少量数据。

```javascript
const img = new Image();
img.src = 'https://tracker.com/track?event=click&data=' + encodeURIComponent(data);
```

**限制**：单向通信、仅支持 GET、无法获取响应。

### 2. SSE（Server-Sent Events）

服务端推送单向通道，浏览器通过 EventSource 接收。

```javascript
const eventSource = new EventSource('/events');

eventSource.onmessage = (event) => {
  console.log('Message:', event.data);
};

eventSource.onerror = () => {
  console.error('SSE error');
};
```

### 3. MIME 类型滥用

部分文件类型可跨域加载并执行，如 JSONP 利用 `<script>` 标签。但存在严重安全风险，不推荐使用。

---

## 方案对比

| 方案 | 通信方向 | 请求类型 | 兼容性 | 安全性 | 复杂度 | 推荐度 |
|------|---------|---------|--------|--------|--------|--------|
| CORS | 双向 | 任意 | IE10+ | ✅ 高 | 中 | ⭐⭐⭐⭐⭐ |
| JSONP | 单向 | GET | 所有 | ⚠️ 中 | 低 | ⭐ 不推荐 |
| postMessage | 双向 | 任意 | IE10+ | ✅ 高 | 低 | ⭐⭐⭐⭐ |
| WebSocket | 双向 | 任意 | 所有 | ✅ 高 | 中 | ⭐⭐⭐⭐⭐ |
| nginx代理 | 双向 | 任意 | 所有 | ✅ 高 | 中 | ⭐⭐⭐⭐ |
| document.domain | 单向 | 任意 | 所有 | ⚠️ 中 | 低 | ⭐⭐⭐ |
| location.hash | 单向 | GET | 所有 | ⚠️ 低 | 低 | ⭐⭐ |
| window.name | 单向 | 任意 | 所有 | ⚠️ 低 | 低 | ⭐ |

### 选型建议

| 场景 | 推荐方案 |
|------|---------|
| RESTful API 调用 | CORS |
| 实时双向通信 | WebSocket |
| iframe 嵌入通信 | postMessage |
| 遗留系统（仅 GET） | JSONP |
| 生产环境 API | nginx 反向代理 |
| 微前端跨应用 | postMessage + iframe |

---

## 安全注意事项

1. **验证来源**：使用 `postMessage` 时务必验证 `event.origin`
2. **限制范围**：CORS 尽量指定具体允许的 origin，避免 `*`
3. **敏感操作**：跨域请求不应携带关键认证信息在 URL 中
4. **CSRF Token**：对于高风险操作，结合 CSRF Token 防护
5. **内容安全策略**：配合 CSP（Content-Security-Policy）进一步限制

---

## 参考资料

- [MDN: Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN: postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [MDN: WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [W3C CORS Specification](https://www.w3.org/TR/cors/)
