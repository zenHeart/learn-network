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

// 创建上传目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
   fs.mkdirSync(uploadDir, { recursive: true });
   console.log(`创建上传目录: ${uploadDir}`);
}

const server = http.createServer((req, res) => {
   // 打印请求信息调试
   console.log(`${req.method} ${req.url}`);

   // 设置基本的CORS头
   res.setHeader("Access-Control-Allow-Origin", "*");
   res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
   res.setHeader("Access-Control-Allow-Headers", "Content-Type");

   // 处理OPTIONS请求
   if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
   }

   // 处理上传请求
   if (req.method === 'POST' && req.url === '/upload') {
      const contentType = req.headers['content-type'];

      // 检查是否是multipart/form-data请求
      if (!contentType || !contentType.includes('multipart/form-data')) {
         res.writeHead(400);
         res.end('Bad Request: Expected multipart/form-data');
         return;
      }

      // 获取boundary
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
         res.writeHead(400);
         res.end('Bad Request: No boundary in multipart/form-data');
         return;
      }

      // 创建唯一的文件名
      const timestamp = Date.now();
      const uploadedFilePath = path.join(uploadDir, `uploaded_file_${timestamp}`);
      const fileStream = fs.createWriteStream(uploadedFilePath);

      let totalBytes = 0;
      const contentLength = parseInt(req.headers['content-length'], 10);

      console.log(`开始接收上传，预计大小: ${formatSize(contentLength)}`);

      // 处理数据流
      req.on('data', (chunk) => {
         totalBytes += chunk.length;
         fileStream.write(chunk);

         // 打印上传进度
         const progress = Math.round((totalBytes / contentLength) * 100);
         console.log(`上传进度: ${progress}% (${formatSize(totalBytes)}/${formatSize(contentLength)})`);
      });

      req.on('end', () => {
         fileStream.end();
         console.log(`文件上传完成: ${uploadedFilePath} (${formatSize(totalBytes)})`);

         res.writeHead(200);
         res.end(JSON.stringify({
            status: 'success',
            message: '文件上传成功',
            size: totalBytes
         }));
      });

      req.on('error', (err) => {
         console.error('上传错误:', err);
         fileStream.end();

         res.writeHead(500);
         res.end(JSON.stringify({
            status: 'error',
            message: '上传失败: ' + err.message
         }));
      });

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
   console.log(`上传端点: http://localhost:${PORT}/upload`);
   console.log(`网页访问: http://localhost:${PORT}/`);
});
