const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors());
// 添加静态文件服务
app.use(express.static(path.join(__dirname)));

// 存储所有连接的客户端
const clients = new Set();

// SSE 路由处理
app.get("/events", (req, res) => {
  // 设置 SSE 必要的响应头
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 设置重试时间为 10 秒
  res.write("retry: 10000\n\n");

  // 将新客户端添加到集合中
  clients.add(res);

  // 发送初始消息
  res.write(`data: ${JSON.stringify({ message: "连接成功！" })}\n\n`);

  // 定时发送数据更新
  const intervalId = setInterval(() => {
    const data = {
      time: new Date().toLocaleTimeString(),
      value: Math.random(),
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 3000);

  // 客户端断开连接时的处理
  req.on("close", () => {
    clients.delete(res);
    clearInterval(intervalId);
  });
});

// 自定义事件发送
app.get("/trigger-notification", (req, res) => {
  const notification = {
    type: "notification",
    message: "这是一个自定义通知！",
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client) => {
    client.write(
      `event: notification\ndata: ${JSON.stringify(notification)}\n\n`
    );
  });

  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
