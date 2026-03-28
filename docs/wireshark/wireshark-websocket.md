# Wireshark + WebSocket 调试指南

> Wireshark 是功能强大的网络封包分析工具，可用于深入分析 WebSocket 协议的握手、数据帧、连接关闭等全过程。本文详细介绍如何利用 Wireshark 抓取并分析 WebSocket 流量。

## 目录

- [1. 基础概念](#1-基础概念)
- [2. Wireshark 抓包原理](#2-wireshark-抓包原理)
- [3. WebSocket 握手阶段抓包分析](#3-websocket-握手阶段抓包分析)
- [4. WebSocket 数据帧抓包分析](#4-websocket-数据帧抓包分析)
- [5. Wireshark 过滤器语法](#5-wireshark-过滤器语法)
- [6. 常见问题与排查](#6-常见问题与排查)
- [7. 实战案例](#7-实战案例)
- [8. 参考资料](#8-参考资料)

---

## 1. 基础概念

### 1.1 WebSocket 协议简介

WebSocket 是一种在单个 TCP 连接上进行**全双工**通信的协议。与 HTTP 不同，WebSocket 建立连接后可以由任一方主动发送数据，无需像 HTTP 那样每次由客户端发起请求。

**核心特点：**

| 特点 | 说明 |
|------|------|
| 全双工通信 | 客户端和服务端可同时发送数据 |
| 单TCP连接 | 一次握手，长期保持连接 |
| 低延迟 | 无需每次携带完整 HTTP 首部 |
| 二进制/文本帧 | 支持文本和二进制数据传输 |

### 1.2 WebSocket vs HTTP 对比

| 维度 | HTTP/1.1 | HTTP/2 | WebSocket |
|------|----------|--------|-----------|
| 通信方式 | 请求-响应 | 请求-响应 | 全双工 |
| 连接 | 短连接/Keep-Alive | 多路复用 | 长连接 |
| 头部开销 | 每次都携带 | 压缩 | 仅首部后极小 |
| 服务端推送 | ❌ 需要轮询 | ✅ Server Push | ✅ 原生支持 |
| 适用场景 | REST API | 资源加载 | 实时数据 |

### 1.3 Wireshark 简介

Wireshark 是开源的网络协议分析工具，支持多种平台（Windows/macOS/Linux），可以捕获并分析网络数据包。

**核心功能：**

- 实时网络流量捕获
- 支持数百种协议解析
- 强大的过滤器（Capture Filter / Display Filter）
- 数据包详细信息查看
- 统计分析和可视化

---

## 2. Wireshark 抓包原理

### 2.1 抓包机制

Wireshark 通过**原始套接字（Raw Socket）**或**网络接口驱动（WinPcap/Npcap）**直接读取网卡数据。这意味着它能看到所有经过网卡的数据包，包括：

- TCP/IP 协议栈各层数据
- 链路层帧
- 网络层包
- 传输层段
- 应用层数据

**注意：** Wireshark 无法抓取经过 TLS/SSL 加密的 HTTPS 内容（除非解密）。

### 2.2 WebSocket 与 TCP/IP 层级关系

```
┌─────────────────────────────────────┐
│         WebSocket 数据帧             │  ← 应用层
├─────────────────────────────────────┤
│  TCP 传输层（可靠连接）              │
├─────────────────────────────────────┤
│  IP 网络层（路由转发）               │
├─────────────────────────────────────┤
│  Ethernet 链路层（MAC 地址）         │
└─────────────────────────────────────┘
```

WebSocket 协议运行在 TCP 之上，握手阶段使用 HTTP Upgrade 机制。

### 2.3 安装与配置

**Windows：**

1. 下载 Wireshark：https://www.wireshark.org/download.html
2. 安装 Npcap（抓包驱动）：https://npcap.com/
3. 安装 Wireshark 时选择安装 Npcap

**macOS：**

```bash
brew install wireshark
```

**Linux (Ubuntu/Debian)：**

```bash
sudo apt install wireshark
# 安装后需要设置权限或使用 sudo 运行
sudo wireshark
```

### 2.4 选择网络接口

启动 Wireshark 后，选择要监听的网络接口：

| 接口 | 说明 |
|------|------|
| Wi-Fi / Ethernet | 本机网络流量 |
| lo / Loopback | 本机内部通信（如 localhost） |
| Bluetooth | 蓝牙设备通信 |
| USB | USB 网络共享流量 |

**WebSocket 本地调试建议：**

1. 选择 `lo`（Loopback）接口监听 localhost 流量
2. 或使用 Wireshark 远程抓包（Remote Capture）
3. Chrome DevTools 已足够简单场景

---

## 3. WebSocket 握手阶段抓包分析

### 3.1 WebSocket 连接建立流程

```
客户端                              服务端
   │                                  │
   │─────── TCP 三次握手 ────────────▶│
   │◀─────── SYN + ACK ────────────────│
   │─────── ACK ──────────────────────▶│
   │                                  │
   │─────── HTTP Upgrade 请求 ────────▶│
   │◀─────── HTTP 101 响应 ───────────│
   │                                  │
   │══════════ 握手完成 ══════════════│
   │                                  │
   │─────── WebSocket 数据帧 ────────▶│  ← 双向通信
   │◀─────── WebSocket 数据帧 ───────│
   │                                  │
   │─────── Close 帧 ────────────────▶│
   │◀─────── Close 响应 ─────────────│
   │                                  │
   │─────── TCP 四次挥手 ────────────▶│
```

### 3.2 HTTP Upgrade 请求分析

在 Wireshark 中，过滤 `http.handshake` 或 `http.response.code == 101`，找到 WebSocket 握手请求。

**客户端请求关键 Header：**

```
GET /ws HTTP/1.1
Host: example.com
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: http://example.com
```

| Header | 说明 |
|--------|------|
| `Connection: Upgrade` | 表明需要协议升级 |
| `Upgrade: websocket` | 升级为 WebSocket 协议 |
| `Sec-WebSocket-Version: 13` | 协议版本，当前标准为 13 |
| `Sec-WebSocket-Key` | 随机生成的 Base64 密钥，用于验证握手 |
| `Origin` | 请求来源（浏览器自动添加） |

**Sec-WebSocket-Key 作用：**

服务端通过 `Sec-WebSocket-Key` 计算出 `Sec-WebSocket-Accept` 响应头，防止恶意连接：

```
Sec-WebSocket-Accept = Base64(SHA1(Sec-WebSocket-Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
```

### 3.3 服务端响应分析

**服务端响应：**

```
HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

状态码 **101** 表示协议切换成功，之后所有数据都按 WebSocket 帧格式传输。

### 3.4 Wireshark 过滤器

**抓包过滤器（Capture Filter）：**

```bash
# 抓取指定端口的流量（WebSocket 常用 80/443）
tcp port 8080

# 抓取 WebSocket 握手流量
tcp port 8080 and http

# 抓取所有 HTTP Upgrade 请求
tcp port 8080 and http.request.uri contains "/ws"
```

**显示过滤器（Display Filter）：**

```bash
# 过滤 HTTP 101 响应
http.response.code == 101

# 过滤 WebSocket 握手
http.connection == "Upgrade" or http.upgrade == "websocket"

# 过滤指定主机的流量
ip.addr == 127.0.0.1

# 过滤指定端口
tcp.port == 8080
```

---

## 4. WebSocket 数据帧抓包分析

### 4.1 WebSocket 帧结构（RFC 6455）

WebSocket 数据帧格式：

```
┌────────┬──────┬────────┬──────────┬─────────────┐
│ FIN=1  │ RSV  │ opcode │ MASK=1   │ payload len │
│ (1bit) │(3bit)│ (4bit) │ (1bit)   │    (7bit)   │
├────────┴──────┴────────┴──────────┴─────────────┤
│              Extended payload length (64bit)     │  ← 仅当 payload len > 125
├─────────────────────────────────────────────────┤
│                  Masking-key (32bit)            │  ← 仅当 MASK=1
├─────────────────────────────────────────────────┤
│                     Payload Data                 │
└─────────────────────────────────────────────────┘
```

### 4.2 帧首部各字段详解

| 字段 | 长度 | 说明 |
|------|------|------|
| FIN | 1 bit | 是否为消息最后一帧（1=是，0=否） |
| RSV1-3 | 各 1 bit | 扩展标志，通常为 0 |
| opcode | 4 bits | 帧类型 |
| MASK | 1 bit | 数据是否掩码（客户端→服务端必须为 1） |
| Payload len | 7 bits | 数据长度 |
| Masking-key | 32 bits | 掩码密钥（MASK=1 时存在） |

### 4.3 opcode 帧类型

| opcode | 值 | 说明 |
|--------|---|------|
| 0x0 | 0 | 继续帧（Continuation） |
| 0x1 | 1 | 文本帧（Text） |
| 0x2 | 2 | 二进制帧（Binary） |
| 0x8 | 8 | 关闭帧（Close） |
| 0x9 | 9 | Ping 帧 |
| 0xA | 10 | Pong 帧 |

### 4.4 帧抓包实例

**发送文本 "Hello" 的数据帧（Wireshark 中的结构）：**

```
Frame 45: 14 bytes on wire (112 bits)
Ethernet II, Src: Intel_xx:xx:xx, Dst: AppleComputer_xx:xx:xx
Internet Protocol Version 4, Src: 127.0.0.1, Dst: 127.0.0.1
Transmission Control Protocol, Src Port: 52345, Dst Port: 8080
    [Stream index: 3]
WebSocket
    1... .... = FIN: True          # FIN=1，最后一帧
    .000 .... = Reserved: 0x00
    .... 0001 = Opcode: Text (1)   # 文本帧
    1... .... = Mask: True          # 客户端→服务端，必须掩码
    .111 0100 = Payload length: 116 # "Hello"=5字节，但显示的是编码后
    Masking-Key: 0x12345678         # 4字节掩码
    Masked payload: 0x5a 0x5d ...  # 掩码后的数据
```

### 4.5 为什么要掩码？

**客户端发送的数据必须掩码（RFC 6455 规定），而服务端返回的不需要。**

**安全原因：** 防止"缓存污染攻击"

攻击场景：
1. 恶意客户端向代理服务器发送一个被掩码的请求
2. 代理服务器不理解掩码内容，尝试缓存
3. 如果不掩码，代理服务器可能缓存并转发恶意内容

掩码后的数据对 HTTP 代理服务器来说是"乱码"，不会被缓存，从而保护了网络安全。

### 4.6 数据帧分析实操步骤

1. 在 Wireshark 中找到 TCP 流（右键 → Follow → TCP Stream）
2. 过滤出 WebSocket 流量：`ws.payload.len > 0`
3. 查看帧的 opcode 判断类型
4. 确认 FIN=1 表示消息完整
5. 如果是文本帧，可以直接看到内容（未加密情况下）

---

## 5. Wireshark 过滤器语法

### 5.1 捕获过滤器（Capture Filter）

捕获过滤器在抓包时生效，BPF（Berkeley Packet Filter）语法：

```bash
# 语法
<protocol> <direction> <host> <port>

# 示例
tcp port 8080                 # 捕获 8080 端口的 TCP 流量
tcp dst port 8080             # 目标端口 8080
tcp src port 8080             # 源端口 8080
host 192.168.1.1              # 特定 IP
net 192.168.0.0/24            # IP 段
tcp port 8080 and host 127.0.0.1  # 组合条件
```

### 5.2 显示过滤器（Display Filter）

显示过滤器在已捕获的包中筛选，更强大且不丢失数据：

**常用过滤表达式：**

```bash
# 协议过滤
ws                         # WebSocket 流量
http                       # HTTP 流量
tcp                        # TCP 流量
udp                        # UDP 流量

# WebSocket 特定过滤
ws.payload.len > 0        # 有数据载荷的 WebSocket 帧
ws.opcode == 1             # 文本帧
ws.opcode == 2             # 二进制帧
ws.opcode == 8             # 关闭帧
ws.mask == true            # 带掩码的帧

# HTTP 相关
http.request.method == "GET"
http.response.code == 101
http.connection == "Upgrade"
http.upgrade == "websocket"

# 端口和地址
tcp.port == 8080
tcp.srcport == 52345
ip.addr == 127.0.0.1

# 逻辑组合
tcp.port == 8080 and ws.payload.len > 0
http.response.code == 101 or ws.payload.len > 0
```

### 5.3 过滤器技巧

**TCP 流追踪：**

```
# 找到 TCP 流中的所有包
tcp.stream eq 3

# Wireshark UI 操作：
# 右键任意包 → Follow → TCP Stream
```

**导出特定流量：**

```
# 在 UI 中：
# File → Export Specified Packets → Displayed
```

---

## 6. 常见问题与排查

### 6.1 抓不到包

**问题：** 选择正确接口但抓不到任何包

**排查步骤：**

1. 确认网络接口是否选中正确
   - 本地调试用 `lo`（Loopback）
   - 外网调试用实际网卡

2. 检查是否需要管理员权限
   - Linux/macOS：需要 `sudo wireshark`
   - Windows：确保 Npcap 驱动安装正确

3. 确认网络通信确实发生
   - 使用 `netstat -an | grep 端口` 确认连接存在
   - 或使用 `curl` / 浏览器触发连接

### 6.2 抓包文件过大

**问题：** WebSocket 长连接产生大量数据，PCAP 文件巨大

**解决思路：**

1. 使用显示过滤器，只保留需要的包
   ```
   ws.payload.len > 0
   ```

2. 设置捕获过滤器，减少初始数据量
   ```
   tcp port <your-port>
   ```

3. 使用环形缓冲区（Wireshark 配置）
   ```
   # 启动时使用 -b buffer_size:N
   wireshark -b filesize:10000 -b files:5 -i lo
   ```

### 6.3 无法解密 TLS 流量

**问题：** WebSocket over WSS (WSS://) 无法查看内容

**原因：** TLS 加密了数据，Wireshark 默认无法解密

**解决思路：**

1. 获取私钥（仅适用于自己可控的服务端）
2. 使用 Chrome DevTools 的 Network 面板查看解密后的 WebSocket 帧
3. 使用 `SSLKEYLOGFILE` 环境变量让 Chrome 输出密钥

### 6.4 帧解析错误

**问题：** Wireshark 未能正确解析 WebSocket 帧

**排查：**

1. 确认是标准 WebSocket（非私有协议伪装）
2. 检查握手是否正确完成（HTTP 101）
3. 尝试升级 Wireshark 到最新版本
4. 检查是否有端口被拦截（如企业防火墙）

### 6.5 连接被关闭

**问题：** WebSocket 连接突然断开

**抓包分析：**

1. 查找 opcode=8 的帧（Close）
2. 查看 Close 帧的 payload（可能包含关闭码和原因）
3. 分析 TCP RST/FIN 包

**WebSocket 关闭码：**

| 码 | 说明 |
|----|------|
| 1000 | 正常关闭 |
| 1001 | 服务端关闭（going away）|
| 1002 | 协议错误 |
| 1003 | 不支持的数据类型 |
| 1007 | 编码错误 |
| 1008 | 策略违规 |
| 1009 | 消息过大 |
| 1010 | 必需的扩展缺失 |
| 1011 | 服务端异常 |
| 1000-2999 | 保留给协议定义 |
| 3000-3999 | 保留给库/框架 |
| 4000-4999 | 应用自定义 |

---

## 7. 实战案例

### 7.1 抓取本地 WebSocket 流量

**环境：**

- 本地 WebSocket 服务端：端口 8080
- 客户端：Chrome 浏览器
- 抓包工具：Wireshark

**步骤：**

1. **启动 Wireshark**，选择 `lo` 接口

2. **开始抓包**

3. **触发 WebSocket 连接**

   ```javascript
   const ws = new WebSocket('ws://127.0.0.1:8080/echo');
   
   ws.onopen = () => {
     console.log('Connected');
     ws.send('Hello');
   };
   
   ws.onmessage = (event) => {
     console.log('Received:', event.data);
   };
   ```

4. **在 Wireshark 中过滤**

   ```
   tcp.port == 8080 and ip.addr == 127.0.0.1
   ```

5. **观察握手**：找到 HTTP 101 响应

6. **观察数据帧**：找到 WebSocket 帧

7. **停止抓包**，保存 PCAP 文件

### 7.2 分析 WebSocket 聊天应用

**场景：** 抓取一个实时聊天应用的 WebSocket 流量

**抓包要点：**

1. 过滤 WebSocket 文本帧：
   ```
   ws.opcode == 1 and ws.payload.len > 0
   ```

2. 分析消息格式（JSON）：
   ```json
   {"type":"message","from":"Alice","content":"Hi!"}
   {"type":"message","from":"Bob","content":"Hello!"}
   ```

3. 追踪用户行为：
   - 发言频率
   - 消息大小
   - 连接时长

### 7.3 排查 WebSocket 连接失败

**问题：** WebSocket 连接失败，无法建立

**排查流程：**

1. **检查 TCP 连接**
   ```
   tcp.flags.reset == 1  # 查找 TCP 重置包
   ```

2. **检查握手请求**
   ```
   http.request.method == "GET" and http.connection == "Upgrade"
   ```

3. **检查响应码**
   ```
   http.response.code >= 400
   ```

4. **常见失败原因：**

   | 错误码 | 原因 |
   |--------|------|
   | 400 Bad Request | Sec-WebSocket-Key 计算错误 |
   | 401 Unauthorized | 需要认证 |
   | 403 Forbidden | IP 被禁止 |
   | 404 Not Found | 路径错误 |
   | 500 Internal Server Error | 服务端异常 |

---

## 8. 参考资料

- [Wireshark 官方文档](https://www.wireshark.org/docs/)
- [RFC 6455 - The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Wireshark WebSocket 过滤器文档](https://www.wireshark.org/docs/dfref/ws/ws.html)
- [WebSocket 协议详解 - 博客园](https://www.cnblogs.com/wangjunjiehome/p/16279601.html)
- [Wireshark 抓包分析 WebSocket](https://zhuanlan.zhihu.com/p/91488033)

---

## 附录：常用 Wireshark 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+F` | 搜索数据包 |
| `Ctrl+E` | 停止/开始抓包 |
| `Ctrl+R` | 重新加载抓包文件 |
| `Ctrl+G` | 跳转到指定包 |
| `Ctrl+Shift+T` | 追踪 TCP 流 |
| `Ctrl+Shift+U` | 追踪 UDP 流 |
| `Ctrl+W` | 追踪 WebSocket 流 |
| `+` / `-` | 放大/缩小字体 |

---

*本文档由 Walle 根据 Jarvis 委派任务生成，包含 Wireshark + WebSocket 调试完整指南。*
