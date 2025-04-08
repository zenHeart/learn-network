const tls = require("tls");
const fs = require("fs");
const path = require("path");

const options = {
  key: fs.readFileSync(path.join(__dirname, "cert/server.key")),
  cert: fs.readFileSync(path.join(__dirname, "cert/server.crt")),
  // 添加延迟以便更容易观察握手过程
  handshakeTimeout: 5000,
  // 指定 TLS 版本
  minVersion: process.env.TLS_VERSION || "TLSv1.3",
  maxVersion: process.env.TLS_VERSION || "TLSv1.3",
};

const server = tls.createServer(options, (socket) => {
  console.log("服务器：客户端已连接");

  socket.on("data", (data) => {
    console.log("服务器收到数据:", data.toString());
    socket.write("你好，客户端！");
  });

  socket.on("end", () => {
    console.log("服务器：客户端断开连接");
  });
});

server.listen(8443, () => {
  console.log("TLS 服务器监听端口 8443");
});
