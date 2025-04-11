const http2 = require("http2");
const fs = require("fs");
const path = require("path");

const PORT = 8443;

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
   const units = ["B", "KB", "MB", "GB", "TB"];
   let size = bytes;
   let unitIndex = 0;

   while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
   }

   return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 创建上传目录
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
   fs.mkdirSync(uploadDir, { recursive: true });
   console.log(`创建上传目录: ${uploadDir}`);
}

// 创建 HTTP/2 服务器
const server = http2.createSecureServer({
   key: fs.readFileSync(path.join(__dirname, "privkey.pem")),
   cert: fs.readFileSync(path.join(__dirname, "fullchain.pem")),
});

server.on("stream", (stream, headers) => {
   const method = headers[":method"];
   const url = headers[":path"];

   if (method === "POST" && url === "/upload") {
      const contentType = headers["content-type"];

      if (!contentType || !contentType.includes("application/octet-stream")) {
         stream.respond({ ":status": 400 });
         stream.end("Bad Request: Expected application/octet-stream");
         return;
      }

      const timestamp = Date.now();
      const uploadedFilePath = path.join(uploadDir, `uploaded_file_${timestamp}`);
      const fileStream = fs.createWriteStream(uploadedFilePath);

      let totalBytes = 0;
      console.log(headers)
      const contentLength = parseInt(headers["x-file-size"], 10);

      console.log(`开始接收上传，预计大小: ${contentLength} 字节`);

      stream.on("data", (chunk) => {
         totalBytes += chunk.length;
         fileStream.write(chunk);

         const progress = Math.round((totalBytes / contentLength) * 100);
         console.log(
            `上传进度: ${progress}% (${formatSize(totalBytes)} / ${formatSize(
               contentLength
            )})`
         );
      });

      stream.on("end", () => {
         fileStream.end();
         console.log(`文件上传完成: ${uploadedFilePath} (${totalBytes} 字节)`);

         stream.respond({ ":status": 200 });
         stream.end(
            JSON.stringify({
               status: "success",
               message: "文件上传成功",
               size: totalBytes,
            })
         );
      });

      stream.on("error", (err) => {
         console.error("上传错误:", err);
         fileStream.end();

         stream.respond({ ":status": 500 });
         stream.end(
            JSON.stringify({
               status: "error",
               message: "上传失败: " + err.message,
            })
         );
      });

      return;
   }

   // 处理静态文件请求
   if (method === "GET") {
      let filePath = url;

      // 默认路径处理
      if (url === "/") {
         filePath = "/index.html";
      }

      // 处理相对路径，确保安全访问
      const safePath = path.normalize(path.join(__dirname, filePath));

      // 安全检查：确保路径不会跳出基本目录
      if (!safePath.startsWith(__dirname)) {
         stream.respond({ ":status": 403 });
         stream.end("Forbidden: Invalid path");
         return;
      }

      fs.readFile(safePath, (err, content) => {
         if (err) {
            if (err.code === "ENOENT") {
               // 文件不存在
               console.log(`File not found: ${safePath}`);
               stream.respond({ ":status": 404 });
               stream.end("404 Not Found");
            } else {
               // 服务器错误
               console.error(`Server error: ${err}`);
               stream.respond({ ":status": 500 });
               stream.end("500 Internal Server Error");
            }
            return;
         }

         // 获取文件扩展名并确定MIME类型
         const ext = path.extname(safePath);
         const contentType = MIME_TYPES[ext] || "application/octet-stream";

         // 发送文件内容
         stream.respond({ ":status": 200, "content-type": contentType });
         stream.end(content);
         console.log(`提供静态文件: ${safePath} (${contentType})`);
      });
      return;
   }

   // 默认响应
   stream.respond({ ":status": 404 });
   stream.end("404 Not Found");
});

server.listen(PORT, () => {
   console.log(`HTTP/2 服务器运行在 https://localhost:${PORT}`);
});
