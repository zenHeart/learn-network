const http = require("http");
const crypto = require("crypto");
const { parseWebSocketFrame, createCloseFrame } = require('../utils');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("这是一个 WebSocket 服务器");
});

server.on("upgrade", function (req, socket, head) {
  console.log("收到 WebSocket 升级请求：", {
    headers: req.headers,
    url: req.url,
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort
  });

  // 获取客户端发送的 Sec-WebSocket-Key
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    console.error("缺少 Sec-WebSocket-Key 头部");
    socket.destroy();
    return;
  }

  // 根据 WebSocket 协议规范计算 accept key
  const sha1 = crypto.createHash("sha1");
  sha1.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
  const acceptKey = sha1.digest("base64");

  // 发送握手响应头
  const headers = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    "Sec-WebSocket-Accept: " + acceptKey,
  ];

  socket.write(headers.join("\r\n") + "\r\n\r\n");
  console.log("WebSocket 握手成功");

  // 连接建立后的事件处理
  // 增加事件处理来收集更多信息
  socket.on("end", () => {
    console.log(`客户端 ${socket.remoteAddress}:${socket.remotePort} 发起了正常断开连接 (FIN)`);
  });

  socket.on("data", (data) => {

    console.log(`收到来自 ${socket.remoteAddress}:${socket.remotePort} 的数据`, data);

    try {
      // 简单转换buffer为字符串，实际应该解析WebSocket帧
      const frameObj = parseWebSocketFrame(data);

      console.log('转换后的字符串数据:%O', frameObj);

      // 检查是否包含close指令
      if (frameObj?.payload?.includes('close')) {
        console.log('收到close指令，主动关闭连接');
        const closeFrame = createCloseFrame(4001, 'Server closing for maintenance');
        socket.write(closeFrame, () => {
          socket.end(); // 发送完关闭帧后关闭连接
        });
      }
    } catch (err) {
      console.error('处理数据时出错:', err.message);
    }
  });

  socket.on("error", (error) => {
    console.error(`WebSocket 错误(${socket.remoteAddress}: ${socket.remotePort}): `, error.message);
  });

  socket.on("close", (hadError) => {
    console.log(
      `WebSocket 连接关闭(${socket.remoteAddress}: ${socket.remotePort})`,
      hadError ? "（发生错误）" : "（正常关闭）"
    );
  });

  // 设置TCP保活选项可以帮助检测断开
  // socket.setKeepAlive(true, 30000);
});

server.listen(8080, () => {
  console.log("WebSocket 服务器运行在 http://localhost:8080");
});
