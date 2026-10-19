# Protocol Buffers 完全指南

## 目录

- [什么是 Protocol Buffers](#什么是-protocol-buffers)
- [核心概念](#核心概念)
- [ Proto 文件语法](#proto-文件语法)
- [数据类型](#数据类型)
- [JavaScript 使用](#javascript-使用)
- [工作流程](#工作流程)
- [优势与局限](#优势与局限)
- [gRPC 与 Protocol Buffers](#grpc-与-protocol-buffers)
- [最佳实践](#最佳实践)

---

## 什么是 Protocol Buffers

Protocol Buffers（简称 Protobuf）是 Google 开发的一种**语言无关、平台无关**的结构化数据序列化协议。类似于 JSON，但更小、更快，并且可以生成各语言的原生类型绑定。

### 与 JSON 的对比

| 特性 | JSON | Protocol Buffers |
|------|------|------------------|
| 格式 | 文本 | 二进制 |
| 体积 | 较大 | 更小（通常 30%~70%） |
| 速度 | 较慢 | 更快（解析速度 5~10x） |
| 语法 | 无需定义 | 必须定义 .proto 文件 |
| 可读性 | 高 | 低（需解码） |
| 语言支持 | 广泛 | 主流语言都支持 |
| Schema 演进 | 无 | 支持向后兼容 |

---

## 核心概念

### 1. `.proto` 文件

定义消息格式的声明文件，由 proto 编译器生成各语言的代码：

```proto
syntax = "proto3";

message Person {
  string name = 1;
  int32 id = 2;
  string email = 3;
}
```

### 2. Message（消息）

类似 JSON 对象，是 Protocol Buffers 的核心数据结构单位。

### 3. Field（字段）

消息中的属性，包含：
- **类型**：标量类型或复合类型
- **名称**：字段标识符
- **编号**：每个字段的唯一数字标识（用于二进制编码）

### 4. Tag（字段编号）

字段编号 1~15 使用 1 字节编码，16~2047 使用 2+ 字节编码。应将常用字段分配 1~15 编号。

---

## Proto 文件语法

### 基本消息定义

```proto
syntax = "proto3";

message SearchRequest {
  string query = 1;
  int32 page_number = 2;
  int32 results_per_page = 3;
}
```

### 标量类型

| Proto 类型 | JavaScript 类型 | 说明 |
|-----------|----------------|------|
| double | number | 64 位浮点 |
| float | number | 32 位浮点 |
| int32 | number | 32 位整数（变长编码） |
| int64 | BigInt | 64 位整数 |
| uint32 | number | 无符号 32 位整数 |
| uint64 | BigInt | 无符号 64 位整数 |
| sint32 | number | 有符号 32 位整数（变长） |
| sint64 | BigInt | 有符号 64 位整数 |
| fixed32 | number | 固定 4 字节 |
| fixed64 | BigInt | 固定 8 字节 |
| bool | boolean | 布尔值 |
| string | string | UTF-8 编码字符串 |
| bytes | Uint8Array | 字节序列 |

### 字段规则

```proto
message Message {
  string name = 1;           // 单值字段
  repeated string names = 2; // 数组字段（0~N个）
}
```

### 嵌套类型

```proto
message Outer {
  message Inner {
    string name = 1;
  }
  Inner inner = 1;
}
```

### 枚举

```proto
message Person {
  string name = 1;
  enum PhoneType {
    MOBILE = 0;
    HOME = 1;
    WORK = 2;
  }
  PhoneType phone_type = 2;
}
```

### OneOf（互斥字段）

```proto
message Sample {
  oneof test_oneof {
    string name = 1;
    int32 value = 2;
  }
}
```

### Map（映射类型）

```proto
message Person {
  map<string, string> phonebook = 1;
}
```

### 导入其他 proto 文件

```proto
import "google/protobuf/timestamp.proto";

message Event {
  google.protobuf.Timestamp created_at = 1;
}
```

---

## 数据类型

### 常用标量类型

```proto
message AllTypes {
  double d = 1;
  float f = 2;
  int32 i32 = 3;
  int64 i64 = 4;
  uint32 u32 = 5;
  uint64 u64 = 6;
  sint32 s32 = 7;
  sint64 s64 = 8;
  fixed32 f32 = 9;
  fixed64 f64 = 10;
  sfixed32 sf32 = 11;
  sfixed64 sf64 = 12;
  bool b = 13;
  string s = 14;
  bytes bts = 15;
}
```

### 嵌套消息

```proto
message Address {
  string street = 1;
  string city = 2;
}

message Person {
  string name = 1;
  Address address = 2;
  repeated PhoneNumber phones = 3;
}

message PhoneNumber {
  string number = 1;
  int32 type = 2;
}
```

---

## JavaScript 使用

### 安装依赖

```bash
npm install protobufjs
```

### 基本用法

```javascript
const protobuf = require('protobufjs');

// 加载 .proto 文件
const root = protobuf.loadSync('person.proto');
const Person = root.lookupType('Person');

// 编码
const message = Person.create({
  name: 'John Doe',
  id: 1234,
  email: 'john@example.com'
});
const buffer = Person.encode(message).finish();

// 解码
const decoded = Person.decode(buffer);
console.log(decoded);
// { name: 'John Doe', id: 1234, email: 'john@example.com' }
```

### 动态创建（无需 .proto 文件）

```javascript
const protobuf = require('protobufjs');

// 动态创建类型
const root = new protobuf.Root();
const Person = new protobuf.Type('Person')
  .add(new protobuf.Field('name', 1, 'string'))
  .add(new protobuf.Field('id', 2, 'int32'))
  .add(new protobuf.Field('email', 3, 'string'));
root.define('mypackage').add(Person);
Person.resolveAll();

// 编码
const message = Person.fromObject({ name: 'John', id: 1, email: 'john@test.com' });
const buffer = Person.encode(message).finish();

// 解码
const decoded = Person.decode(buffer);
console.log(Person.toObject(decoded));
```

### TypeScript 支持

```bash
npm install protobufjs @types/protobufjs
```

```typescript
import * as protobuf from 'protobufjs';

// 使用反射加载
const root = await protobuf.load('person.proto');
const Person = root.lookupType('person.Person');

const message = Person.create({ name: 'John', id: 1 });
const buffer = Person.encode(message).finish();
const decoded = Person.decode(buffer);
```

---

## 工作流程

```
1. 定义 .proto 文件
   └─ person.proto

2. 使用 protoc 编译（或其他语言的工具）
   └─ 生成 person_pb.js

3. 在应用中使用生成的代码
   └─ 编码：JavaScript对象 → 二进制
   └─ 解码：二进制 → JavaScript对象
```

### 编译命令

```bash
# 安装 protoc
# macOS: brew install protobuf
# Linux: sudo apt install protobuf-compiler

# 编译为 JavaScript
protoc --js_out=import_style=commonjs,binary:. person.proto

# 编译为所有语言（需要对应插件）
protoc --python_out=. person.proto
protoc --go_out=. person.proto
protoc --java_out=. person.proto
```

---

## 优势与局限

### 优势

1. **体积小**：二进制格式，比 JSON 小 30%~70%
2. **速度快**：解析速度比 JSON 快 5~10 倍
3. **类型安全**：通过 .proto 定义提供编译时类型检查
4. **语言中立**：支持 12+ 主流语言
5. ** Schema 演进**：支持向后兼容的字段增删
6. **自动生成代码**：减少手写序列化代码

### 局限

1. **不可读**：二进制格式，调试困难
2. **需要编译**：每次修改 .proto 需要重新生成代码
3. **不适合大文件**：整个消息需加载到内存
4. **非自描述**：需要 .proto 文件才能解释数据
5. **非标准**：不是行业正式标准

---

## gRPC 与 Protocol Buffers

gRPC 是基于 HTTP/2 的 RPC 框架，Protocol Buffers 是其默认的序列化协议。

```
客户端 ──HTTP/2──> gRPC Server
         ↑
      Protocol Buffers（序列化）
```

### 定义服务

```proto
syntax = "proto3";

service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
  rpc ListUsers (ListRequest) returns (stream UserResponse);
}

message UserRequest {
  int32 id = 1;
}

message UserResponse {
  int32 id = 1;
  string name = 2;
  string email = 3;
}
```

---

## 最佳实践

### 1. 字段编号分配

```proto
// 推荐：常用字段用 1~15（1字节编码）
message User {
  int32 id = 1;      // 最常用
  string name = 2;   // 最常用
  string email = 3;
  string avatar = 4;
  // ...
}

// 避免：频繁使用的字段用大编号
```

### 2. Schema 演进规则

- **不要**重用已删除的字段编号
- **不要**更改字段编号
- **可以**添加新字段（旧代码会忽略）
- **可以**删除字段（但保留编号，添加前缀 OBFUSCATED）

### 3. 命名规范

```proto
// 字段名：小写下划线（proto3 风格）
string user_name = 1;    // ✓
string userName = 1;    // ✗

// 消息名/枚举名：大写下划线
message UserProfile {}
enum PhoneType {}

// 服务名/方法名：大驼峰
service UserService {}
rpc GetUser () returns (User) {}
```

### 4. JavaScript 性能优化

```javascript
// 复用编码器（性能更好）
const encoder = new protobuf.encoder();
const decoder = new protobuf.decoder();

// 批量处理时复用消息对象
const reusedMessage = {};
Person.initialize(reusedMessage, false);
```

---

## 参考资源

- [Protocol Buffers 官方文档](https://protobuf.com.cn/)
- [protobufjs GitHub](https://github.com/protobufjs/protobuf.js)
- [Google GitHub](https://github.com/protocolbuffers/protobuf)
- [gRPC 官方文档](https://grpc.org.cn)
