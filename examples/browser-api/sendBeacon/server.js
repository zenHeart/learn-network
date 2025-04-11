const express = require("express");
const multer = require("multer"); // 用于处理 multipart/form-data
const app = express();
const port = 3000;

// 创建 multer 实例
const upload = multer();

// 解析 JSON 请求
app.use(
  express.json({
    type: ["application/json", "text/plain"], // 同时处理 text/plain 类型的 JSON 数据
  })
);

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

// 提供静态文件
app.use(express.static(__dirname));

// 通用日志函数
const logRequest = (req) => {
  console.log("请求头 Content-Type:", req.headers["content-type"]);
  console.log("请求体:", req.body);
};

// 处理基本日志
app.post("/log", (req, res) => {
  try {
    let data = req.body;
    // 如果收到的是字符串，尝试解析为 JSON
    if (typeof req.body === "string") {
      data = JSON.parse(req.body);
    }
    console.log("收到基本日志:", data);
    res.sendStatus(204);
  } catch (error) {
    console.error("处理基本日志错误:", error);
    res.sendStatus(400);
  }
});

// 处理分析数据
app.post("/analytics", (req, res) => {
  try {
    let data = req.body;
    if (typeof req.body === "string") {
      data = JSON.parse(req.body);
    }
    console.log("收到页面退出数据:", data);
    res.sendStatus(204);
  } catch (error) {
    console.error("处理页面退出数据错误:", error);
    res.sendStatus(400);
  }
});

// 处理性能数据 - 使用 multer 处理 multipart/form-data
app.post("/performance", upload.none(), (req, res) => {
  try {
    console.log("收到性能数据:", {
      type: req.body.type,
      timing: JSON.parse(req.body.timing || "{}"),
    });
    res.sendStatus(204);
  } catch (error) {
    console.error("处理性能数据错误:", error);
    res.sendStatus(400);
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error("服务器错误:", err);
  res.status(500).send("服务器内部错误");
});

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
