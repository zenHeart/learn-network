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
};

// 创建一个模拟大文件用于下载测试
const createLargeFile = () => {
   const filePath = path.join(__dirname, 'large-test-file.bin');
   const fileSize = 5 * 1024 * 1024; // 5MB

   // 如果文件已存在且大小正确，则不重新创建
   try {
      const stats = fs.statSync(filePath);
      if (stats.size === fileSize) {
         console.log(`测试文件已存在: ${filePath} (${formatSize(fileSize)})`);
         return filePath;
      }
   } catch (err) {
      // 文件不存在，将创建新文件
   }

   console.log(`正在创建测试文件: ${filePath} (${formatSize(fileSize)})`);

   // 创建一个包含随机数据的缓冲区
   const buffer = Buffer.alloc(fileSize);
   for (let i = 0; i < fileSize; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
   }

   // 写入文件
   fs.writeFileSync(filePath, buffer);
   console.log(`测试文件创建完成`);
   return filePath;
};

// 格式化文件大小
function formatSize(bytes) {
   const units = ['B', 'KB', 'MB', 'GB', 'TB'];
   let size = bytes;
   let unitIndex = 0;

   while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
   }

   return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 创建测试文件
const largeFilePath = createLargeFile();

const server = http.createServer((req, res) => {
   // 打印请求信息调试
   console.log(`${req.method} ${req.url}`);

   // 设置基本的CORS头
   res.setHeader("Access-Control-Allow-Origin", "*");
   res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
   res.setHeader("Access-Control-Allow-Headers", "Content-Type");

   // 处理OPTIONS请求
   if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
   }

   // 提供大文件下载
   if (req.url === '/download-test-file') {
      const stat = fs.statSync(largeFilePath);

      res.writeHead(200, {
         'Content-Type': 'application/octet-stream',
         'Content-Length': stat.size,
         'Content-Disposition': 'attachment; filename=large-test-file.bin'
      });

      const readStream = fs.createReadStream(largeFilePath);
      readStream.pipe(res);
      return;
   }

   // 处理静态文件请求
   if (req.url === "/" || req.url === "/index.html" || req.url.endsWith('.js') || req.url.endsWith('.css')) {
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
         console.log(`提供静态文件: ${safePath} (${contentType})`);
      });
      return;
   }

   // 默认响应
   res.writeHead(404);
   res.end("404 Not Found");
});

server.listen(PORT, () => {
   console.log(`服务器运行在 http://localhost:${PORT}`);
   console.log(`下载测试文件访问: http://localhost:${PORT}/download-test-file`);
   console.log(`网页访问: http://localhost:${PORT}/`);
});
