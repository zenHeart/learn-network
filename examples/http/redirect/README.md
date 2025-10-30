# HTTP 重定向示例项目

基于 Koa.js 框架的 HTTP 重定向机制演示项目，涵盖了所有常见的重定向类型和实际应用场景。

## 🎯 项目特色

- **完整的重定向类型覆盖**：包含所有 HTTP 3xx 状态码的实际演示
- **交互式学习体验**：每个重定向类型都配有详细说明和实时测试
- **优先级对比测试**：演示 HTTP 状态码、Meta Refresh 和 JavaScript 重定向的优先级
- **实际应用场景**：OAuth2.0、缓存协商、表单提交后重定向等真实案例
- **可视化界面**：美观的 Web 界面，支持实时倒计时和进度条
- **详细的技术文档**：包含 API 文档、curl 示例和最佳实践

## 📚 重定向知识点

### 1. 重定向流程
1. 客户端发起请求
2. 服务器响应重定向状态码（3xx）
3. 客户端接收响应并解析响应头部的 Location 字段
4. 客户端根据 Location 字段的 URL 发起新的请求

### 2. 重定向类别

#### 永久重定向
- **301 Moved Permanently**
  - GET 方法不会发生变更
  - 其他请求会变更为 GET
  - 适用于网站迁移、URL 永久变更

- **308 Permanent Redirect**
  - 方法和请求体都不会变更
  - 更严格的永久重定向

#### 临时重定向
- **302 Found**
  - GET 方法不会发生变更
  - 其他请求会变更为 GET
  - 常用于 OAuth2.0 授权码模式

- **303 See Other**
  - 无论什么请求，都会变更为 GET
  - 用于 PUT 或 POST 请求完成之后重定向

- **307 Temporary Redirect**
  - 方法和请求体都不会变更
  - 优先级高于 302

#### 特殊重定向
- **300 Multiple Choices**
  - 用于资源有多个地址
  - 不常用：所有选项在消息主体的 HTML 页面中列出
  - 鼓励在 Link 标头中加入机器可读的 rel=alternate

- **304 Not Modified**
  - 用于缓存协商
  - 基于 ETag 和 Last-Modified 头部

### 3. 重定向策略

#### HTTP 状态码重定向（最高优先级）
```http
HTTP/1.1 302 Found
Location: https://example.com/new-page
```

#### Meta Refresh 重定向（中等优先级）
```html
<head>
  <meta http-equiv="Refresh" content="5; URL=https://example.com/" />
</head>
```

#### JavaScript 重定向（最低优先级）
```javascript
// 方法一：最常用
window.location.href = "https://example.com/";

// 方法二：替换当前页面
window.location.replace("https://example.com/");

// 方法三：编程式导航
window.location.assign("https://example.com/");
```

### 4. 重定向优先级
状态码重定向优先级高于 Meta Refresh 和 JavaScript 重定向。

## 🚀 快速开始

### 环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装依赖
```bash
npm install
```

### 启动服务器
```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

### 访问应用
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 📖 使用指南

### 主要页面

1. **首页** `/` - 重定向示例导航
2. **技术文档** `/docs` - 详细的 API 文档
3. **Meta Refresh 演示** `/meta-refresh.html` - HTML 重定向
4. **JavaScript 演示** `/js-redirect.html` - JS 重定向
5. **优先级测试** `/priority-test.html` - 重定向优先级对比

### API 端点

#### 永久重定向测试
```bash
# 301 GET - 方法保持不变
curl -v http://localhost:3000/redirect/301/get

# 301 POST - 方法变为 GET
curl -v -X POST http://localhost:3000/redirect/301/post

# 308 GET - 方法保持不变
curl -v http://localhost:3000/redirect/308/get

# 308 POST - 方法和请求体保持不变
curl -v -X POST http://localhost:3000/redirect/308/post
```

#### 临时重定向测试
```bash
# 302 OAuth2.0 模拟
curl -v "http://localhost:3000/redirect/302/oauth?redirect_uri=http://example.com&state=test123"

# 303 表单提交后重定向
curl -v -X POST http://localhost:3000/redirect/303/post

# 307 严格保持方法
curl -v -X POST http://localhost:3000/redirect/307/post
```

#### 特殊重定向测试
```bash
# 300 多选项资源
curl -v http://localhost:3000/redirect/300

# 304 缓存协商
curl -v -H "If-None-Match: W/\"123456789\"" http://localhost:3000/redirect/304
```

## 🏗️ 项目结构

```
redirect/
├── app.js                    # 主应用文件和路由配置
├── package.json              # 项目配置和依赖
├── README.md                 # 项目文档
├── routes/                   # 路由模块
│   ├── permanent.js          # 永久重定向（301, 308）
│   ├── temporary.js          # 临时重定向（302, 303, 307）
│   └── special.js            # 特殊重定向（300, 304）
└── public/                   # 静态文件
    ├── meta-refresh.html     # Meta Refresh 演示页面
    ├── js-redirect.html      # JavaScript 重定向演示
    └── priority-test.html    # 重定向优先级测试页面
```

## 🧪 测试场景

### 1. 方法变更测试
观察不同状态码对 HTTP 方法的影响：
- 301/302: POST → GET
- 303: 所有方法 → GET  
- 307/308: 方法保持不变

### 2. OAuth2.0 授权流程
模拟真实的 OAuth2.0 授权码模式：
```
GET /redirect/302/oauth?redirect_uri=callback&state=csrf_token
↓
302 Found
Location: callback?code=auth_code&state=csrf_token
```

### 3. 缓存协商机制
测试 HTTP 缓存的 ETag 和 Last-Modified 头部：
- 首次请求：200 + 完整内容
- 条件请求：304 Not Modified

### 4. 优先级验证
在同一页面测试多种重定向方式的优先级：
1. HTTP 状态码（立即生效）
2. Meta Refresh（延时生效）
3. JavaScript（最后生效）

## 🔧 技术栈

- **后端框架**: Koa.js 2.x
- **路由管理**: koa-router
- **静态文件服务**: koa-static
- **请求体解析**: koa-bodyparser
- **前端技术**: 原生 HTML/CSS/JavaScript

## 🌟 特色功能

### 1. 可视化倒计时
Meta Refresh 和 JavaScript 重定向页面包含：
- 实时倒计时显示
- 进度条动画
- 交互式控制按钮

### 2. 详细日志输出
服务器端记录所有重定向请求：
- 请求时间和方法
- 请求体内容
- 重定向类型和目标

### 3. 多格式响应
目标页面支持多种格式：
- HTML: 默认格式，用户友好界面
- JSON: API 调用格式
- XML: 标准化数据格式

### 4. 响应式设计
所有页面都采用响应式设计，支持各种设备访问。

## 🤝 最佳实践

### 1. 选择合适的状态码
- **301**: 永久性 URL 变更，SEO 友好
- **302**: 临时重定向，保持原 URL 权重
- **303**: POST/PUT 后查看结果页面
- **307**: 需要保持原始请求方法时使用
- **308**: 永久重定向且保持方法不变

### 2. 重定向链优化
- 避免多次重定向（重定向链）
- 使用绝对 URL 而不是相对 URL
- 考虑 SEO 影响和用户体验

### 3. 安全考虑
- 验证重定向目标 URL
- 防止开放重定向漏洞
- 在 OAuth 流程中使用 state 参数

## 📈 扩展建议

1. **添加 HTTPS 重定向示例**
2. **集成真实的 OAuth2.0 提供商**
3. **增加性能监控和分析**
4. **支持自定义重定向规则配置**
5. **添加国际化支持**

## 📝 参考资料

- [MDN: HTTP 重定向](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Redirections)
- [RFC 7231: HTTP/1.1 Semantics and Content](https://tools.ietf.org/html/rfc7231)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [HTTP 缓存 RFC 7234](https://tools.ietf.org/html/rfc7234)

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 👨‍💻 作者

zenHeart - learn-network 项目

---

**快速体验**: 立即访问 [http://localhost:3000](http://localhost:3000) 开始探索 HTTP 重定向的世界！