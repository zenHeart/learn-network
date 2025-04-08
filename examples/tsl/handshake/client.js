const tls = require("tls");

const options = {
  // 在测试环境中禁用证书验证
  rejectUnauthorized: false,
  // 添加延迟以便更容易观察握手过程
  handshakeTimeout: 5000,
};

const socket = tls.connect(8443, "localhost", options, () => {
  console.log("客户端：已连接到服务器");
  console.log("连接是否已授权:", socket.authorized);

  socket.write("你好，服务器！");
});

socket.on("data", (data) => {
  console.log("客户端收到数据:", data.toString());
  socket.end();
});

socket.on("end", () => {
  console.log("客户端：连接已关闭");
});

socket.on("error", (error) => {
  console.error("连接错误:", error);
});
