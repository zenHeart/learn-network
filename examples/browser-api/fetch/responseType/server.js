const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;

// MIME 类型映射
const MIME_TYPES = {
   ".html": "text/html",
   ".css": "text/css",
   ".js": "text/javascript",
   ".json": "application/json",
   ".png": "image/png",
   ".jpg": "image/jpeg",
   ".gif": "image/gif",
   ".svg": "image/svg+xml",
   ".xml": "application/xml",
   ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
   // 打印请求信息，便于调试
   console.log(`${req.method} ${req.url}`);

   // 处理静态文件请求
   let filePath = req.url;

   // 默认路径处理
   if (req.url === "/") {
      filePath = "/index.html";
   }

   // 处理相对路径，确保安全访问
   const safePath = path.normalize(path.join(__dirname, filePath));

   // 安全检查：确保路径不会跳出基本目录
   if (!safePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end("Forbidden: Invalid path");
      return;
   }

   fs.readFile(safePath, (err, content) => {
      if (err) {
         if (err.code === "ENOENT") {
            // 文件不存在
            console.log(`File not found: ${safePath}`);
            res.writeHead(404);
            res.end("404 Not Found");
         } else {
            // 服务器错误
            console.error(`Server error: ${err}`);
            res.writeHead(500);
            res.end("500 Internal Server Error");
         }
         return;
      }

      // 获取文件扩展名并确定MIME类型
      const ext = path.extname(safePath);
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      // 发送文件内容
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
      console.log(`Served static file: ${safePath} (${contentType})`);
   });
});

// 确保data目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
   fs.mkdirSync(dataDir, { recursive: true });
}

// 创建示例文件
const createSampleFiles = () => {
   // 创建JSON示例文件
   const sampleJson = {
      "title": "Sample JSON",
      "description": "这是一个JSON示例文件",
      "items": [
         { "id": 1, "name": "项目1" },
         { "id": 2, "name": "项目2" },
         { "id": 3, "name": "项目3" }
      ],
      "success": true,
      "count": 3
   };
   fs.writeFileSync(
      path.join(dataDir, 'sample.json'),
      JSON.stringify(sampleJson, null, 2)
   );

   // 创建文本示例文件
   fs.writeFileSync(
      path.join(dataDir, 'sample.txt'),
      "这是一个简单的文本文件示例。\n用于测试XMLHttpRequest的responseType='text'功能。\n可以处理纯文本内容。"
   );

   // 如果没有图像文件，创建简单图片或提示信息
   const imgPath = path.join(dataDir, 'sample.jpg');
   if (!fs.existsSync(imgPath)) {
      console.log("注意: sample.jpg不存在，请手动添加一张测试图片到data目录");
      // 写入提示文件
      fs.writeFileSync(
         imgPath,
         Buffer.from('这不是一个真正的JPG文件，请替换为真实图片以获得更好体验', 'utf8')
      );
   }
};

// 创建示例文件
createSampleFiles();

server.listen(PORT, () => {
   console.log(`responseType 测试服务器运行在 http://localhost:${PORT}`);
   console.log(`可以访问 http://localhost:${PORT} 开始测试`);
});
