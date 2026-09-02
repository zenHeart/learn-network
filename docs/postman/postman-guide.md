# Postman 完整使用指南

> Postman 是 API 开发的标配工具，本文档涵盖从基础到进阶的完整使用教程。

## 目录

- [Postman 核心功能介绍](#postman-核心功能介绍)
- [环境变量和全局变量](#环境变量和全局变量)
- [Collections 和 Folders 组织](#collections-和-folders-组织)
- [常用快捷键](#常用快捷键)
- [请求类型：GETPOSTPUTDELETEPATCH](#请求类型getpostputdeletepatch)
- [认证方式：Bearer-Tokenbasic-authandapi-key](#认证方式bearer-tokenbasic-authandapi-key)
- [Pre-request-Script-和-Tests-脚本](#pre-request-script-和-tests-脚本)
- [Mock-Server-使用](#mock-server-使用)
- [常用技巧和最佳实践](#常用技巧和最佳实践)

---

## Postman 核心功能介绍

### 界面概览

Postman 主界面分为以下区域：

| 区域 | 功能 |
|------|------|
| **侧边栏 (Sidebar)** | 左侧：导航 Collections、Folders、环境变量 |
| **工具栏 (Toolbar)** | 顶部：新建、导入、Runner、Mock Server 等 |
| **请求构建器 (Builder)** | 中间：填写请求参数、Headers、Body 等 |
| **响应查看器 (Response)** | 右侧/下方：查看响应内容、状态码、耗时 |

### 核心功能一览

- **请求构建器**：支持 GET/POST/PUT/DELETE/PATCH 等所有 HTTP 方法
- **环境变量**：支持多套环境（开发/测试/生产），动态切换
- **Collections**：将相关请求组织成集合，方便管理
- **Scripts**：Pre-request Script 和 Tests，支持 JavaScript 自动化
- **Mock Server**：模拟 API 响应，无需后端即可测试
- **Runner**：批量执行 Collection 中的请求，生成测试报告
- **Code Generation**：将请求生成多种语言代码（cURL、Python、JS 等）

---

## 环境变量和全局变量

### 什么是环境变量？

环境变量是 Postman 中最重要的功能之一，允许你在不同环境（开发、测试、生产）之间切换 API 地址和其他配置，而无需修改请求本身。

### 创建环境

1. 点击右上角 **⚙️ Settings**（齿轮图标）
2. 选择 **Manage Environments**
3. 点击 **Add** 创建新环境

**示例：开发/测试/生产三套环境**

| 环境名 | 变量名 | 值（示例） |
|--------|--------|-----------|
| Development | `baseUrl` | `http://localhost:3000` |
| | `apiKey` | `dev-key-123` |
| Staging | `baseUrl` | `https://staging-api.example.com` |
| | `apiKey` | `staging-key-456` |
| Production | `baseUrl` | `https://api.example.com` |
| | `apiKey` | `prod-key-789` |

### 使用变量

在请求中使用 `{{variableName}}` 语法引用变量：

```
GET {{baseUrl}}/users
Headers:
  Authorization: Bearer {{apiKey}}
```

### 全局变量

全局变量在所有环境中都可用，适合存放最通用的配置：

1. **Manage Environments** → **Globals**
2. 添加变量，例如 `token` = `your-jwt-token`

```javascript
// 在 Scripts 中也可以设置全局变量
pm.globals.set("token", "new-token-value");
pm.globals.get("token");
pm.globals.unset("token");
```

### 环境变量 vs 全局变量

| 特性 | 环境变量 | 全局变量 |
|------|----------|----------|
| 作用域 | 仅当前环境 | 所有环境 |
| 优先级 | 高（可覆盖全局） | 低 |
| 适用场景 | 环境相关的 API 地址 | 通用 Token、User ID |

### 在 Scripts 中操作变量

```javascript
// Pre-request Script 或 Tests 中
// 获取环境变量
const baseUrl = pm.environment.get("baseUrl");

// 设置环境变量
pm.environment.set("authToken", "Bearer xyz123");

// 获取全局变量
const globalToken = pm.globals.get("token");

// 清除变量
pm.environment.unset("tempToken");
```

---

## Collections 和 Folders 组织

### Collections

Collection 是 Postman 中组织请求的最高层级，相当于一个项目或功能模块。

**创建 Collection：**
1. 侧边栏点击 **+ New Collection** 或右键 → **New Collection**
2. 填写名称和描述
3. 将请求拖入 Collection

### Folders（文件夹）

Folder 是 Collection 内的子文件夹，用于进一步分组：

```
📁 User API (Collection)
├── 📁 Authentication
│   ├── POST /login
│   └── POST /register
├── 📁 Profile
│   ├── GET /profile
│   └── PATCH /profile
└── 📁 Orders
    ├── GET /orders
    └── GET /orders/:id
```

### Collection 变量

在 Collection 的 **Variables** 标签中定义变量，该 Collection 内所有请求共享：

```javascript
// Collection 变量示例
basePath: https://api.example.com/v1
timeout: 5000
```

### Collection 运行器（Runner）

使用 Collection Runner 批量执行集合中的请求：

1. 点击工具栏 **Runner** 或 `Ctrl + Shift + R`
2. 选择要执行的 Collection
3. 设置迭代次数、延迟、迭代数据（从 CSV 文件）
4. 点击 **Run**

```javascript
// 在 Tests 中可以使用 pm.collectionVariables
pm.collectionVariables.get("basePath");
```

### 导入/导出 Collection

**导出：**
右键 Collection → **Export → Choose format (Collection v2.1)**

**导入：**
`Import` 按钮 → 选择文件或粘贴 URL/JSON

---

## 常用快捷键

### Windows / Mac 快捷键

| 功能 | Windows | Mac |
|------|---------|-----|
| 新建请求 | `Ctrl + N` | `⌘ + N` |
| 新建 Collection | `Ctrl + Shift + N` | `⌘ + Shift + N` |
| 保存请求 | `Ctrl + S` | `⌘ + S` |
| 发送请求 | `Ctrl + Enter` | `⌘ + Enter` |
| 格式化 JSON | `Ctrl + Shift + J` | `⌘ + Shift + J` |
| 切换标签页 | `Ctrl + Tab` | `⌘ + Shift + ]` |
| 关闭标签页 | `Ctrl + W` | `⌘ + W` |
| 打开环境设置 | `Ctrl + Shift + E` | `⌘ + Shift + E` |
| 打开 Collection Runner | `Ctrl + Shift + R` | `⌘ + Shift + R` |
| 全屏切换 | `Ctrl + Shift + X` | `⌘ + Shift + X` |
| 搜索请求 | `Ctrl + F` | `⌘ + F` |
| 复制请求 | `Ctrl + D` | `⌘ + D` |
| Duplicate 请求 | `Ctrl + Shift + D` | `⌘ + Shift + D` |

### 快捷键设置

`Settings` → `Keyboard Shortcuts` 可查看和自定义所有快捷键。

---

## 请求类型：GET/POST/PUT/DELETE/PATCH

### GET

**用途**：获取资源，不修改数据

**特点**：
- 参数在 URL 中（Query Params）
- 无 Request Body
- 幂等（多次请求结果相同）

```
GET https://api.example.com/users?page=1&limit=20
```

### POST

**用途**：创建新资源

**特点**：
- 参数在 Body 中（通常 JSON）
- 非幂等（多次请求可能创建多个资源）
- 常用于登录、注册、提交表单

```javascript
// POST 请求示例
// Body (raw, JSON):
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "securepass123"
}
```

### PUT

**用途**：完整替换资源（幂等）

**特点**：
- 发送完整资源数据
- 幂等：多次调用结果相同
- 如果资源不存在，可能创建

```javascript
// PUT 请求示例 - 更新用户信息（完整替换）
// URL: PUT https://api.example.com/users/123
// Body:
{
  "username": "alice",
  "email": "alice.new@example.com",
  "password": "newpass",
  "age": 28,
  "city": "Shanghai"
}
```

### DELETE

**用途**：删除资源

**特点**：
- 幂等：删除已删除的资源应返回 404 或 200
- 通常无 Body，或 Body 包含确认信息

```
DELETE https://api.example.com/users/123
```

### PATCH

**用途**：部分更新资源（非幂等）

**特点**：
- 只发送需要修改的字段
- 不影响其他字段
- 与 PUT 的"完整替换"形成对比

```javascript
// PATCH 请求示例 - 只更新邮箱
// URL: PATCH https://api.example.com/users/123
// Body:
{
  "email": "alice.updated@example.com"
}
```

### 请求对比表

| 方法 | 语义 | Body | 幂等 | 典型场景 |
|------|------|------|------|----------|
| GET | 获取 | 无 | ✅ | 查询列表、详情 |
| POST | 创建 | 有 | ❌ | 注册、登录、提交 |
| PUT | 全量替换 | 有 | ✅ | 全量更新资源 |
| DELETE | 删除 | 可选 | ✅ | 删除资源 |
| PATCH | 部分更新 | 有 | ❌ | 更新单个字段 |

### 设置请求参数

**Params（Query Parameters）**：
点击 Params 标签，在表格中添加 key-value，Postman 会自动拼接到 URL。

**Headers**：
在 Headers 标签中填写，常用：
```
Content-Type: application/json
Authorization: Bearer {{token}}
Accept: application/json
```

**Body**：
- **none**：无 Body
- **form-data**：表单数据（文件上传用）
- **x-www-form-urlencoded**：URL 编码表单
- **raw**：原始文本（JSON、XML、Text、HTML）
- **binary**：上传二进制文件
- **GraphQL**：GraphQL 查询

---

## 认证方式：Bearer Token/Basic Auth/API Key

### Bearer Token

最常用的 JWT/OAuth2 认证方式。

**设置方式：**

1. **方式一：Headers**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. **方式二：Auth 标签**
- 请求的 **Auth** 标签 → Type 选择 **Bearer Token**
- Token 填写 `{{authToken}}`

```javascript
// Auth 标签设置
// Token: {{bearerToken}}
// Postman 会自动生成 Header:
// Authorization: Bearer <token值>
```

### Basic Auth

用户名+密码 Base64 编码，适用于简单场景。

**设置方式：**
- Auth 标签 → Type 选择 **Basic Auth**
- 填写 Username 和 Password

```
Header 自动生成：
Authorization: Basic YWRtaW46YWRtaW5wd2Q=
```

### API Key

某些 API 要求在 Header 或 Query Param 中传递 API Key。

**设置方式：**

1. **方式一：Header**
```
X-API-Key: your-api-key-here
```

2. **方式二：Query Parameter**
在 URL 后自动添加 `?api_key=your-key`

**Auth 标签设置：**
- Auth → Type 选择 **API Key**
- Key: `api_key`（根据实际 API 调整）
- Value: `{{apiKey}}`
- Add to: Header 或 Query Params

### OAuth 2.0

OAuth 2.0 是更完整的授权框架，支持授权码、隐式、密码凭证、客户端凭证四种模式。

**配置步骤：**
1. Auth → Type 选择 **OAuth 2.0**
2. 配置各项参数：
   - Callback URL
   - Auth URL
   - Access Token URL
   - Client ID / Client Secret
   - Scope
   - State

```javascript
// 配置完成后点击 "Get New Access Token"
// Postman 会自动处理完整的 OAuth 流程
// 令牌会自动添加到请求 Header
```

### 认证方式对比

| 方式 | 适用场景 | 安全性 |
|------|----------|--------|
| Bearer Token | JWT / OAuth2 令牌认证 | 高 |
| Basic Auth | 简单用户密码认证 | 低（配合 HTTPS） |
| API Key | 接口级密钥认证 | 中 |
| OAuth 2.0 | 第三方授权登录 | 高 |

---

## Pre-request Script 和 Tests 脚本

### 概念

- **Pre-request Script**：请求发送前执行的 JavaScript 代码
- **Tests**：请求发送后执行的 JavaScript 代码，用于验证响应

### Pre-request Script 示例

```javascript
// 1. 生成时间戳
const timestamp = Date.now();
pm.environment.set("timestamp", timestamp);

// 2. 生成随机 ID
const randomId = Math.random().toString(36).substr(2, 9);
pm.environment.set("requestId", randomId);

// 3. 动态签名（示例）
const secret = pm.environment.get("signSecret");
const sign = CryptoJS.HmacSHA256(timestamp, secret).toString();
pm.environment.set("sign", sign);

// 4. 打印日志
console.log("Request ID:", randomId);
```

### Tests 脚本示例

```javascript
// 1. 检查状态码
pm.test("状态码为 200", function() {
    pm.response.to.have.status(200);
});

// 2. 检查响应包含特定字段
pm.test("响应包含 user_id", function() {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('user_id');
});

// 3. 检查响应时间
pm.test("响应时间小于 500ms", function() {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// 4. 检查 JSON 结构
pm.test("用户信息结构正确", function() {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data.user.name).to.be.a('string');
    pm.expect(jsonData.data.user.email).to.be.an('email');
});

// 5. 检查 Header 包含特定值
pm.test("Content-Type 正确", function() {
    pm.response.headers.has("Content-Type");
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});
```

### 常用断言库（Chai）

Postman Tests 使用 [Chai](https://www.chaijs.com/) 断言库：

```javascript
pm.expect(x).to.equal(y)           // 相等
pm.expect(x).to.be.a('string')     // 类型检查
pm.expect(x).to.have.property('p') // 属性存在
pm.expect(x).to.include(y)         // 包含
pm.expect(x).to.have.lengthOf(3)   // 长度
pm.expect(x).to.be.true            // 为 true
pm.expect(x).to.be.false           // 为 false
pm.expect(x).to.be.above(10)       // 大于
pm.expect(x).to.be.below(100)      // 小于
pm.expect(x).to.match(/regex/)     // 正则匹配
```

### 变量设置/读取

```javascript
// 环境变量
pm.environment.set("key", "value");
pm.environment.get("key");

// 全局变量
pm.globals.set("key", "value");
pm.globals.get("key");

// Collection 变量
pm.collectionVariables.set("key", "value");
pm.collectionVariables.get("key");
```

### 常用 pm 对象 API

| API | 说明 |
|-----|------|
| `pm.request` | 当前请求对象 |
| `pm.response` | 响应对象 |
| `pm.environment` | 环境变量 |
| `pm.globals` | 全局变量 |
| `pm.collectionVariables` | Collection 变量 |
| `pm.variables` | 当前作用域变量（优先级：局部 > 环境 > 全局） |
| `pm.cookies` | Cookie 管理 |
| `pm.sendRequest()` | 发送嵌套请求 |

### 嵌套请求示例

```javascript
// Tests 中：先获取 Token，再调用其他 API
pm.sendRequest('https://api.example.com/login', function(err, res) {
    if (!err) {
        const token = res.json().token;
        pm.environment.set('authToken', token);
    }
});
```

---

## Mock Server 使用

### 什么是 Mock Server？

Mock Server 是 Postman 提供的模拟 API 服务功能，允许你在后端开发完成之前，预先定义 API 的响应，用于前端并行开发和接口测试。

### 创建 Mock Server

**方式一：通过 Collection 创建**

1. 右键点击 Collection → **Mock Collection**
2. 填写 Mock Server 名称
3. 选择环境（可选）
4. 点击 **Create Mock Server**

**方式二：独立创建**

1. 点击工具栏 **Mock Server** → **New Mock Server**
2. 填写名称和请求匹配规则
3. 添加示例响应（Example）

### 创建 Example（示例响应）

Example 是 Mock Server 响应的核心，定义了特定请求应返回的响应。

**创建 Example：**

1. 打开一个请求（例如 `GET /users/:id`）
2. 配置好请求参数
3. 点击 **Save** 保存到 Collection
4. 点击 **Examples** → **Add Example**
5. 配置响应状态码、Headers、Body
6. 保存

```javascript
// GET /users/:id 的 Example 响应
// Status: 200
// Headers: Content-Type: application/json
// Body:
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin"
}
```

### 匹配规则

Mock Server 根据以下优先级匹配响应：

1. **完整 URL + Method + Headers 完全匹配**
2. **URL + Method 匹配**
3. **URL pattern 匹配**（如 `/users/:id` 匹配 `/users/123`）
4. **默认响应**

### 访问 Mock Server

创建 Mock Server 后，Postman 提供一个 mock 域名：

```
https://<mock-id>.mock.pstmn.io
```

例如：
```
GET https://<mock-id>.mock.pstmn.io/users/1
```

### 在团队中共享 Mock

1. **创建团队 Mock Server**（需要 Postman 团队版）
2. **导出 Collection + Examples** 分享给团队成员
3. 团队成员本地运行 `postman-runtime` 使用 mock

### Mock Server 使用场景

| 场景 | 说明 |
|------|------|
| 前端并行开发 | 后端 API 还没好，前端用 Mock 先跑 |
| 接口测试隔离 | 测试时使用 Mock，不依赖真实 API |
| 演示/POC | 快速演示 API 功能 |
| 边界情况测试 | Mock 各种错误码（404/500/429） |

### 常用 Mock 响应配置

```javascript
// 404 Not Found Example
// Status: 404
{
  "error": "User not found",
  "code": 404
}

// 401 Unauthorized Example
// Status: 401
{
  "error": "Invalid token",
  "code": 401
}

// 500 Server Error Example
// Status: 500
{
  "error": "Internal server error",
  "code": 500
}

// 分页响应 Example
// Status: 200
{
  "data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

---

## 常用技巧和最佳实践

### 1. 变量命名规范

```
# 推荐：清晰的分层命名
{{env}}_{{module}}_{{field}}
{{baseUrl}}
{{dev_userService_baseUrl}}

# 不推荐：模糊命名
{{url}}
{{api}}
```

### 2. 使用 Collection 的 Pre-request Script 统一处理认证

```javascript
// 在 Collection 的 Pre-request Script 中：
const token = pm.environment.get("accessToken");
if (token) {
    pm.request.headers.add({ key: "Authorization", value: `Bearer ${token}` });
}
```

### 3. 利用 Tests 脚本做数据驱动测试

配合 CSV/JSON 数据文件，批量执行测试：

```javascript
// 从数据文件中读取每行的值
const jsonData = pm.response.json();
const requestData = pm.iterationData.get("expectedName");

pm.test(`响应 name 为 ${requestData}`, function() {
    pm.expect(jsonData.name).to.equal(requestData);
});
```

### 4. 使用 `postman.setNextRequest()` 控制执行顺序

```javascript
// 强制下一步执行 login（用于工作流测试）
if (pm.response.json().needLogin) {
    postman.setNextRequest("POST /login");
} else {
    postman.setNextRequest("GET /profile");
}

// null 表示停止执行
postman.setNextRequest(null);
```

### 5. 使用环境隔离敏感数据

```
# 开发环境：使用测试账号
{{apiKey}} = test-key-xxx

# 生产环境：使用真实账号
{{apiKey}} = prod-key-xxx
```

**注意**：不要把生产环境的 API Key 保存到 Collection 变量中，建议使用环境变量。

### 6. 善用 Code Generation

点击请求的 **Code** 按钮（`</>`），可以生成多种语言代码：

- cURL
- JavaScript (Fetch)
- Python (requests)
- Go
- Java (OkHttp)
- PHP
- Ruby

### 7. 使用 Collection Runner 进行集成测试

- 设置合理的延迟（delay）模拟真实请求间隔
- 勾选 **Save responses** 保存所有响应
- 使用 **Iterations** 设置循环次数
- 配合 **Data file**（CSV/JSON）实现数据驱动

### 8. 使用 `pm.sendRequest` 实现链式调用

```javascript
// 典型场景：登录 → 获取 token → 用 token 获取数据
const loginRequest = {
    url: '{{baseUrl}}/login',
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            username: 'testuser',
            password: 'testpass'
        })
    }
};

pm.sendRequest(loginRequest, (err, res) => {
    if (!err) {
        const token = res.json().token;
        pm.environment.set('token', token);
        
        // 立即用新 token 发请求
        pm.sendRequest({
            url: '{{baseUrl}}/profile',
            header: { 'Authorization': `Bearer ${token}` }
        }, (err2, res2) => {
            console.log(res2.json());
        });
    }
});
```

### 9. 导入 Swagger/OpenAPI 快速生成 Collection

1. 点击 **Import**
2. 选择文件或粘贴 URL
3. Postman 自动解析并生成所有请求
4. 一键导入，省去手动创建的时间

### 10. 响应内容美化

- **Pretty**：格式化 JSON/XML
- **Raw**：原始文本
- **Preview**：HTML 预览
- **Visualize**：使用 Handlebars 模板自定义可视化

### 11. 常用插件/扩展

| 工具 | 用途 |
|------|------|
| **Postman Interceptor** | 拦截浏览器请求，直接同步到 Postman |
| **Postman CLI (newman)** | 命令行运行 Collection，支持 CI/CD |
| **Postman Monitors** | 定时监控 API 可用性和性能 |

### 12. Newman 命令行运行

```bash
# 安装
npm install -g newman

# 运行 Collection
newman run my-collection.postman_collection.json

# 指定环境
newman run my-collection.json -e production.postman_environment.json

# 生成 HTML 报告
newman run my-collection.json --reporters html --reporter-html-template ./node_modules/newman-reporter-html/hbs/template.html -o report.html

# 从 URL 导入
newman run https://api.example.com/postman/collection.json
```

### 常见问题排查

| 问题 | 解决方案 |
|------|----------|
| 请求超时 | 增加 Timeout 设置，或检查网络 |
| 响应乱码 | 尝试更改编码（响应 Header 中指定） |
| 环境变量不生效 | 确认已选择正确的环境 |
| Mock 返回 404 | 检查 Example 配置是否正确匹配请求 |
| Bearer Token 无效 | 检查 Token 是否过期，尝试刷新 |

---

## 相关资源

- [Postman 官方文档](https://learning.postman.com/)
- [Postman API Network](https://www.postman.com/api-network/)
- [OpenAPI/Swagger 导入](https://learning.postman.com/docs/getting-started/importing-api/)
