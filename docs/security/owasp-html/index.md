# OWASP HTML5 安全指南

## 概述

本文档整理自 [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)，涵盖 HTML5 新增安全考量。

## 主要议题

### 1. Web Messaging

HTML5 引入 `postMessage` API 实现跨域通信。

#### 安全建议

```javascript
// 接收消息时验证来源
window.addEventListener('message', function(event) {
  // 只接受来自信任来源的消息
  if (event.origin !== 'https://trusted-site.com') {
    return;
  }
  
  // 验证数据结构
  if (typeof event.data !== 'object') {
    return;
  }
  
  // 处理消息
  processMessage(event.data);
});
```

#### 最佳实践

- **始终验证 origin**：使用 `event.origin` 检查消息来源
- **验证数据类型**：确保 `event.data` 是预期类型
- **使用 isTrusted**：检查事件是否来自用户真实交互

### 2. Cross-Origin Resource Sharing (CORS)

#### 安全配置

```javascript
// 服务器端：只允许信任的来源
app.use((req, res, next) => {
  const allowedOrigins = ['https://trusted-site.com', 'https://app.example.com'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  next();
});
```

#### 不要使用

```html
<!-- 危险：允许任何来源 -->
<meta http-equiv="Access-Control-Allow-Origin" content="*">
```

### 3. Local Storage 安全

#### 限制敏感数据

```javascript
// 不要在 localStorage 中存储敏感信息
// 敏感数据应该：
// 1. 使用 sessionStorage（会话结束自动清除）
// 2. 使用 HttpOnly Cookie
// 3. 加密后存储

// localStorage 只能存储字符串
localStorage.setItem('userId', '12345');
localStorage.setItem('token', 'xyz'); // 不推荐
```

#### XSS 防护

```javascript
// 读取时转义
function getSafe(key) {
  const value = localStorage.getItem(key);
  // 转义 HTML 特殊字符
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

### 4. Web Workers

#### 安全考量

```javascript
// 主线程
const worker = new Worker('worker.js');

// 消息传递是拷贝而非引用
worker.postMessage({ data: sensitiveData });

worker.onmessage = function(event) {
  console.log('Received:', event.data);
};
```

#### 安全建议

- **不要在 Worker 中执行 DOM 操作**
- **验证 Worker 脚本来源**
- **限制 Worker 访问的资源**

### 5. SVG XSS

#### 危险示例

```html
<!-- 危险：SVG 可能包含脚本 -->
<svg>
  <script>alert('XSS')</script>
</svg>
```

#### 安全实践

```html
<!-- 使用 Content Security Policy -->
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self'">

<!-- 或使用 sanitize 库处理 SVG -->
<script src="DOMPurify.min.js"></script>
<script>
  const cleanSVG = DOMPurify.sanitize(dirtySVG);
</script>
```

### 6. Form Validation

#### 客户端验证

```html
<form>
  <input 
    type="email" 
    required 
    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
  />
  <input type="submit" value="提交" />
</form>
```

#### 服务端验证（必须）

```javascript
// 永远不要只依赖客户端验证
app.post('/submit', (req, res) => {
  const { email, password } = req.body;
  
  // 服务端验证
  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password too short' });
  }
  
  // 处理请求
});
```

### 7. iframe 安全

#### sandbox 属性

```html
<!-- 最安全的 iframe -->
<iframe 
  src="https://example.com"
  sandbox="allow-scripts allow-same-origin"
  referrerpolicy="no-referrer"
></iframe>
```

#### 注意事项

- **不要允许 `allow-same-origin` + `allow-scripts` 组合**
- **使用 `sandbox` 属性限制权限**
- **考虑使用 `srcdoc` 而非 `src`**

### 8. Clickjacking 防护

```html
<!-- X-Frame-Options 头 -->
<meta http-equiv="X-Frame-Options" content="DENY">

<!-- 或使用 CSP -->
<meta http-equiv="Content-Security-Policy" 
      content="frame-ancestors 'none'">
```

### 9. WebSocket 安全

```javascript
// 使用 WSS（WebSocket Secure）
const ws = new WebSocket('wss://secure-site.com/ws');

// 验证 WebSocket 消息来源
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (!allowedOrigins.includes(origin)) {
    ws.close();
    return;
  }
  
  // 处理连接
});
```

## 安全检查清单

- [ ] 实现 Content Security Policy (CSP)
- [ ] 验证所有 postMessage 来源
- [ ] 不要在 localStorage 存储敏感信息
- [ ] 使用 HttpOnly 和 Secure Cookie 标志
- [ ] 启用 X-Frame-Options 防止点击劫持
- [ ] 验证所有表单输入（客户端 + 服务端）
- [ ] 清理用户输入的 HTML/SVG 内容
- [ ] 使用 WSS 而非 WS
- [ ] 配置 CORS 严格白名单

## 参考资源

- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series](https://owasp.deteact.com/cheat/cheatsheets/Index.html)
- [MDN HTML5 Security](https://developer.mozilla.org/en-US/docs/Web/HTML/Security)
