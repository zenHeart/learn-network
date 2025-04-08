const http = require("http");
const crypto = require("crypto");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("这是一个 WebSocket 服务器");
});

server.on("upgrade", function (req, socket, head) {
  console.log("收到 WebSocket 升级请求：", {
    headers: req.headers,
    url: req.url,
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
  socket.on("data", (data) => {
    console.log("收到数据：", data);
  });

  socket.on("error", (error) => {
    console.error("WebSocket 错误：", error.message);
  });

  socket.on("close", (hadError) => {
    console.log(
      "WebSocket 连接关闭",
      hadError ? "（发生错误）" : "（正常关闭）"
    );
  });
});

server.listen(8080, () => {
  console.log("WebSocket 服务器运行在 http://localhost:8080");
});
