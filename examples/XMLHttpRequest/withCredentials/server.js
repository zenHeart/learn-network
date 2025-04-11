const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;
const HTML_PORT = 8081; // 新的 HTML 服务器端口
// 允许的源列表
const ALLOWED_ORIGINS = [
   "http://localhost:8080",
   "http://127.0.0.1:8080",
   "http://127.0.0.1:8081",
   "http://localhost:8081",
];

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

const server = http.createServer((req, res) => {
   // 打印请求信息，便于调试
   console.log(`${req.method} ${req.url}`);
   console.log("Headers:", req.headers);

   // 获取请求源
   const origin = req.headers.origin;
   console.log("Origin:", origin);

   // 在服务器的请求处理函数开头部分
   if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      console.log(`设置CORS响应头: 允许来源 ${origin}，允许凭证`);
   } else {
      // 对于非允许的来源，不设置CORS头，这会导致请求失败，但这是合理的安全措施
      console.warn(`拒绝未授权的来源请求: ${origin}`);
      // 不设置任何CORS头
   }

   res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
   res.setHeader("Access-Control-Allow-Headers", "Content-Type");

   // Handle preflight OPTIONS requests
   if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
   }

   // 处理静态文件请求
   if (req.url === "/" || !req.url.startsWith("/api/")) {
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
      return;
   }

   // API 路由处理
   // Set content type to JSON for API responses
   res.setHeader("Content-Type", "application/json");

   // Parse cookies from request
   const cookies = parseCookies(req);
   console.log("Received cookies:", cookies);

   if (req.url === "/api/set-cookie") {
      // 改进Cookie设置，确保跨域可用
      const cookieOptions = [
         "testCookie=withCredentialsDemo",
         "Path=/",
         "Max-Age=3600"
      ];

      // 根据请求的协议决定是否添加 SameSite 和 Secure
      const isSecure = req.headers['x-forwarded-proto'] === 'https' || req.connection.encrypted;

      if (origin && origin !== "null") {
         // 如果请求不是来自同源
         if (isSecure) {
            // 安全连接可以使用 SameSite=None
            cookieOptions.push("SameSite=None");
            cookieOptions.push("Secure");
         } else {
            // 非安全连接使用 SameSite=Lax
            cookieOptions.push("SameSite=Lax");
         }
      }

      // 打印详细的Cookie设置信息
      const cookieString = cookieOptions.join("; ");
      res.setHeader("Set-Cookie", cookieString);
      console.log("Setting cookie with options:", cookieString);

      // 调试响应信息
      res.writeHead(200);
      res.end(
         JSON.stringify({
            message: "Cookie has been set!",
            cookieSet: true,
            cookieOptions: cookieString,
            note: "如果使用HTTP协议，一些现代浏览器可能拒绝接受设置SameSite=None且无Secure标志的Cookie",
            debug: {
               origin,
               headers: req.headers,
               responseHeaders: {
                  "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin"),
                  "Access-Control-Allow-Credentials": res.getHeader("Access-Control-Allow-Credentials"),
                  "Set-Cookie": cookieString
               }
            }
         })
      );
   } else if (req.url === "/api/check-cookie") {
      // 详细记录Cookie接收情况
      console.log("Check-cookie request headers:", req.headers);
      console.log("Cookie header:", req.headers.cookie);

      const hasCookie = cookies.hasOwnProperty("testCookie");
      console.log("Cookie check result:", hasCookie, "Cookies found:", Object.keys(cookies));

      res.writeHead(200);
      res.end(
         JSON.stringify({
            hasCookie,
            cookieValue: hasCookie ? cookies.testCookie : null,
            allCookies: cookies,
            requestHeaders: {
               cookie: req.headers.cookie || "(none)",
               origin: req.headers.origin || "(none)"
            },
            responseHeaders: {
               "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin"),
               "Access-Control-Allow-Credentials": res.getHeader("Access-Control-Allow-Credentials")
            }
         })
      );
   } else {
      // Default route
      res.writeHead(200);
      res.end(
         JSON.stringify({
            message: "withCredentials Cookie Test Server",
            endpoints: {
               setCookie: "/api/set-cookie",
               checkCookie: "/api/check-cookie",
               staticHtml: "/index.html",
            },
            cookies,
         })
      );
   }
});

// Helper function to parse cookies from request headers
function parseCookies(req) {
   const cookies = {};
   const cookieHeader = req.headers.cookie;

   if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
         const parts = cookie.split("=");
         const name = parts[0].trim();
         const value = parts.slice(1).join("=").trim(); // 处理值中可能包含=的情况
         cookies[name] = value;
      });
   }

   return cookies;
}

server.listen(PORT, () => {
   console.log(`Cookie test server running at http://localhost:${PORT}`);
   console.log(
      "CORS is configured to allow credentials, including file:// protocol"
   );
   console.log("Available endpoints:");
   console.log("  - GET /api/set-cookie  : Sets a test cookie");
   console.log("  - GET /api/check-cookie: Checks if the test cookie exists");
   console.log("  - GET /                : Serves index.html");
});

// 创建一个新的服务器来单独服务 HTML 文件
const htmlServer = http.createServer((req, res) => {
   if (req.url === "/") {
      const filePath = path.join(__dirname, "index.html");
      fs.readFile(filePath, (err, content) => {
         if (err) {
            res.writeHead(500);
            res.end("500 Internal Server Error");
            return;
         }

         res.writeHead(200, { "Content-Type": "text/html" });
         res.end(content);
         console.log(`Served HTML file: ${filePath}`);
      });
   } else {
      res.writeHead(404);
      res.end("404 Not Found");
   }
});

htmlServer.listen(HTML_PORT, () => {
   console.log(`HTML server running at http://localhost:${HTML_PORT}`);
   console.log("Serving index.html");
});
