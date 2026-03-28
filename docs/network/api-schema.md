# API Schema 完全指南

> 参考：OpenAPI Specification 3.1、JSON Schema 官方文档

## 目录

1. [什么是 API Schema](#什么是-api-schema)
2. [OpenAPI Specification 核心概念](#openapi-specification-核心概念)
3. [JSON Schema 完全指南](#json-schema-完全指南)
4. [OpenAPI + JSON Schema 实战](#openapi--json-schema-实战)
5. [常见模式与最佳实践](#常见模式与最佳实践)
6. [工具链推荐](#工具链推荐)

---

## 什么是 API Schema

API Schema 是对 API 接口的结构化描述，包括：

- **请求格式**：参数类型、必填/可选、约束条件
- **响应格式**：返回数据的结构、状态码
- **认证方式**：API Key、Bearer Token、OAuth2
- **错误定义**：错误码、错误信息、解决方案

### 主流 Schema 规范

| 规范 | 描述 | 使用场景 |
|------|------|----------|
| **OpenAPI** | 最流行的 REST API 描述标准 | REST API 文档、代码生成 |
| **JSON Schema** | JSON 数据结构描述语言 | 数据验证、API 响应定义 |
| **GraphQL Schema** | GraphQL 类型系统 | GraphQL API |
| **Protocol Buffers** | 二进制序列化协议 | 高性能 RPC、微服务 |
| **AsyncAPI** | 异步 API 描述 | WebSocket、MQTT、事件流 |

---

## OpenAPI Specification 核心概念

### 3.0 vs 3.1 主要区别

| 特性 | OpenAPI 3.0 | OpenAPI 3.1 |
|------|-------------|-------------|
| JSON Schema 版本 | JSON Schema Draft-05 | JSON Schema Draft-2020-12 |
| 类型系统 | `type` + `schema` 分离 | 直接使用 JSON Schema |
| `example` vs `examples` | `example`（单个） | `examples`（多个） |
| `nullable` | 使用 `x-nullable` 扩展 | 使用 `nullable: true` |

### OpenAPI 文档结构

```yaml
openapi: 3.1.0
info:
  title: 我的 API
  version: 1.0.0
  description: API 描述

servers:
  - url: https://api.example.com/v1
    description: 生产环境
  - url: https://staging-api.example.com/v1
    description: 预发环境

paths:
  /users:
    get:
      summary: 获取用户列表
      tags:
        - 用户
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        email:
          type: string
          format: email
      required:
        - id
        - name
        - email
    UserList:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        total:
          type: integer
        page:
          type: integer
      required:
        - data
        - total

  responses:
    Unauthorized:
      description: 未授权
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### 核心对象详解

#### Paths Object

```yaml
paths:
  /users/{id}:
    get:
      # 获取单个用户
    put:
      # 更新用户
    delete:
      # 删除用户
```

#### Parameter Object

```yaml
parameters:
  - name: id              # 参数名
    in: path              # 位置：path | query | header | cookie
    required: true        # 是否必填
    description: 用户ID
    schema:
      type: string
      pattern: '^[a-zA-Z0-9-]+$'
    example: user-123
```

#### Schema Object

```yaml
# 对象类型
User:
  type: object
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 100
    age:
      type: integer
      minimum: 0
      maximum: 150
    hobbies:
      type: array
      items:
        type: string
      minItems: 1
      maxItems: 10
      uniqueItems: true    # 数组元素唯一

# 枚举类型
Status:
  type: string
  enum:
    - pending
    - active
    - deleted

# 组合类型
AdvancedUser:
  allOf:                  # 同时满足多个 schema
    - $ref: '#/components/schemas/User'
    - type: object
      properties:
        role:
          type: string
          enum: [admin, moderator]
  oneOf:                  # 满足其中一个
    - type: object
      properties:
        adminPanel:
          type: string
    - type: object
      properties:
        moderatorPanel:
          type: string
```

---

## JSON Schema 完全指南

### 核心关键字

| 关键字 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| `type` | 所有 | 数据类型 | `type: string` |
| `properties` | object | 对象属性定义 | 见下方 |
| `items` | array | 数组元素类型 | `items: {type: integer}` |
| `required` | array | 必填属性列表 | `required: [name, email]` |
| `enum` | 所有 | 枚举值 | `enum: [a, b, c]` |
| `const` | 所有 | 固定值 | `const: 1` |
| `minimum`/`maximum` | number | 数值范围 | `minimum: 0, maximum: 100` |
| `minLength`/`maxLength` | string | 字符串长度 | `minLength: 1, maxLength: 50` |
| `pattern` | string | 正则表达式 | `pattern: '^[a-z]+$'` |
| `format` | string | 格式校验 | `format: email` |
| `required` | array | 必填字段 | `required: [name]` |
| `$ref` | - | 引用其他 schema | `$ref: '#/definitions/User'` |

### 数据类型

```json
{
  "string": {
    "type": "string",
    "minLength": 1,
    "maxLength": 100,
    "pattern": "^[A-Z][a-z]+$",
    "format": "date-time"
  },
  "number": {
    "type": "number",
    "minimum": 0,
    "maximum": 100,
    "exclusiveMaximum": true,
    "multipleOf": 0.5
  },
  "integer": {
    "type": "integer",
    "minimum": 1,
    "maximum": 1000,
    "multipleOf": 1
  },
  "boolean": {
    "type": "boolean"
  },
  "array": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "minItems": 1,
    "maxItems": 100,
    "uniqueItems": true
  },
  "object": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "integer" }
    },
    "required": ["name"],
    "additionalProperties": false,
    "propertyNames": {
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    "minProperties": 1,
    "maxProperties": 10
  },
  "null": {
    "type": "null"
  }
}
```

### format 格式校验

```json
{
  "format": {
    "date": "2024-01-01",
    "date-time": "2024-01-01T00:00:00Z",
    "time": "12:30:00",
    "email": "user@example.com",
    "idn-email": "用户@example.com",
    "hostname": "example.com",
    "idn-hostname": "例子.中国",
    "ipv4": "192.168.1.1",
    "ipv6": "2001:db8::1",
    "uri": "https://example.com",
    "uri-reference": "/path/to/resource",
    "uri-template": "/users/{id}",
    "json-pointer": "/path/to/key",
    "regex": "^[a-z]+$",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "password": "******",
    "byte": "U3dhZ2dlciByb2Nrcw==",
    "binary": "binary data"
  }
}
```

### 组合 Schema

```json
{
  "allOf": [
    { "type": "string", "minLength": 1 },
    { "type": "string", "maxLength": 100 }
  ],
  "oneOf": [
    { "type": "object", "properties": { "type": { "const": "admin" } } },
    { "type": "object", "properties": { "type": { "const": "user" } } }
  ],
  "anyOf": [
    { "type": "string", "format": "email" },
    { "type": "string", "format": "uri" }
  ],
  "not": {
    "type": "string",
    "pattern": "^admin"
  }
}
```

### 条件引用（OpenAPI 3.1 / JSON Schema 2020-12）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": {
    "properties": {
      "vip": { "const": true }
    }
  },
  "then": {
    "properties": {
      "discount": {
        "type": "number",
        "minimum": 0,
        "maximum": 0.5
      }
    }
  },
  "else": {
    "properties": {
      "discount": {
        "type": "number",
        "minimum": 0,
        "maximum": 0.1
      }
    }
  }
}
```

---

## OpenAPI + JSON Schema 实战

### 定义请求体

```yaml
paths:
  /articles:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                  minLength: 1
                  maxLength: 200
                content:
                  type: string
                  minLength: 10
                tags:
                  type: array
                  items:
                    type: string
                  minItems: 1
                  maxItems: 5
                metadata:
                  type: object
                  properties:
                    author:
                      type: string
                    publishedAt:
                      type: string
                      format: date-time
                  required: [author]
              required:
                - title
                - content
            example:
              title: 我的第一篇文章
              content: 文章内容...
              tags: [前端, JavaScript]
              metadata:
                author: 张三
                publishedAt: '2024-01-01T00:00:00Z'
```

### 定义错误响应

```yaml
components:
  schemas:
    Error:
      type: object
      properties:
        code:
          type: string
          description: 错误码
        message:
          type: string
          description: 人类可读的错误信息
        details:
          type: array
          description: 详细错误信息列表
          items:
            type: object
            properties:
              field:
                type: string
                description: 出错字段
              issue:
                type: string
                description: 具体问题
      required:
        - code
        - message

  responses:
    BadRequest:
      description: 请求参数错误
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: VALIDATION_ERROR
            message: 请求参数验证失败
            details:
              - field: email
                issue: 邮箱格式不正确
              - field: age
                issue: 年龄必须大于 0

    NotFound:
      description: 资源不存在
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: NOT_FOUND
            message: 用户不存在

    ServerError:
      description: 服务器内部错误
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

### 定义分页响应

```yaml
components:
  schemas:
    Pagination:
      type: object
      properties:
        page:
          type: integer
          description: 当前页码
          minimum: 1
        limit:
          type: integer
          description: 每页数量
          minimum: 1
          maximum: 100
        total:
          type: integer
          description: 总记录数
          minimum: 0
        hasMore:
          type: boolean
          description: 是否有下一页
      required: [page, limit, total, hasMore]

    PaginatedList:
      type: object
      properties:
        pagination:
          $ref: '#/components/schemas/Pagination'
        data:
          type: array
          items: {}
      required: [pagination, data]

# 使用示例
paths:
  /users:
    get:
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedList'
              example:
                pagination:
                  page: 1
                  limit: 20
                  total: 100
                  hasMore: true
                data: [...]
```

---

## 常见模式与最佳实践

### 1. 渐进式披露（Progressive Disclosure）

```yaml
# 基础响应 - 常用字段
Article:
  type: object
  properties:
    id:
      type: string
      format: uuid
    title:
      type: string
    author:
      type: string

# 扩展响应 - 使用 allOf 添加可选字段
ArticleExpanded:
  allOf:
    - $ref: '#/components/schemas/Article'
    - type: object
      properties:
        content:
          type: string
        comments:
          type: array
          items:
            $ref: '#/components/schemas/Comment'
        createdAt:
          type: string
          format: date-time
```

### 2. 可复用 Schema

```yaml
# 定义通用组件
components:
  schemas:
    # ID 类型
    Id:
      type: string
      format: uuid
      description: 唯一标识符

    # 时间戳
    Timestamp:
      type: string
      format: date-time
      description: ISO 8601 时间格式

    # 分页基础
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer

    # 错误响应
    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
      required: [code, message]

# 使用
Article:
  type: object
  properties:
    id:
      $ref: '#/components/schemas/Id'
    createdAt:
      $ref: '#/components/schemas/Timestamp'
    error:
      $ref: '#/components/schemas/Error'
```

### 3. discriminated unions（鉴别联合）

```yaml
components:
  schemas:
    Notification:
      type: object
      discriminator:
        propertyName: type
        mapping:
          email: EmailNotification
          sms: SmsNotification
          push: PushNotification
      properties:
        id:
          type: string
        type:
          type: string
      required: [id, type]

    EmailNotification:
      allOf:
        - $ref: '#/components/schemas/Notification'
        - type: object
          properties:
            type:
              const: email
            recipient:
              type: string
              format: email
            subject:
              type: string

    SmsNotification:
      allOf:
        - $ref: '#/components/schemas/Notification'
        - type: object
          properties:
            type:
              const: sms
            phone:
              type: string
            content:
              type: string
              maxLength: 160

    PushNotification:
      allOf:
        - $ref: '#/components/schemas/Notification'
        - type: object
          properties:
            type:
              const: push
            title:
              type: string
            body:
              type: string
            clickAction:
              type: string
              format: uri
```

### 4. 常见错误避免

```yaml
# ❌ 错误：使用 any
BadSchema:
  type: object
  additionalProperties: true

# ✅ 正确：明确指定
GoodSchema:
  type: object
  properties:
    data: {}
  additionalProperties:
    type: string

# ❌ 错误：没有必填标记
IncompleteSchema:
  type: object
  properties:
    name:
      type: string
    email:
      type: string

# ✅ 正确：使用 required
CompleteSchema:
  type: object
  properties:
    name:
      type: string
    email:
      type: string
      format: email
  required: [name, email]

# ❌ 错误：缺少描述
UndescribedSchema:
  type: object
  properties:
    status:
      type: string
      enum: [active, inactive]

# ✅ 正确：添加描述
DescribedSchema:
  type: object
  properties:
    status:
      type: string
      enum: [active, inactive]
      description: 账户状态，active=激活，inactive=未激活
```

---

## 工具链推荐

### 文档生成

| 工具 | 描述 | 特点 |
|------|------|------|
| **Swagger UI** | OpenAPI 文档展示 | 交互式测试 |
| **Redoc** | 美观的 API 文档 | 响应式、侧边导航 |
| **Scalar** | 现代 API 文档 | 主题定制、代码高亮 |
| **Stoplight** | 商业级 API 设计平台 | 协作、设计、测试一体化 |

### 代码生成

| 工具 | 语言 | 描述 |
|------|------|------|
| **openapi-generator** | 多语言 | 生成客户端/服务端代码 |
| **swagger-codegen** | 多语言 | 经典代码生成器 |
| **fern** | TypeScript/Python/Go | 现代 API 客户端 |
| **typeschema** | TypeScript | Schema → TypeScript 类型 |

### 验证工具

| 工具 | 描述 |
|------|------|
| **Ajv** | JSON Schema 验证器（支持 Draft-07/2019-09/2020-12）|
| **Zod** | TypeScript 优先的模式验证 |
| ** Yup** | 对象模式验证 |
| **JSON Schema Viewer** | 可视化 Schema 结构 |

### 在线工具

| 工具 | 描述 |
|------|------|
| [Swagger Editor](https://editor.swagger.io/) | 编写和验证 OpenAPI |
| [JSON Schema Viewer](https://jsonschema.net/) | JSON Schema 可视化 |
| [JSON Schema Generator](https://jsonschema.net/) | 从 JSON 生成 Schema |
| [OpenAPI Generator Online](https://api.openapi.org/) | 在线生成代码 |

---

## 总结

API Schema 是前后端协作的基石：

1. **使用 OpenAPI 描述 REST API** — 标准化、可交互
2. **使用 JSON Schema 定义数据结构** — 可复用、可验证
3. **善用 `$ref`** — 减少重复，统一管理
4. **添加描述和示例** — 提高可读性，降低沟通成本
5. **使用工具链** — 自动化生成文档和代码

---

## 参考资料

- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/latest.html)
- [JSON Schema](https://json-schema.org/)
- [Swagger Documentation](https://swagger.io/docs/)
- [OpenAPI 3.1 新特性](https://swagger.io/blog/api-development/openapi-3-1-what-is-new/)
