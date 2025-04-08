# websocket

## 要求

1. 添加一个基本示例说明 websocket 握手流程
2. 确保该握手足够简单，可以通过 wireshark 抓包解释握手细节
3. 确保以当前文件所在目录为根目录，添加文件
4. 采用 node 编写确保尽可能不依赖三方包

## 使用说明

1. 启动服务器：

```bash
node server.js
```

2. 在浏览器中打开 client.html 文件

3. 使用 Wireshark 抓包分析握手过程：
   - 过滤器使用：`tcp.port == 8080`
   - 可以观察到以下握手流程：
     - 客户端发送 HTTP 升级请求
     - 服务器响应 101 Switching Protocols
     - WebSocket 连接建立

## 握手流程说明

1. 客户端发送包含以下头部的 HTTP 请求：

   - Upgrade: websocket
   - Connection: Upgrade
   - Sec-WebSocket-Key: [随机生成的 base64 字符串]
   - Sec-WebSocket-Version: 13

2. 服务器响应：
   - HTTP/1.1 101 Switching Protocols
   - Upgrade: websocket
   - Connection: Upgrade
   - Sec-WebSocket-Accept: [根据客户端 key 计算的值]

## 心跳保活

浏览器在 TCP 维度会在底层开启 KEEPALIVE 选项，保持 TCP 连接的活跃性。这个时间在非移动端默认是 45s ，详细代码查看 [kTCPKeepAliveSeconds](https://source.chromium.org/chromium/chromium/src/+/main:net/socket/tcp_socket_posix.cc;l=435;bpv=1;bpt=1)
