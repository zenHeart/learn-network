# CORS 多个 Access-Control-Allow-Origin 为什么不会报错？

> 本文深入剖析 CORS 规范与浏览器实现的差异，解释为什么服务器返回多个 `Access-Control-Allow-Origin` 头部会导致浏览器报错，并提供正确的多域名 CORS 配置方案。

## 目录

1. [核心结论](#核心结论)
2. [CORS 规范 vs 浏览器实现](#cors-规范-vs-浏览器实现)
3. [实际报错情况](#实际报错情况)
4. [为什么不能多个值？](#为什么不能多个值)
5. [正确做法：动态回显 Origin](#正确做法动态回显-origin)
6. [常见踩坑场景](#常见踩坑场景)
7. [代码示例](#代码示例)
8. [参考资料](#参考资料)

---

## 核心结论

```
┌─────────────────────────────────────────────────────────────────┐
│                      ⚠️ 关键发现                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   CORS 规范  ──── 允许 ────▶  多个 Access-Control-Allow-Origin │
│                                                                 │
│   浏览器实现 ──── 不允许 ──▶  多个 Access-Control-Allow-Origin  │
│                           (所有主流浏览器均不支持)                │
│                                                                 │
│   服务器尝试返回多个值  ──▶  浏览器报错：                       │
│   "Multiple CORS header Access-Control-Allow-Origin not allowed"│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**记住这个原则：CORS 是浏览器的安全策略，规范只是纸面约定，浏览器实现才是真相。**

---

## CORS 规范 vs 浏览器实现

### 2.1 规范说了什么？

根据 W3C CORS 规范和 Fetch 标准，`Access-Control-Allow-Origin` 的 ABNF 定义为：

```abnf
Access-Control-Allow-Origin = origin-or-null / "*"
```

这意味着规范理论上允许：
- 单个 origin（如 `https://example.com`）
- `null` 值
- `*` 通配符（表示允许所有来源）

**规范并未明确禁止列出多个 origin**，但也从未定义「多个 origin 该如何表示」的语法。

### 2.2 浏览器实际做了什么？

| 浏览器 | 是否支持多值？ | 实际行为 |
|--------|--------------|---------|
| Chrome | ❌ 不支持 | 抛出 CORS 错误 |
| Firefox | ❌ 不支持 | 抛出 CORS 错误 |
| Safari | ❌ 不支持 | 抛出 CORS 错误 |
| Edge | ❌ 不支持 | 抛出 CORS 错误 |

**结论：所有主流浏览器均不支持多个 `Access-Control-Allow-Origin` 值。**

### 2.3 规范与实现的鸿沟

```
┌──────────────────────────────  CORS 规范  ──────────────────────────────┐
│                                                                             │
│   "允许的值为：origin、null、或 *"                                          │
│   "origin 可以是多个"（未明确禁止，但未定义语法）                              │
│                                                                             │
└─────────────────────────────────── ▼ ────────────────────────────────────┘
                                    鸿沟
┌─────────────────────────────────── ▼ ────────────────────────────────────┐
│                              浏览器实现                                     │
│                                                                             │
│   "我们只认单值或 *，多值直接报错"                                            │
│   "即使服务器返回了多个值，浏览器也只取第一个"                                  │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 实际报错情况

### 3.1 错误信息

如果服务器返回了多个 `Access-Control-Allow-Origin` 头部，浏览器会报错：

> **Chrome / Edge（Chromium 内核）：**
> ```
> Access to fetch at 'https://api.example.com/data' from origin 
> 'https://client.example.com' has been blocked by CORS policy: 
> Multiple CORS header 'Access-Control-Allow-Origin' not allowed
> ```

> **Firefox：**
> ```
> CORS header 'Access-Control-Allow-Origin' has more than one value, 
> but request Credentials mode is 'include', and the value of 
> 'Access-Control-Allow-Origin' header should be '*' when request's 
> credentials mode is 'include', or it should be the same as the origin.
> ```

> **Safari：**
> ```
> Blocked by CORS policy: Multiple 'Access-Control-Allow-Origin' headers 
> are not allowed for cross-origin request.
> ```

### 3.2 什么情况会触发？

以下服务器配置都会触发浏览器报错：

```nginx
# 错误配置 1：尝试用逗号分隔多个 origin
add_header Access-Control-Allow-Origin "https://a.com,https://b.com";

# 错误配置 2：重复发送多个头部
add_header Access-Control-Allow-Origin "https://a.com";
add_header Access-Control-Allow-Origin "https://b.com";

# 错误配置 3：同时返回 * 和具体 origin
add_header Access-Control-Allow-Origin "*";
add_header Access-Control-Allow-Origin "https://a.com";
```

### 3.3 浏览器如何检查？

浏览器的 CORS 检查逻辑如下：

```
浏览器收到响应
      │
      ▼
检查 Access-Control-Allow-Origin 头部数量
      │
      ├─── 0 个 ──▶ 请求失败（缺少必需头部）
      │
      ├─── 1 个 ──▶ 检查值是否为 * 或与请求 origin 匹配
      │                ├─── 匹配 ──▶ 请求成功
      │                └─── 不匹配 ──▶ 请求失败
      │
      └─── 多个 ──▶ 请求失败，报错 "Multiple CORS header not allowed"
```

---

## 为什么不能多个值？

### 4.1 CORS 检查需要明确性

浏览器的同源安全策略要求「二元结果」：

```
请求来源是"允许"还是"不允许"？
      │
      ├─── Yes ──▶ 允许访问响应数据
      │
      └─── No ──▶ 阻止访问（即使数据已返回）
```

如果允许列出多个 origin，浏览器无法回答这个简单问题：「这个响应到底允不允许当前来源？」

### 4.2 歧义问题

考虑以下场景：

```
请求 Origin: https://evil.com
Access-Control-Allow-Origin: https://a.com, https://b.com
```

浏览器该怎么做？
- `https://evil.com` 不在列表中 → 拒绝？
- 但响应体已经被加载到内存中 → 安全风险

### 4.3 安全考虑

1. **简化检查逻辑**：单值检查 O(1) 复杂度，多值需要遍历匹配
2. **防止配置错误**：如果允许多值，开发者可能不小心暴露敏感数据给错误来源
3. **一致性问题**：不同的多值表示法（逗号、空格、多个头部）会导致不一致的行为

### 4.4 凭证（Credentials）与多值的冲突

当请求包含凭证（如 cookies）时：

```
如果 Access-Control-Allow-Origin: *
    └──▶ 浏览器拒绝（不能对带凭证请求使用 *）
    
如果 Access-Control-Allow-Origin: "https://a.com, https://b.com"
    └──▶ 浏览器不知道该信任哪一个
```

规范明确要求带凭证请求时，`Access-Control-Allow-Origin` 必须精确匹配请求 origin，不支持通配符。

---

## 正确做法：动态回显 Origin

### 5.1 核心思路

服务器不应该「硬编码」允许的 origin 列表在响应中，而是：
1. 检查请求的 `Origin` 是否在白名单中
2. 如果在白名单中，将请求的 `Origin` 原样返回

### 5.2 动态回显的优势

```
┌─────────────────────────────────────────────────────────────────┐
│                       动态回显 vs 硬编码                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   硬编码（错误）：                                               │
│   Access-Control-Allow-Origin: "https://a.com,https://b.com"   │
│   ❌ 浏览器报错                                                   │
│                                                                 │
│   动态回显（正确）：                                             │
│   请求 Origin: https://a.com                                   │
│   Access-Control-Allow-Origin: https://a.com  ✓                │
│                                                                 │
│   请求 Origin: https://b.com                                   │
│   Access-Control-Allow-Origin: https://b.com  ✓                │
│                                                                 │
│   请求 Origin: https://evil.com                                │
│   Access-Control-Allow-Origin: (不返回该头部)                   │
│   浏览器阻止请求  ✓                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 安全注意事项

使用动态回显时，必须严格检查 origin：

```js
// ✅ 正确：在白名单中才回显
if (allowedOrigins.includes(requestOrigin)) {
  response.setHeader("Access-Control-Allow-Origin", requestOrigin);
}

// ❌ 危险：直接回显任何 origin（等于 *）
// 这会让任何网站都能访问你的资源
response.setHeader("Access-Control-Allow-Origin", requestOrigin);
```

---

## 常见踩坑场景

### 场景 1：Nginx 配置多值

```nginx
# 错误 ❌
location /api/ {
    add_header Access-Control-Allow-Origin "https://a.com,https://b.com";
}

# 正确 ✅（需要用 Lua 或 map 配合）
set $cors_origin "";
if ($http_origin ~* "^https://(a|b)\.com$") {
    set $cors_origin $http_origin;
}
add_header Access-Control-Allow-Origin $cors_origin;
```

### 场景 2：Express.js 错误配置

```js
// 错误 ❌
app.use(cors({
  origin: ["https://a.com", "https://b.com"],  // cors 包会处理，但直接设置头部不行
  credentials: true
}));

// 实际发送的是单个值，不是多个头部

// ❌ 危险：直接设置多个头部
res.set({
  "Access-Control-Allow-Origin": "https://a.com",
  "Access-Control-Allow-Origin": "https://b.com"  // 这会覆盖第一个！
});
```

### 场景 3：认为多个头部 = 多个值

```js
// 错误 ❌：第二个会覆盖第一个
res.setHeader("Access-Control-Allow-Origin", "https://a.com");
res.setHeader("Access-Control-Allow-Origin", "https://b.com");
// 最终值：只有 "https://b.com"

res.append("Access-Control-Allow-Origin", "https://a.com");
res.append("Access-Control-Allow-Origin", "https://b.com");
// 有些框架的 append 会创建多个头部 → 浏览器报错
```

### 场景 4：CDN 保留多域名配置

```js
// 错误 ❌：CDN 配置面板允许添加多个 origin
// 但 CDN 转发到源站时会变成多个头部
const cdnConfig = {
  allowedOrigins: ["https://a.com", "https://b.com", "https://c.com"]
};
// CDN 内部实现可能产生多个 Access-Control-Allow-Origin 头部
```

---

## 代码示例

### 6.1 Node.js / Express

```js
const allowedOrigins = [
  "https://a.com",
  "https://b.com",
  "https://c.com"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  
  next();
});
```

### 6.2 Nginx（使用 map）

```nginx
# 在 http 块中定义允许的 origin 列表
map $http_origin $cors_origin {
    "~^https://(a|b|c)\.com$" $http_origin;
    default "";
}

server {
    location /api/ {
        add_header Access-Control-Allow-Origin $cors_origin;
        add_header Access-Control-Allow-Credentials "true";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
}
```

### 6.3 Python / Flask

```python
ALLOWED_ORIGINS = [
    "https://a.com",
    "https://b.com",
    "https://c.com"
]

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    
    return response
```

### 6.4 Go / net/http

```go
var allowedOrigins = map[string]bool{
    "https://a.com": true,
    "https://b.com": true,
    "https://c.com": true,
}

func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        
        if allowedOrigins[origin] {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        }
        
        next.ServeHTTP(w, r)
    })
}
```

---

## 常见问题解答

### Q1：为什么 CORS 规范不禁止多值？

CORS 规范（Fetch 标准）在设计时保持了灵活性，没有明确禁止多值语法。但也从未定义多值的表示方法（是逗号分隔？还是多个头部？）。这种「未定义」被浏览器厂商解读为「不支持」。

### Q2：使用通配符 * 不就行了吗？

对于不需要凭证的请求，`*` 是可行的。但以下情况不能用 `*`：
- 请求需要携带 Cookie（`credentials: include`）
- 需要根据不同来源返回不同数据
- 响应包含用户特定数据

### Q3：CDN 如何处理多域名 CORS？

CDN 通常需要配置多个 origin 回源，但对外只返回一个 `Access-Control-Allow-Origin`。CDN 配置面板可能让你输入多个域名，内部实现应该是动态回显逻辑。

### Q4：同一个接口能否同时支持多个不同来源？

可以，使用动态回显机制。服务器检查请求 origin 是否在白名单中，是则返回该 origin。

### Q5：`null` 作为 Access-Control-Allow-Origin 有什么风险？

`null` 值会允许 `null` origin 的请求，这在以下场景中有安全风险：
- 本地 HTML 文件通过 `file://` 协议打开
- 沙盒 iframe
- 某些重定向场景

除非明确需要，否则不建议允许 `null`。

---

## 参考资料

1. **MDN - CORS Errors**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors/CORSMultipleAllowOriginNotAllowed
2. **PortSwigger - CORS Access Control Allow Origin**: https://portswigger.net/web-security/cors/access-control-allow-origin
3. **W3C CORS Specification**: https://fetch.spec.whatwg.org/#http-cors-protocol
4. **MDN - HTTP CORS**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
5. **RFC 9110 - HTTP Semantics**: https://www.rfc-editor.org/rfc/rfc9110.html

---

## 总结

| 场景 | 正确做法 |
|------|---------|
| 单域名 | `Access-Control-Allow-Origin: https://example.com` |
| 所有域名（公开资源） | `Access-Control-Allow-Origin: *` |
| 多个域名 | 动态回显：检查后返回匹配的 origin |
| 带凭证请求 | 必须精确匹配，不能用 `*` |

**记住：CORS 规范允许 ≠ 浏览器支持。永远使用动态回显处理多域名场景。**
