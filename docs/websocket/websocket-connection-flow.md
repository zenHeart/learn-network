# WebSocket 连接流程深度分析

## 前言

WebSocket 是一种在单个 TCP 连接上实现全双工通信的协议，被广泛应用于实时聊天、在线游戏、实时数据推送等场景。本文以 `wss://zelda.xiaohongshu.com/websocketV2` 为例，深入分析 WebSocket 的完整连接生命周期，涵盖协议基础、连接建立、握手机制、心跳保活、数据帧格式以及断开重连策略。

---

## 一、协议基础：WebSocket 与 HTTP/HTTPS 的关系

### 1.1 wss:// 是什么

`wss://` 是 WebSocket Secure 的缩写，等价于 **WebSocket + TLS**。类比关系如下：

| 协议 | 底层实现 | 说明 |
| :--- | :------- | :--- |
| `http://` | TCP | 裸 TCP 连接，无加密 |
| `https://` | TCP + TLS | HTTP over TLS |
| `ws://` | TCP | WebSocket，无加密 |
| `wss://` | TCP + TLS | WebSocket over TLS |

`wss://zelda.xiaohongshu.com/websocketV2` 中的 `zelda.xiaohongshu.com` 是小红书的 WebSocket 服务器域名，`/websocketV2` 是服务端路径。

### 1.2 协议层级位置

```
┌─────────────────────────────────┐
│         应用层 (HTTP/WS)         │
├─────────────────────────────────┤
│   TLS (wss) / SSL (https)       │
├─────────────────────────────────┤
│         TCP                     │
├─────────────────────────────────┤
│         IP                      │
└─────────────────────────────────┘
```

WebSocket 协议位于 OSI 模型的应用层（第 7 层），但它的握手阶段借用了 HTTP 的请求-响应机制，因此常被描述为"HTTP 的升级协议"。

### 1.3 为什么需要 WebSocket

传统的 HTTP 采用**请求-响应**模式，客户端主动发起请求，服务器被动返回响应。服务器无法主动向客户端推送数据。

解决方案对比：

| 方案 | 实现方式 | 实时性 | 资源开销 | 复杂度 |
| :--- | :------- | :----- | :------- | :----- |
| 短轮询 (Short Polling) | 客户端定时请求 | 低 | 高（频繁建连） | 低 |
| 长轮询 (Long Polling) | 请求挂起直到有新数据 | 中 | 中 | 中 |
| Server-Sent Events (SSE) | 服务器推送单向通道 | 高 | 低 | 中 |
| **WebSocket** | **双向全双工** | **高** | **低** | **中** |

---

## 二、连接建立：HTTP Upgrade

### 2.1 握手本质

WebSocket 的连接建立始于一个 **HTTP Upgrade 请求**。客户端（浏览器）发送一个特殊的 HTTP 请求，告知服务器将当前的 HTTP 连接"升级"为 WebSocket 连接。

**关键请求头：**

```
GET /websocketV2 HTTP/1.1
Host: zelda.xiaohongshu.com
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://www.xiaohongshu.com
User-Agent: Mozilla/5.0 ...
```

- `Connection: Upgrade` — 告诉服务器当前连接需要升级
- `Upgrade: websocket` — 目标协议是 WebSocket
- `Sec-WebSocket-Key` — 随机生成的 Base64 字符串，用于握手验证
- `Sec-WebSocket-Version: 13` — 协议版本，当前唯一正式版本

### 2.2 服务器响应

如果服务器支持 WebSocket，它返回 **101 Switching Protocols** 状态码：

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

101 状态码表示"协议切换"（Protocol Switch），是 HTTP/1.1 规范中定义的特殊状态。完成这个响应后，TCP 连接不再承载 HTTP 协议，而是转为承载 WebSocket 数据帧。

### 2.3 抓包验证

使用 Wireshark 抓包时，过滤器设置：

```
tcp.port == 443  # wss 使用 443 端口
```

会看到完整的握手流程：TCP 三次握手 → HTTP Upgrade 请求 → 101 响应 → WebSocket 数据帧。

> 注：`wss://` 使用 443 端口，`ws://` 默认使用 80 端口（可自定义）。

---

## 三、握手机制：Sec-WebSocket-Key 验证

### 3.1 为什么需要 Key 验证

握手阶段的 Key-Accept 机制并非用于加密，而是用于**防止恶意连接请求**（如跨站 WebSocket 劫持攻击）。它确保服务器只接受有意建立 WebSocket 连接的请求。

### 3.2 握手算法

服务器根据以下规则计算 `Sec-WebSocket-Accept`：

```
Accept = Base64(SHA1(Sec-WebSocket-Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
```

步骤分解：

1. **拼接**：将客户端的 `Sec-WebSocket-Key` 与固定的 **GUID** 字符串 `"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"` 首尾拼接
2. **SHA1 哈希**：对拼接后的字符串计算 SHA1 摘要（20 字节）
3. **Base64 编码**：将二进制结果编码为 Base64 字符串

### 3.3 示例

假设客户端发送：
```
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```

服务器计算（Node.js 示例）：

```javascript
const crypto = require("crypto");
const key = "dGhlIHNhbXBsZSBub25jZQ==";
const guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const accept = crypto
  .createHash("sha1")
  .update(key + guid)
  .digest("base64");
// 结果: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

### 3.4 浏览器内置实现

浏览器端不需要手动计算，WebSocket API 会自动处理握手：

```javascript
const ws = new WebSocket("wss://zelda.xiaohongshu.com/websocketV2");
// 浏览器自动添加 Sec-WebSocket-Key 并验证 Sec-WebSocket-Accept
```

---

## 四、数据帧格式详解

### 4.1 帧结构

WebSocket 通信的基本单位是**数据帧**（Frame）。帧结构如下：

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  FIN (1bit) │  RSV1-3     │  Opcode     │             │
│  标志位     │  (3bit)     │  (4bit)     │             │
├─────────────┴─────────────┴─────────────┤  Mask Bit   │
│           Payload Len (7bit)           │  (1bit)     │
├───────────────────────────────────────┤              │
│           Extended Payload Length      │  Masking    │
│           (if payload len = 126/127)   │  Key        │
├───────────────────────────────────────┤  (32bit,    │
│           Masking Key (32bit)          │  if masked) │
├───────────────────────────────────────┤              │
│                                           │              │
│           Application Data               │              │
│           ("Payload Data")               │              │
│                                           │              │
└───────────────────────────────────────────┴─────────────┘
```

### 4.2 各字段说明

| 字段 | 长度 | 说明 |
| :--- | :--- | :--- |
| FIN | 1bit | 1=这是消息的最后一帧；0=还有后续帧 |
| RSV1-3 | 各 1bit | 保留位，正常为 0 |
| Opcode | 4bit | 帧类型（见下表） |
| MASK | 1bit | 1=数据被掩码处理；0=未掩码。**客户端发送必须为 1** |
| Payload Length | 7bit | 数据长度（0-125）；126/127 表示使用扩展长度 |
| Masking Key | 0/32bit | 掩码密钥，MASK=1 时存在 |
| Payload Data | 可变 | 应用数据 |

### 4.3 Opcode 帧类型

| Opcode | 值 | 说明 |
| :------ | :-- | :--- |
| 0x0 | 0 | Continuation 帧（消息分片的后续帧） |
| 0x1 | 1 | Text 帧（UTF-8 文本） |
| 0x2 | 2 | Binary 帧（二进制数据） |
| 0x8 | 8 | Close 帧（关闭连接） |
| 0x9 | 9 | Ping 帧（心跳请求） |
| 0xA | 10 | Pong 帧（心跳响应） |

### 4.4 帧解析示例

以下是一个文本帧的十六进制解析：

```
81 86 7f 43 52 1d 54 06 51 58 1e 57 58 14 51 17 52
│  │  │  └─────────── Masking Key (4 bytes) ───────────┘
│  │  └──────────────── Payload Length (6) ────────────┘
│  └──────────────── Opcode = 0x1 (Text Frame) ─────────┘
└──────────────── FIN=1, RSV=0, Opcode=1 ───────────────┘
```

关键规则：
- 客户端发送给服务器的数据**必须**掩码（MASK=1）
- 服务器发送给客户端的数据**不应**掩码（MASK=0）
- 掩码算法：`maskedByte[i] = rawByte[i] XOR maskingKey[i % 4]`

### 4.5 消息分片（Fragmentation）

当一条消息过大时，可以分片传输：

```
帧1: FIN=0, Opcode=1, Data="Hello"
帧2: FIN=0, Opcode=0, Data=" World"
帧3: FIN=1, Opcode=0, Data="!"
```

- 第一帧：Opcode=1 (Text)，FIN=0 表示"消息未结束"
- 中间帧：Opcode=0 (Continuation)，FIN=0 继续
- 最后一帧：Opcode=0，FIN=1 表示消息完成

---

## 五、心跳机制（Keep-Alive）

### 5.1 为什么需要心跳

TCP 连接的 **KEEPALIVE** 机制可以检测死连接（如对端崩溃），但默认超时时间较长（Linux 默认 7200 秒）。WebSocket 应用需要更快速地检测连接存活状态，因此引入了应用层心跳机制。

### 5.2 Ping/Pong 帧

WebSocket 协议内置了 Ping/Pong 机制：

- **Ping** (Opcode=0x9)：主动发送的心跳请求
- **Pong** (Opcode=0xA)：对 Ping 的响应

```
客户端 ──Ping──► 服务器
客户端 ◄──Pong── 服务器
```

浏览器不会自动发送 Ping，通常由**服务器**定期发送 Ping，客户端自动回复 Pong。开发者也可以手动发送：

```javascript
// 手动发送 Ping（浏览器支持有限）
ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
```

### 5.3 TCP Keepalive 与 WebSocket 心跳的区别

| 维度 | TCP Keepalive | WebSocket Ping/Pong |
| :--- | :------------ | :------------------ |
| 层级 | 传输层（TCP） | 应用层（WebSocket） |
| 触发 | 内核/操作系统 | 应用代码 |
| 精度 | 分钟级 | 秒级 |
| 跨平台 | 依赖 OS 配置 | 标准化协议支持 |
| 可控性 | 低 | 高 |

### 5.4 小红书 WebSocket 心跳实践

参考 `wss://zelda.xiaohongshu.com/websocketV2`，典型的心跳实现：

```javascript
// 客户端：定时发送心跳
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "heartbeat",
      timestamp: Date.now(),
      deviceId: "xxx"
    }));
  }
}, 30000); // 每 30 秒一次

// 服务器：响应心跳
ws.on("message", (data) => {
  const msg = JSON.parse(data);
  if (msg.type === "heartbeat") {
    ws.send(JSON.stringify({ type: "heartbeat_ack", timestamp: Date.now() }));
  }
});
```

---

## 六、连接状态

### 6.1 浏览器 WebSocket 状态码

| 属性值 | 值 | 说明 |
| :----- | :-- | :--- |
| `WebSocket.CONNECTING` | 0 | 连接正在建立 |
| `WebSocket.OPEN` | 1 | 连接已打开，可通信 |
| `WebSocket.CLOSING` | 2 | 连接正在关闭 |
| `WebSocket.CLOSED` | 3 | 连接已关闭 |

### 6.2 连接关闭码（Close Code）

WebSocket 关闭时，双方可以交换一个 2 字节的关闭码和原因字符串：

| 代码 | 名称 | 说明 |
| :--- | :--- | :--- |
| 1000 | `CLOSE_NORMAL` | 正常关闭 |
| 1001 | `CLOSE_GOING_AWAY` | 终端离开 |
| 1002 | `CLOSE_PROTOCOL_ERROR` | 协议错误 |
| 1003 | `CLOSE_UNSUPPORTED` | 不支持的数据类型 |
| 1005 | `CLOSE_NO_STATUS` | 无状态码（保留） |
| 1006 | `CLOSE_ABNORMAL` | 异常关闭（非正常断开） |
| 1009 | `CLOSE_TOO_LARGE` | 消息过大 |
| 1010 | `CLOSE_EXTENSION_REQUIRED` | 需要扩展协商 |
| 1011 | `CLOSE_UNEXPECTED_CONDITION` | 服务器内部错误 |

---

## 七、断开与重连策略

### 7.1 断开场景

WebSocket 连接可能因以下原因断开：

1. **主动关闭**：调用 `ws.close()`，正常完成四次挥手
2. **网络中断**：网线拔出、Wi-Fi 断开、切换网络
3. **服务器关闭**：服务端主动关闭连接（OOM、限流、版本更新）
4. **心跳超时**：长时间未收到心跳，服务器主动断开
5. **协议错误**：收到格式错误的数据帧

### 7.2 重连策略

合理的重连机制是保障服务稳定性的关键：

```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000; // 初始重连延迟（毫秒）
    this.maxReconnectDelay = 30000; // 最大重连延迟
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("连接建立成功");
      this.reconnectDelay = 1000; // 重置延迟
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("连接错误", error);
    };
  }

  scheduleReconnect() {
    setTimeout(() => {
      console.log(`将在 ${this.reconnectDelay}ms 后重连...`);
      this.connect();
      // 指数退避，避免频繁重连
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay
      );
    }, this.reconnectDelay);
  }
}
```

### 7.3 指数退避（Exponential Backoff）

| 重试次数 | 延迟 |
| :------- | :--- |
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5 | 16s |
| 6+ | 30s（上限） |

加入**随机抖动（Jitter）** 防止多客户端同时重连造成雪崩：

```javascript
const delay = this.reconnectDelay * (0.5 + Math.random() * 0.5);
// 实际延迟 = 基础延迟 × [0.5, 1.0] 随机因子
```

---

## 八、完整连接流程图

```
客户端                                服务器
  │                                     │
  │ ──── TCP 三次握手 (SYN, SYN-ACK) ──►│
  │ ◄──── ACK ─────────────────────────│
  │                                     │
  │ ──── HTTP Upgrade 请求 ────────────►│
  │      GET /websocketV2               │
  │      Connection: Upgrade             │
  │      Upgrade: websocket              │
  │      Sec-WebSocket-Key: xxx          │
  │ ◄─── HTTP/1.1 101 Switching ───────│
  │      Sec-WebSocket-Accept: yyy      │
  │                                     │
  │ ◄──── WebSocket 数据帧 (业务数据) ──│
  │ ──── WebSocket 数据帧 ────────────►│
  │                                     │
  │ ──── Ping 帧 ─────────────────────►│
  │ ◄──── Pong 帧 ─────────────────────│
  │      (心跳保活)                     │
  │                                     │
  │ ──── Close 帧 ─────────────────────►│
  │ ◄──── Close 帧 ─────────────────────│
  │                                     │
  │ ──── TCP 四次挥手 (FIN, ACK) ─────►│
```

---

## 九、安全考量

### 9.1 WSS 强制使用

生产环境**必须**使用 `wss://`（TLS 加密），否则：
- 数据以明文传输，可被中间人窃听
- 敏感 Cookie/Token 可能被盗取
- 容易被注入恶意脚本

### 9.2 Origin 验证

服务器应验证 `Origin` 头，防止跨站 WebSocket 劫持：

```javascript
server.on("upgrade", (req, socket) => {
  const origin = req.headers.origin;
  const allowedOrigins = ["https://www.xiaohongshu.com", "https://xiaohongshu.com"];
  if (!allowedOrigins.includes(origin)) {
    socket.destroy();
    return;
  }
  // 继续 WebSocket 握手...
});
```

### 9.3 输入验证

WebSocket 消息同样需要严格的输入验证，避免注入攻击：

```javascript
ws.on("message", (data) => {
  try {
    const msg = JSON.parse(data);
    if (typeof msg.type !== "string") return;
    if (msg.type === "message" && typeof msg.content !== "string") return;
    // 业务处理...
  } catch (e) {
    console.error("Invalid message format");
  }
});
```

---

## 十、总结

| 阶段 | 关键点 |
| :--- | :----- |
| **协议基础** | `wss://` = WebSocket + TLS，端口 443 |
| **连接建立** | HTTP Upgrade 请求，`Connection: Upgrade` |
| **握手机制** | `Sec-WebSocket-Key` + GUID → SHA1 → Base64 = `Sec-WebSocket-Accept` |
| **数据帧** | FIN + Opcode + MASK + Payload Length + Masking Key + Data |
| **心跳** | Ping/Pong 帧，或应用层心跳（JSON 消息） |
| **状态** | CONNECTING(0) → OPEN(1) → CLOSING(2) → CLOSED(3) |
| **重连** | 指数退避 + 随机抖动 |
| **安全** | 必须用 wss、Origin 验证、输入验证 |

---

## 参考资料

- [RFC 6455 - The WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
- [MDN Web Docs - WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Chromium Source - TCP KeepAlive](https://source.chromium.org/chromium/chromium/src/+/main:net/socket/tcp_socket_posix.cc)
