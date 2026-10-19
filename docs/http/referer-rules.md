# Referer 字段完全指南

> 参考：MDN、HTTP 规范、浏览器安全策略

## 目录

1. [什么是 Referer](#什么是-referer)
2. [发送条件](#发送条件)
3. [Referrer-Policy 策略](#referrer-policy-策略)
4. [常见使用场景](#常见使用场景)
5. [安全注意事项](#安全注意事项)
6. [工具与调试](#工具与调试)

---

## 什么是 Referer

`Referer` 请求头部指示了请求的来源 URL，服务器据此了解用户从哪个页面导航过来。

### 历史命名

正确拼写是 **Referrer**（来源追踪者），HTTP 头部字段错误地拼写成了 `Referer`（历史原因，1996 年 CERN 规范首次引入时拼写错误，之后沿用至今）。

```
Referer: https://example.com/page?id=123
```

### 请求来源示例

| 场景 | Referer 值 |
|------|-----------|
| 点击 `https://target.com` 链接从 `https://source.com` 跳转 | `https://source.com/page` |
| 页面加载图片 `https://img.com/pic.png` | `https://current-page.com` |
| 表单提交到 `https://api.com/submit` | `https://form-page.com` |
| Ajax 请求 | `https://current-page.com` |

---

## 发送条件

### 会发送 Referer 的场景

1. **链接跳转**：点击 `<a>` 链接跳转到其他页面
2. **资源加载**：页面加载图片、脚本、CSS、视频等资源
3. **表单提交**：`<form method="POST">` 提交
4. **JavaScript 请求**：使用 `fetch()`、`XMLHttpRequest`、`axios` 等发起的请求
5. **iframe 加载**：嵌入的 iframe 页面加载

### 不会发送 Referer 的场景

| 场景 | 原因 |
|------|------|
| 直接在地址栏输入 URL | 没有来源页面 |
| 打开新标签页直接输入 URL | 没有来源页面 |
| HTTPS 页面请求 HTTP 资源 | 安全限制（防止中间人攻击） |
| 使用 `<meta http-equiv="refresh">` 重定向 | 部分浏览器不发送 |
| 使用 `file://` 协议 | 安全限制 |
| 点击书签 | 没有来源追踪 |
| 使用 `rel="noreferrer"` 的链接 | 明确要求不发送 |

### HTTPS → HTTP 的安全限制

当从 HTTPS 页面跳转到 HTTP 页面时，浏览器**不会发送 Referer**（防止敏感信息通过不安全的连接泄露）。

```
HTTPS 页面 A → 点击链接 → HTTP 页面 B
结果：页面 B 收不到 Referer
```

这是浏览器的安全策略，目的是防止 HTTPS 页面中的敏感信息（如认证 token、session）通过 Referer 泄露给不安全的 HTTP 页面。

---

## Referrer-Policy 策略

`Referrer-Policy` HTTP 响应头或 `<meta>` 标签可以控制 Referer 的发送行为。

### 9 种策略详解

| 策略 | 行为 | 示例 |
|------|------|------|
| `no-referrer` | 从不发送 Referer | HTTPS→HTTP 不发送 |
| `no-referrer-when-downgrade` | HTTPS→HTTP 不发送；其他情况发送完整 URL | **默认策略** |
| `origin` | 只发送 origin（协议+域名+端口） | `https://example.com/` |
| `origin-when-cross-origin` | 同源发送完整 URL；跨域只发送 origin | 同源: `https://example.com/page?q=1`<br>跨域: `https://example.com/` |
| `same-origin` | 同源发送完整 URL；跨域不发送 | 同源: 完整 URL<br>跨域: 不发送 |
| `strict-origin` | 只发送 origin；HTTPS→HTTP 不发送 | `https://example.com/` 或 不发送 |
| `strict-origin-when-cross-origin` | 同源完整 URL；跨域只发送 origin；HTTPS→HTTP 不发送 | 同源: 完整<br>跨 HTTPS→HTTP: 不发送 |
| `unsafe-url` | 始终发送完整 URL（不管安全上下文） | 完整 URL，含 path 和 query |

### 策略选择决策树

```
需要发送 Referer？
    ↓
HTTPS → HTTP 跳转？
    ↓ yes → 使用 strict-origin / no-referrer
    ↓ no
需要完整 URL 还是只 origin？
    ↓
完整 URL → same-origin（限制同源）/ origin-when-cross-origin（允许跨域 origin）
    ↓
只 origin → origin / strict-origin
    ↓
不需要 → no-referrer
```

### 设置方法

#### 1. HTTP 响应头

```http
Referrer-Policy: origin-when-cross-origin
```

#### 2. HTML `<meta>` 标签

```html
<meta name="referrer" content="origin-when-cross-origin">
```

#### 3. 链接属性

```html
<!-- 单个链接禁用 Referer -->
<a href="https://external.com" rel="noreferrer">链接</a>

<!-- 单个链接设置策略 -->
<a href="https://external.com" referrerpolicy="strict-origin-when-cross-origin">链接</a>
```

#### 4. JavaScript

```javascript
// 设置全局策略
Object.defineProperty(document, 'referrer', {
  get: () => 'https://custom-referrer.com'
});

// fetch 请求时设置
fetch(url, {
  referrer: 'https://custom-referrer.com',
  referrerPolicy: 'strict-origin-when-cross-origin'
});
```

---

## 常见使用场景

### 1. 流量分析（Analytics）

网站使用 Referer 统计用户从哪些来源页面访问。

```javascript
// 简单统计
const referrer = document.referrer;
if (referrer.includes('google.com')) {
  console.log('来自 Google 搜索');
}
```

### 2. 防盗链（Hotlink Protection）

检查 Referer 防止其他网站直接链接你的资源。

```nginx
# Nginx 配置
location ~* \.(jpg|png|gif)$ {
    valid_referers none blocked ~.google. ~.bing. mysite.com;
    if ($invalid_referer) {
        return 403;
    }
}
```

```apache
# Apache .htaccess
RewriteEngine On
RewriteCond %{HTTP_REFERER} !^$
RewriteCond %{HTTP_REFERER} !^https://mysite.com [NC]
RewriteRule \.(jpg|png|gif)$ - [F]
```

### 3. 安全策略

根据来源设置访问权限。

```javascript
// 仅允许同源和特定域名访问 API
const allowedOrigins = ['https://mysite.com', 'https://partner.com'];
const referrer = new URL(document.referrer).origin;

if (!allowedOrigins.includes(referrer)) {
  // 拒绝访问或重定向
}
```

### 4. 爬虫识别

识别请求来源，过滤爬虫流量。

```python
# Flask 示例
@app.route('/api/data')
def get_data():
    referer = request.headers.get('Referer', '')
    if 'google.com' in referer:
        # 可能是 Googlebot
        pass
    elif referer == '':
        # 直接访问，可能是爬虫
        pass
    return jsonify(data)
```

---

## 安全注意事项

### ⚠️ Referer 不可信任

```javascript
// 攻击者可以伪造 Referer 头部
// 不要仅依赖 Referer 做安全验证！
const isInternal = req.headers.referer.includes('mysite.com');
// 这是不安全的，因为 Referer 可以被伪造
```

### ⚠️ Referer 可能泄露敏感信息

| 风险场景 | 泄露内容 |
|----------|----------|
| URL 包含查询参数 | `?token=xxx`, `?user_id=123` |
| URL 路径包含 ID | `/user/123/profile` |
| URL 包含搜索词 | `?q=隐私搜索词` |

### ✅ 安全最佳实践

1. **使用 CSRF Token**：不要仅依赖 Referer 验证
2. **敏感操作使用 POST**：减少 URL 中暴露敏感信息
3. **设置合适的 Referrer-Policy**：默认 `no-referrer-when-downgrade` 是安全的起点
4. **登录后的 URL 不要包含敏感信息**：使用 POST 或在 body 中传递

```html
<!-- 安全：不在 URL 中暴露 token -->
<form action="/api/action" method="POST">
  <input type="hidden" name="csrf_token" value="xxx">
  <button type="submit">执行敏感操作</button>
</form>
```

---

## 工具与调试

### 浏览器开发者工具

```javascript
// 查看当前页面的 Referer
console.log('Referer:', document.referrer);

// 查看当前页面设置的 Referrer-Policy
console.log('Policy:', document.referrerPolicy);
```

在 Network 面板中，点击任意请求，查看 **Headers → General → Referer-Policy**。

### curl 测试

```bash
# 模拟带 Referer 的请求
curl -H "Referer: https://source.com/page" https://target.com/api

# 查看响应头中的 Referrer-Policy
curl -I -H "Referer: https://source.com/page" https://target.com
```

### Referrer-Policy 测试工具

```javascript
// 在浏览器控制台运行，测试各策略效果
const policies = [
  'no-referrer',
  'no-referrer-when-downgrade',
  'origin',
  'origin-when-cross-origin',
  'same-origin',
  'strict-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url'
];

policies.forEach(policy => {
  console.log(`Testing: ${policy}`);
  // 打开新窗口测试不同策略
});
```

---

## 参考资料

- [MDN: Referer header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referer)
- [MDN: Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)
- [HTML Spec: Referrer attribute](https://html.spec.whatwg.org/multipage/links.html#link-type-noreferrer)
- [Chromium Referrer-Policy Documentation](https://www.chromium.org/pages/security/referrer-policy)
