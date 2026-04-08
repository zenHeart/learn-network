# OWASP HTML5 Security Cheat Sheet

> 本文档整理 OWASP HTML5 Security Cheat Sheet 的核心知识点，涵盖 Web Messaging、CORS、Local Storage、Web Workers、SVG XSS、Form Validation 等主题。

---

## 目录

- [1. Web Messaging](#1-web-messaging)
- [2. Cross-Origin Resource Sharing (CORS)](#2-cross-origin-resource-sharing-cors)
- [3. Local Storage](#3-local-storage)
- [4. Web Workers](#4-web-workers)
- [5. SVG XSS](#5-svg-xss)
- [6. Form Validation](#6-form-validation)
- [7. Web Storage 安全](#7-web-storage-安全)
- [8. iframe 安全](#8-iframe-安全)
- [9. Content Security Policy (CSP)](#9-content-security-policy-csp)

---

## 1. Web Messaging

### 1.1 概念

Web Messaging（`postMessage`）允许不同源的页面之间安全地传递消息。

### 1.2 安全风险

- **目标 origin 验证不足**：未验证 `event.origin` 或使用 `*` 作为目标 origin
- **任意 origin 接收**：使用 `window.addEventListener('message', handler)` 但不验证 origin

### 1.3 安全建议

```js
// ✅ 安全用法：验证 origin
window.addEventListener('message', (event) => {
  if (['https://trusted.com', 'https://app.trusted.com'].includes(event.origin)) {
    console.log('Received:', event.data);
  }
});

// ❌ 不安全：接受任意 origin
window.addEventListener('message', (event) => {
  console.log('Received:', event.data); // 未验证 origin
});
```

### 1.4 验证来源

```js
// 使用正则验证
if (/^https:\/\/.*\.trusted\.com$/.test(event.origin)) {
  // 安全处理
}

// 避免使用 * 作为 targetOrigin（除非明确知道只有接收方）
targetWindow.postMessage(message, 'https://trusted.com');
```

---

## 2. Cross-Origin Resource Sharing (CORS)

### 2.1 概念

CORS 是一种 W3C 规范，允许服务器声明哪些 origin 可以访问其资源。

### 2.2 安全风险

- **过度宽松的 CORS 配置**：`Access-Control-Allow-Origin: *`
- **credentials 和 `*` 同时使用**：浏览器会拒绝
- **Vary: Origin 缺失**：缓存可能错误地返回其他 origin 的响应

### 2.3 安全建议

```js
// ✅ 安全：明确指定允许的 origin
Access-Control-Allow-Origin: https://app.example.com

// ❌ 不安全：允许所有 origin
Access-Control-Allow-Origin: *

// ✅ 安全：基于请求头动态设置
if (req.headers.origin === 'https://app.example.com') {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
}
```

### 2.4 预检请求（Preflight）

```js
// 预检请求处理
if (req.method === 'OPTIONS') {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 预检结果缓存 24 小时
  return;
}
```

### 2.5 credentials

```js
// 允许携带 credentials
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://app.example.com  // 必须明确指定，不能用 *
```

---

## 3. Local Storage

### 3.1 概念

`localStorage` 和 `sessionStorage` 是 HTML5 提供的客户端存储机制。

### 3.2 安全风险

- **敏感数据存储**：用户名、token、信用卡信息等存储在 localStorage
- **XSS 攻击**：任何 XSS 都可以读取 localStorage
- **无法存储加密数据**：localStorage 存储的是明文

### 3.3 安全建议

```js
// ❌ 不安全：将敏感 token 存储在 localStorage
localStorage.setItem('token', userToken);

// ✅ 替代方案：使用 HttpOnly Cookie 存储敏感信息
// 敏感数据使用后立即清除
sessionStorage.setItem('tempData', data);
sessionStorage.removeItem('tempData');

// ✅ 加密存储（如果必须使用 localStorage）
import { encrypt, decrypt } from './crypto';
const encryptedToken = encrypt(token, secretKey);
localStorage.setItem('token', encryptedToken);
```

### 3.4 数据生命周期

| 存储方式 | 生命周期 | 作用域 |
|---------|---------|--------|
| `sessionStorage` | 标签页关闭时清除 | 同源 + 同标签页 |
| `localStorage` | 永久（需手动清除） | 同源 |
| `Cookie` | 可设置过期时间 | 可设置路径、域名 |

---

## 4. Web Workers

### 4.1 概念

Web Workers 允许在后台线程中运行脚本，不阻塞主线程。

### 4.2 安全风险

- **导入外部脚本**：Worker 中 `importScripts()` 可能加载恶意代码
- **数据泄露**：Worker 中处理的数据可能被恶意脚本访问
- **CORS 绕过**：Worker 的网络请求不受主页面 CORS 限制

### 4.3 安全建议

```js
// ✅ 安全：使用 Blob URL 创建 Worker，避免外部脚本注入
const workerCode = `
  self.onmessage = (e) => {
    const result = processData(e.data);
    self.postMessage(result);
  };
`;
const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));

// ❌ 不安全：直接使用外部 URL
const worker = new Worker('https://malicious.com/worker.js');

// ✅ 安全：使用 importScripts 时验证 URL
// 仅使用同源或已知安全的脚本
importScripts('https://cdn.example.com/trusted-lib.js');
```

### 4.4 Worker 通信安全

```js
// 主线程
const worker = new Worker('worker.js');
worker.postMessage({ type: 'COMMAND', data: sensitiveData });

// Worker 中验证消息来源
self.onmessage = (event) => {
  if (event.data.type !== 'COMMAND') return;
  // 处理数据
};
```

---

## 5. SVG XSS

### 5.1 概念

SVG（可缩放矢量图形）支持内联 JavaScript，可能被用于 XSS 攻击。

### 5.2 安全风险

```xml
<!-- 恶意 SVG：自动执行 script -->
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert(document.cookie)</script>
</svg>
```

### 5.3 SVG XSS 向量

```xml
<!-- onload 事件 -->
<svg onload="alert(1)">
<!-- script 标签 -->
<script>alert(1)</script>
<!-- animate 标签 -->
<animate onbegin="alert(1)" attributeName="x">
<!-- set 标签 -->
<set attributeName="onclick" to="alert(1)">
<!-- expression (旧版 IE) -->
<div style="width: expression(alert(1))">
```

### 5.4 安全建议

```js
// ✅ SVG 上传安全处理
function sanitizeSVG(svgString) {
  // 1. 移除 script 标签
  svgString = svgString.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. 移除危险事件属性
  const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover', 'onbegin', 'onend'];
  dangerousAttrs.forEach(attr => {
    const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    svgString = svgString.replace(regex, '');
  });

  // 3. 使用 DOMPurify 等专业库进行净化
  return DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true } });
}
```

```html
<!-- ✅ 安全：使用 Content-Disposition 强制下载，不直接展示用户上传的 SVG -->
<a href="/download?file=user-uploaded.svg" download>下载 SVG</a>

<!-- ❌ 不安全：直接展示用户上传的 SVG -->
<img src="user-uploaded.svg">
```

### 5.5 CSP 防护

```html
<!-- CSP 禁止内联脚本 -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self'">
```

---

## 6. Form Validation

### 6.1 客户端验证的风险

- **可以被绕过**：浏览器开发者工具可以修改表单值
- **数据类型可伪造**：AJAX 请求可以绕过 HTML 验证

### 6.2 安全建议

```html
<!-- ✅ 客户端验证：增强用户体验 -->
<form>
  <input type="text" pattern="[a-zA-Z]+" required
         title="仅允许英文字母"
         minlength="2" maxlength="50">
  <input type="email" required>
  <input type="number" min="0" max="120">
  <button type="submit">提交</button>
</form>

<!-- ❌ 不安全：仅依赖客户端验证 -->
```

```js
// ✅ 服务器端验证：必须的
function validateForm(formData) {
  const errors = [];

  // 验证所有字段
  if (!formData.name || !/^[a-zA-Z]{2,50}$/.test(formData.name)) {
    errors.push('姓名格式不正确');
  }

  if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.push('邮箱格式不正确');
  }

  // 验证数据范围
  if (formData.age < 0 || formData.age > 120) {
    errors.push('年龄超出合理范围');
  }

  // HTML 特殊字符转义（防止 XSS）
  Object.keys(formData).forEach(key => {
    if (typeof formData[key] === 'string') {
      formData[key] = formData[key].replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }
  });

  return errors;
}
```

### 6.3 自动补全（autocomplete）安全

```html
<!-- ❌ 不安全：敏感字段开启自动补全 -->
<input type="text" name="credit-card" autocomplete="cc-number">

<!-- ✅ 安全：关闭敏感字段自动补全 -->
<input type="text" name="card-number" autocomplete="off">
```

---

## 7. Web Storage 安全

### 7.1 localStorage vs sessionStorage

| 特性 | localStorage | sessionStorage |
|------|-------------|----------------|
| 生命周期 | 永久 | 标签页关闭 |
| 作用域 | 同源 | 同源 + 同标签页 |
| 容量 | ~5-10MB | ~5-10MB |
| XSS 风险 | 高 | 高 |
| CSRF 风险 | 无 | 无 |

### 7.2 安全最佳实践

```js
// 1. 不存储敏感信息
// ✅ 敏感 token 使用 HttpOnly Cookie
// ✅ 临时数据使用 sessionStorage 并及时清除

// 2. 加密存储（风险永远存在）
const key = deriveKey(userPassword, salt);
localStorage.setItem('data', encrypt(JSON.stringify(sensitiveData), key));

// 3. 设置合理的数据过期
const STORAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时
function setWithExpiry(key, value) {
  const item = { value, expiry: Date.now() + STORAGE_EXPIRY };
  localStorage.setItem(key, JSON.stringify(item));
}

// 4. 定期清理
function cleanupStorage() {
  Object.keys(localStorage).forEach(key => {
    const item = JSON.parse(localStorage.getItem(key));
    if (item && item.expiry && Date.now() > item.expiry) {
      localStorage.removeItem(key);
    }
  });
}
```

---

## 8. iframe 安全

### 8.1 sandbox 属性

```html
<!-- ✅ 最安全的 sandbox：禁用所有能力 -->
<iframe sandbox src="untrusted-content.html"></iframe>

<!-- ✅ 按需启用能力 -->
<iframe sandbox="allow-scripts allow-same-origin" src="trusted-but-scripty.html"></iframe>

<!-- ❌ 危险：允许表单提交和脚本 -->
<iframe sandbox="allow-forms allow-scripts" src="form-page.html"></iframe>
```

### 8.2 X-Frame-Options

```js
// 防止页面被嵌入 iframe
res.setHeader('X-Frame-Options', 'DENY');  // 完全禁止
res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // 仅允许同源

// 现代替代：CSP frame-ancestors
res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
```

### 8.3 srcdoc 属性

```html
<!-- ✅ 使用 srcdoc 替代 src（可控内容） -->
<iframe srcdoc="<p>Hello World</p>"></iframe>

<!-- ❌ 避免将用户输入放入 srcdoc -->
<iframe srcdoc="<script>alert('${userInput}')</script>"></iframe>
```

---

## 9. Content Security Policy (CSP)

### 9.1 基础 CSP

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
```

### 9.2 HTML5 相关 CSP 指令

| 指令 | 说明 |
|------|------|
| `child-src` | iframe、web workers 等子资源 |
| `worker-src` | Web Worker |
| `frame-src` | iframe（已废弃，用 child-src） |
| `object-src` | embed、object、applet |
| `base-uri` | `<base>` 标签 |
| `form-action` | 表单提交目标 |

### 9.3 HTML5 安全 CSP 配置

```html
<!-- 严格的 HTML5 应用 CSP -->
<meta http-equiv="Content-Security-Policy"
      content="
        default-src 'self';
        script-src 'self';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        font-src 'self';
        connect-src 'self' https://api.example.com;
        frame-src 'none';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        worker-src 'self';
      ">
```

---

## 参考资料

- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [PUPUWEB 中文整理](https://pupuweb.com/owasp-html5-security-cheat-sheet-guide/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [OWASP Cheat Sheet Series](https://owasp.deteact.com/cheat/cheatsheets/Index.html)
