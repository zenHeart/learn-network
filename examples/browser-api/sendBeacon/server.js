const express = require("express");
const app = express();
const port = 3000;

// 解析 JSON 和 form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 提供静态文件
app.use(express.static(__dirname));

// 处理基本日志
app.post("/log", (req, res) => {
  console.log("收到基本日志:", req.body);
  res.sendStatus(204);
});

// 处理分析数据
app.post("/analytics", (req, res) => {
  console.log("收到页面退出数据:", req.body);
  res.sendStatus(204);
});

// 处理性能数据
app.post("/performance", (req, res) => {
  console.log("收到性能数据:", req.body);
  res.sendStatus(204);
});

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
