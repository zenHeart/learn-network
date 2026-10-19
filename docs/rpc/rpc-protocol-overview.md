# RPC 协议详解

RPC（Remote Procedure Call，远程过程调用）是一种分布式计算通信协议，允许程序像调用本地函数一样调用另一台机器上的程序。本章详细介绍主流 RPC 协议及其适用场景。

## 目录

- [RPC 核心概念](#rpc-核心概念)
- [主流 RPC 协议](#主流-rpc-协议)
- [协议对比表](#协议对比表)
- [gRPC vs REST](#grpc-vs-rest)
- [代码示例](#代码示例)
- [适用场景](#适用场景)

---

## RPC 核心概念

### 什么是 RPC

RPC 即远程过程调用，其核心思想是：**让调用远程服务像调用本地函数一样简单**。

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │  ────►  │   Network   │  ────►  │   Server    │
│  (Caller)   │         │             │         │  (Callee)   │
└─────────────┘         └─────────────┘         └─────────────┘
     │                                                 │
     │    1. Stub 序列化参数                            │
     │    2. 发送请求                                  │
     │    3. 服务端反序列化、执行                       │
     │    4. 序列化返回值                              │
     │    5. 返回响应                                  │
     ▼                                                 ▼
```

### RPC 调用流程

1. **参数序列化**：将调用参数打包（Protobuf、JSON 等）
2. **网络传输**：通过 HTTP/TCP 等协议发送到服务端
3. **服务端处理**：反序列化、执行实际逻辑
4. **返回结果**：序列化返回值并响应
5. **客户端处理**：反序列化、返回给调用方

### 核心组件

| 组件 | 说明 |
|------|------|
| **Stub** | 客户端存根，负责序列化/反序列化 |
| **Skeleton** | 服务端存根，负责分发请求 |
| **通信协议** | HTTP/2、TCP、自定义协议 |
| **序列化格式** | Protobuf、JSON、XML 等 |

---

## 主流 RPC 协议

### 1. gRPC（HTTP/2 + Protobuf）

Google 主导的高性能 RPC 框架。

**特点**：
- 基于 HTTP/2，支持多路复用、头部压缩
- 使用 Protobuf 序列化，性能优异
- 支持双向流式调用
- 跨语言、跨平台
- 代码生成工具完善

### 2. JSON-RPC

轻量级的 RPC 协议，使用 JSON 作为数据格式。

**特点**：
- 简单易实现
- 人类可读的 JSON 格式
- 纯文本传输，调试友好
- 无需代码生成

### 3. XML-RPC

早期 RPC 协议，使用 XML 格式编码。

**特点**：
- 协议简单，诞生于 1999 年
- XML 格式，可读性好
- 已被 JSON-RPC 大幅替代
- 大量老系统使用

### 4. Thrift

Facebook 开源的跨语言 RPC 框架。

**特点**：
- IDL 定义接口和数据类型
- 支持多种编程语言
- 支持多种传输格式和协议
- 二进制格式，性能好

### 5. SOAP

基于 XML 的 Web 服务协议。

**特点**：
- XML 格式，标准化程度高
- WS-* 规范丰富（安全、事务等）
- 企业级特性完善
- 协议冗长，性能较低

---

## 协议对比表

| 协议 | 序列化格式 | 性能 | 语言支持 | 传输协议 | 适用场景 |
|------|-----------|------|---------|---------|---------|
| **gRPC** | Protobuf | ⭐⭐⭐⭐⭐ | 主流语言 | HTTP/2 | 高性能微服务、云原生 |
| **JSON-RPC** | JSON | ⭐⭐⭐ | 任意语言 | HTTP/1.1 | 轻量级 API、Web 服务 |
| **XML-RPC** | XML | ⭐⭐ | 任意语言 | HTTP/1.1 | 简单集成、老系统 |
| **Thrift** | 二进制 | ⭐⭐⭐⭐ | 18+ 语言 | TCP/HTTP | 跨语言微服务、大数据 |
| **SOAP** | XML | ⭐⭐ | 主流语言 | HTTP/SMTP | 企业集成、严格规范 |

### 性能对比（相对值）

```
gRPC      ████████████████████ 100%
Thrift    ██████████████████   90%
JSON-RPC  ████████              40%
XML-RPC   ██████                30%
SOAP      █████                 25%
```

### 语言支持对比

| 协议 | Go | Java | Python | JavaScript | C++ | Rust |
|------|-----|------|--------|------------|-----|------|
| gRPC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| JSON-RPC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Thrift | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| SOAP | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## gRPC vs REST

### 核心差异

| 维度 | gRPC | REST |
|------|------|------|
| **协议** | HTTP/2 | HTTP/1.1/2 |
| **数据格式** | Protobuf（二进制） | JSON/XML（文本） |
| **接口定义** | .proto 文件 | OpenAPI/Swagger |
| **代码生成** | 原生支持 | 工具支持 |
| **流式支持** | 双向流 | 需 WebSocket/SSE |
| **性能** | 高 | 中 |
| **可读性** | 低（需解码） | 高（人类可读） |
| **浏览器支持** | 需 grpc-web | 原生支持 |

### 代码对比

**REST API：**
```http
GET /users/123
Content-Type: application/json

{
  "name": "张三",
  "email": "zhang@example.com"
}
```

**gRPC：**
```protobuf
message GetUserRequest {
  int32 id = 1;
}

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
}
```

### 选型建议

- **选 gRPC**：性能优先、微服务间通信、支持流式场景
- **选 REST**：浏览器直接调用、公开 API、简单 CRUD

---

## 代码示例

### gRPC 示例（Go）

**1. 定义 Proto 文件（user.proto）：**
```protobuf
syntax = "proto3";

package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(Empty) returns (UserList);
}

message GetUserRequest {
  int32 id = 1;
}

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

message Empty {}

message UserList {
  repeated User users = 1;
}
```

**2. 服务端实现（server.go）：**
```go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"
    pb "your/package/user"
)

type server struct {
    pb.UnimplementedUserServiceServer
    users map[int32]*pb.User
}

func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    user, ok := s.users[req.Id]
    if !ok {
        return nil, nil
    }
    return user, nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterUserServiceServer(s, &server{
        users: map[int32]*pb.User{
            1: {Id: 1, Name: "张三", Email: "zhang@example.com"},
        },
    })
    log.Fatal(s.Serve(lis))
}
```

**3. 客户端调用（client.go）：**
```go
package main

import (
    "context"
    "log"

    "google.golang.org/grpc"
    pb "your/package/user"
)

func main() {
    conn, _ := grpc.Dial("localhost:50051", grpc.WithInsecure())
    defer conn.Close()
    
    client := pb.NewUserServiceClient(conn)
    
    resp, err := client.GetUser(context.Background(), &pb.GetUserRequest{Id: 1})
    if err != nil {
        log.Fatal(err)
    }
    
    log.Printf("用户: %s <%s>", resp.Name, resp.Email)
}
```

---

### JSON-RPC 示例（Node.js）

**服务端实现（server.js）：**
```javascript
const http = require('http');

const methods = {
  add: ([a, b]) => a + b,
  subtract: ([a, b]) => a - b,
  getUser: ({ id }) => ({ id, name: '张三', email: 'zhang@example.com' })
};

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/jsonrpc') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { id, method, params } = JSON.parse(body);
      const result = methods[method](params);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, result }));
    });
  }
});

server.listen(3000);
```

**客户端调用：**
```javascript
async function callRPC(method, params) {
  const resp = await fetch('/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, method, params })
  });
  return resp.json();
}

// 调用示例
const result = await callRPC('add', [2, 3]);
console.log(result.result); // 5

const user = await callRPC('getUser', { id: 1 });
console.log(user.result); // { id: 1, name: '张三', ... }
```

---

## 适用场景

### gRPC 适用场景

| 场景 | 说明 |
|------|------|
| **微服务通信** | 服务间高性能、低延迟通信 |
| **云原生应用** | Kubernetes 环境，gRPC 天然适配 |
| **流式处理** | 双向流式 RPC，如实时数据推送 |
| **多语言服务** | 跨语言强类型接口定义 |
| **移动应用** | 带宽敏感，移动端省电 |

### JSON-RPC 适用场景

| 场景 | 说明 |
|------|------|
| **简单集成** | 快速实现、轻量级 RPC |
| **Web 服务** | 前后分离、BFF 层 |
| **调试友好** | 人类可读，便于日志排查 |
| **无代码生成** | 动态语言、脚本场景 |

### Thrift 适用场景

| 场景 | 说明 |
|------|------|
| **大数据平台** | Hadoop、Hive 早期采用 |
| **跨语言服务** | 需支持多种后端语言 |
| **高并发场景** | 二进制序列化性能优秀 |

### SOAP 适用场景

| 场景 | 说明 |
|------|------|
| **企业级集成** | 严格的 WS-* 安全要求 |
| **金融系统** | 事务、安全规范严格 |
| **老旧系统** | 已有 SOAP 服务维护 |

---

## 总结

选择 RPC 协议时，需综合考虑：

1. **性能需求**：gRPC/Thrift > JSON-RPC > SOAP
2. **跨语言需求**：gRPC/Thrift 支持最广
3. **团队熟悉度**：REST/JSON-RPC 上手最快
4. **生态配套**：企业级选 SOAP，微服务选 gRPC
5. **可读性要求**：调试为主选 JSON-RPC/REST

**推荐**：
- 新项目、高性能场景 → **gRPC**
- 简单快速实现 → **JSON-RPC**
- 大型跨语言平台 → **Thrift**
- 企业集成、强规范 → **SOAP**
