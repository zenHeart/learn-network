# Kong API Gateway 完全指南

> Kong 是一个高性能、可扩展的 API 网关，基于 NGINX 构建，支持插件扩展。

## 目录

1. [什么是 Kong](#什么是-kong)
2. [核心概念](#核心概念)
3. [快速开始（Docker）](#快速开始docker)
4. [管理 API 路由](#管理-api-路由)
5. [核心插件](#核心插件)
6. [Konga 可视化管理](#konga-可视化管理)
7. [常见问题](#常见问题)

---

## 什么是 Kong

### Kong 简介

Kong 是一个云原生、可扩展的 API 网关，提供以下核心能力：

| 能力 | 说明 |
|------|------|
| **路由** | 将请求路由到上游服务 |
| **认证** | API Key、JWT、OAuth2 等认证方式 |
| **限流** | 保护上游服务免受过载 |
| **日志** | 请求日志记录与分析 |
| **转换** | 请求/响应转换 |
| **安全** | CORS、IP 黑名单等 |

### Kong vs 其他方案

| 特性 | Kong | Nginx | APISIX |
|------|------|-------|--------|
| 插件生态 | 丰富 | 需要手动开发 | 丰富 |
| 管理界面 | Konga（可选） | 无 | 无 |
| 数据库 | PostgreSQL/Cassandra | 无 | etcd |
| 部署方式 | Docker/K8s | 手动配置 | Docker/K8s |
| 学习曲线 | 中等 | 陡峭 | 中等 |

---

## 核心概念

### Kong 架构

```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Kong Gateway│ ◄── Admin API (8001)
                    │  (NGINX)     │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ Service A│       │ Service B│       │ Service C│
    │ /api/v1 │       │ /api/v2 │       │ /api/v3 │
    └─────────┘       └─────────┘       └─────────┘
```

### 核心资源

#### 1. Service（服务）

Service 是上游服务的抽象，表示一个具体的 API 服务：

```json
{
  "name": "user-service",
  "url": "http://user-service:3000",
  "protocol": "http",
  "host": "user-service",
  "port": 3000,
  "path": "/"
}
```

#### 2. Route（路由）

Route 定义了如何将请求路由到 Service：

```json
{
  "name": "user-route",
  "service": { "id": "<service-uuid>" },
  "paths": ["/api/users"],
  "methods": ["GET", "POST"],
  "strip_path": false
}
```

#### 3. Plugin（插件）

插件在请求/响应生命周期中执行自定义逻辑：

```json
{
  "name": "rate-limiting",
  "config": {
    "minute": 100,
    "policy": "local"
  }
}
```

#### 4. Consumer（消费者）

Consumer 表示 API 的使用者（可以是用户或应用程序）：

```json
{
  "username": "app-client-1",
  "custom_id": "client-123"
}
```

#### 资源关系

```
Consumer ──(认证插件)──► Route ──► Service ──► Upstream ──► Target(s)
                              │
                         [Plugin]
```

---

## 快速开始（Docker）

### 1. 启动 Kong

```bash
# 创建网络
docker network create kong-net

# 启动 PostgreSQL（Kong 数据库）
docker run -d \
  --name kong-database \
  --network=kong-net \
  -p 5432:5432 \
  -e "POSTGRES_USER=kong" \
  -e "POSTGRES_PASSWORD=kong" \
  -e "POSTGRES_DB=kong" \
  postgres:13

# 初始化数据库
docker run --rm \
  --network=kong-net \
  -e "KONG_DATABASE=postgres" \
  -e "KONG_PG_HOST=kong-database" \
  -e "KONG_PG_USER=kong" \
  -e "KONG_PG_PASSWORD=kong" \
  kong:latest kong migrations bootstrap

# 启动 Kong Gateway
docker run -d \
  --name kong \
  --network=kong-net \
  -p 8000:8000        `# Proxy HTTP` \
  -p 8443:8443        `# Proxy HTTPS` \
  -p 8001:8001        `# Admin HTTP` \
  -p 8444:8444        `# Admin HTTPS` \
  -e "KONG_DATABASE=postgres" \
  -e "KONG_PG_HOST=kong-database" \
  -e "KONG_PG_USER=kong" \
  -e "KONG_PG_PASSWORD=kong" \
  -e "KONG_PROXY_ACCESS_LOG=/dev/stdout" \
  -e "KONG_ADMIN_ACCESS_LOG=/dev/stdout" \
  -e "KONG_PROXY_ERROR_LOG=/dev/stderr" \
  -e "KONG_ADMIN_ERROR_LOG=/dev/stderr" \
  kong:latest
```

### 2. 验证 Kong 是否启动成功

```bash
# 检查 Kong 状态
curl -i http://localhost:8001

# 检查插件
curl http://localhost:8001/plugins/enabled
```

### 3. 启动示例上游服务

```bash
# 启动一个简单的 HTTP 服务作为上游
docker run -d \
  --name httpbin \
  --network=kong-net \
  -p 8002:80 \
  kennethreitz/httpbin
```

### 4. 创建第一个 Service 和 Route

```bash
# 创建 Service
curl -i -X POST http://localhost:8001/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "httpbin-service",
    "url": "http://httpbin:80"
  }'

# 创建 Route
curl -i -X POST http://localhost:8001/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "httpbin-route",
    "service": { "name": "httpbin-service" },
    "paths": ["/httpbin"],
    "strip_path": false
  }'

# 测试访问
curl http://localhost:8000/httpbin/get
```

---

## 管理 API 路由

### 常用 Admin API

#### Services

```bash
# 列出所有 Services
curl http://localhost:8001/services

# 获取单个 Service
curl http://localhost:8001/services/<service-id>

# 更新 Service
curl -X PATCH http://localhost:8001/services/<service-id> \
  -d "url=http://new-backend:8080"

# 删除 Service
curl -X DELETE http://localhost:8001/services/<service-id>
```

#### Routes

```bash
# 列出所有 Routes
curl http://localhost:8001/routes

# 获取 Route 的插件
curl http://localhost:8001/routes/<route-id>/plugins
```

#### Consumers

```bash
# 创建 Consumer
curl -X POST http://localhost:8001/consumers \
  -d "username=app-client" \
  -d "custom_id=client-abc123"

# 查看 Consumer
curl http://localhost:8001/consumers/app-client
```

### 配置示例

#### 添加 API Key 认证

```bash
# 启用 key-auth 插件（全局）
curl -X POST http://localhost:8001/plugins \
  -d "name=key-auth" \
  -d "config.key_names=apikey,X-API-Key" \
  -d "config.key_in_header=true"

# 为 Consumer 创建 API Key
curl -X POST http://localhost:8001/consumers/app-client/key-auth \
  -d "key=my-super-secret-key"

# 测试（需要带 Key）
curl -H "apikey: my-super-secret-key" http://localhost:8000/httpbin/get
```

#### 添加限流

```bash
# 启用 rate-limiting 插件
curl -X POST http://localhost:8001/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=100" \
  -d "config.policy=local"
```

---

## 核心插件

### 认证类

| 插件 | 功能 |
|------|------|
| `key-auth` | API Key 认证 |
| `jwt` | JWT Token 认证 |
| `oauth2` | OAuth2 认证 |
| `basic-auth` | Basic Auth 认证 |

### 限流类

| 插件 | 功能 |
|------|------|
| `rate-limiting` | 请求限流 |
| `response-ratelimiting` | 响应限流 |

### 安全类

| 插件 | 功能 |
|------|------|
| `cors` | 跨域资源共享 |
| `ip-restriction` | IP 黑名单/白名单 |
| `bot-detection` | 机器人检测 |

### 日志类

| 插件 | 功能 |
|------|------|
| `logging` | 请求日志 |
| `prometheus` | Prometheus 指标 |

### 常用插件配置

#### CORS 配置

```bash
curl -X POST http://localhost:8001/plugins \
  -d "name=cors" \
  -d "config.origins=*" \
  -d "config.methods=GET,POST,PUT,DELETE" \
  -d "config.headers=Content-Type,Authorization" \
  -d "config.exposed_headers=X-Total-Count" \
  -d "config.credentials=true" \
  -d "config.max_age=3600"
```

#### IP 白名单

```bash
curl -X POST http://localhost:8001/plugins \
  -d "name=ip-restriction" \
  -d "config.allow=127.0.0.1,192.168.1.0/24"
```

---

## Konga 可视化管理

Konga 提供 Web UI 管理 Kong。

### 启动 Konga

```bash
docker run -d \
  --name konga \
  --network=kong-net \
  -p 1337:1337 \
  -e "NODE_ENV=production" \
  -e "KONGA_HOOK_TIMEOUT=120000" \
  -e "KONGA_ADMIN_INIT_EMAIL=admin@example.com" \
  -e "KONGA_ADMIN_INIT_PASSWORD=admin123" \
  --pull always \
  pantsel/konga:latest
```

### Konga 使用流程

1. **连接 Kong**：添加 Kong Admin API 地址 `http://kong:8001`
2. **管理 Services**：可视化创建/编辑 Services
3. **管理 Routes**：配置路由规则
4. **管理 Plugins**：启用/配置插件
5. **管理 Consumers**：管理 API 使用者
6. **查看日志**：监控系统状态

---

## 常见问题

### Q1: 如何查看 Kong 日志？

```bash
# Docker 日志
docker logs -f kong

# 实时查看 Access Log
docker exec -it kong tail -f /usr/local/kong/logs/access.log
```

### Q2: Kong 启动失败怎么办？

```bash
# 检查数据库连接
docker logs kong-database

# 检查 Kong 启动日志
docker logs kong

# 重新初始化数据库
docker run --rm \
  --network=kong-net \
  -e "KONG_DATABASE=postgres" \
  -e "KONG_PG_HOST=kong-database" \
  -e "KONG_PG_USER=kong" \
  -e "KONG_PG_PASSWORD=kong" \
  kong:latest kong migrations bootstrap -f
```

### Q3: 如何实现负载均衡？

```bash
# 添加多个 Target
curl -X POST http://localhost:8001/services/<service-id>/targets \
  -d "target=upstream-node1:8080" \
  -d "weight=100"

curl -X POST http://localhost:8001/services/<service-id>/targets \
  -d "target=upstream-node2:8080" \
  -d "weight=100"
```

### Q4: 如何配置 HTTPS？

```bash
# 1. 创建 SSL 证书（自签名示例）
openssl req -x509 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"

# 2. 上传证书到 Kong
curl -X POST http://localhost:8001/certificates \
  -F "cert=@cert.pem" \
  -F "key=@key.pem" \
  -F "snis=api.example.com"

# 3. 配置 Route 使用证书
curl -X PATCH http://localhost:8001/routes/<route-id> \
  -d "https_redirect_status_code=426" \
  -d "protocols[https]"
```

---

## 参考资料

- [Kong 官方文档](https://docs.konghq.com/)
- [Kong GitHub](https://github.com/Kong/kong)
- [Konga GitHub](https://github.com/pantsel/konga)
- [Docker Hub - Kong](https://hub.docker.com/_/kong)
