const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
// 允许任何来源请求，更灵活地处理开发环境
// 实际生产环境应该指定确切的源
let ALLOWED_ORIGINS = ['http://localhost', 'http://localhost:8080', 'http://127.0.0.1', 'http://127.0.0.1:8080'];

// MIME 类型映射
const MIME_TYPES = {
   '.html': 'text/html',
   '.css': 'text/css',
   '.js': 'text/javascript',
   '.json': 'application/json',
   '.png': 'image/png',
   '.jpg': 'image/jpeg',
   '.gif': 'image/gif',
   '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
   // 打印请求信息，便于调试
   console.log(`${req.method} ${req.url}`);
   console.log('Headers:', req.headers);

   // 获取请求源
   const origin = req.headers.origin;
   console.log('Origin:', origin);

   // 特殊处理 null origin (文件协议访问)
   // 在开发环境允许 null origin，生产环境应当禁止
   if (origin === 'null' || !origin) {
      res.setHeader('Access-Control-Allow-Origin', 'null');
   } else {
      res.setHeader('Access-Control-Allow-Origin', origin);
   }

   // 始终允许发送凭证
   res.setHeader('Access-Control-Allow-Credentials', 'true');
   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

   // Handle preflight OPTIONS requests
   if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
   }

   // 处理静态文件请求
   if (req.url === '/' || !req.url.startsWith('/api/')) {
      let filePath = req.url;

      // 默认路径处理
      if (req.url === '/') {
         filePath = '/withCredentials.html';
      }

      // 处理相对路径，确保安全访问
      const safePath = path.normalize(path.join(__dirname, filePath));

      // 安全检查：确保路径不会跳出基本目录
      if (!safePath.startsWith(__dirname)) {
         res.writeHead(403);
         res.end('Forbidden: Invalid path');
         return;
      }

      fs.readFile(safePath, (err, content) => {
         if (err) {
            if (err.code === 'ENOENT') {
               // 文件不存在
               console.log(`File not found: ${safePath}`);
               res.writeHead(404);
               res.end('404 Not Found');
            } else {
               // 服务器错误
               console.error(`Server error: ${err}`);
               res.writeHead(500);
               res.end('500 Internal Server Error');
            }
            return;
         }

         // 获取文件扩展名并确定MIME类型
         const ext = path.extname(safePath);
         const contentType = MIME_TYPES[ext] || 'application/octet-stream';

         // 发送文件内容
         res.writeHead(200, { 'Content-Type': contentType });
         res.end(content);
         console.log(`Served static file: ${safePath} (${contentType})`);
      });
      return;
   }

   // API 路由处理
   // Set content type to JSON for API responses
   res.setHeader('Content-Type', 'application/json');

   // Parse cookies from request
   const cookies = parseCookies(req);
   console.log('Received cookies:', cookies);

   if (req.url === '/api/set-cookie') {
      // 设置cookie时使用更兼容的配置
      // 注意: 对于 file:// 协议，浏览器通常有更严格的限制
      const cookieOptions = [
         'testCookie=withCredentialsDemo',
         'Path=/',
         'Max-Age=3600'
      ];

      // 仅在非 null origin 情况下添加 SameSite=None
      if (origin && origin !== 'null') {
         cookieOptions.push('SameSite=None');

         // 如果是HTTPS连接，添加Secure标志
         if (req.headers['x-forwarded-proto'] === 'https' || req.connection.encrypted) {
            cookieOptions.push('Secure');
         }
      }

      res.setHeader('Set-Cookie', cookieOptions.join('; '));
      console.log('Setting cookie:', cookieOptions.join('; '));

      res.writeHead(200);
      res.end(JSON.stringify({
         message: 'Cookie has been set!',
         cookieSet: true,
         cookieOptions: cookieOptions.join('; ')
      }));
   }
   else if (req.url === '/api/check-cookie') {
      // Check if our test cookie exists
      const hasCookie = cookies.hasOwnProperty('testCookie');
      console.log('Cookie check result:', hasCookie);

      res.writeHead(200);
      res.end(JSON.stringify({
         hasCookie,
         cookieValue: hasCookie ? cookies.testCookie : null,
         allCookies: cookies,
         requestHeaders: {
            cookie: req.headers.cookie || '(none)',
            origin: req.headers.origin || '(none)'
         }
      }));
   }
   else {
      // Default route
      res.writeHead(200);
      res.end(JSON.stringify({
         message: 'withCredentials Cookie Test Server',
         endpoints: {
            setCookie: '/api/set-cookie',
            checkCookie: '/api/check-cookie',
            staticHtml: '/withCredentials.html'
         },
         cookies
      }));
   }
});

// Helper function to parse cookies from request headers
function parseCookies(req) {
   const cookies = {};
   const cookieHeader = req.headers.cookie;

   if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
         const parts = cookie.split('=');
         const name = parts[0].trim();
         const value = parts.slice(1).join('=').trim(); // 处理值中可能包含=的情况
         cookies[name] = value;
      });
   }

   return cookies;
}

server.listen(PORT, () => {
   console.log(`Cookie test server running at http://localhost:${PORT}`);
   console.log('CORS is configured to allow credentials, including file:// protocol');
   console.log('Available endpoints:');
   console.log('  - GET /api/set-cookie  : Sets a test cookie');
   console.log('  - GET /api/check-cookie: Checks if the test cookie exists');
   console.log('  - GET /                : Serves withCredentials.html');
   console.log('  - GET /withCredentials.html: Serves the test HTML file');
   console.log('\nAccess the test page directly at http://localhost:8080/withCredentials.html');
});