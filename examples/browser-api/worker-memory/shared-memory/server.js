// SharedArrayBuffer 需要 Cross-Origin-Isolation
// 运行此服务器：node server.js
// 然后访问：https://localhost:8443

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8443;
const options = {
  key: fs.readFileSync(path.join(__dirname, '../fetch/upload/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../fetch/upload/fullchain.pem')),
};

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = https.createServer(options, (req, res) => {
  // 设置 COEP 和 COOP 头以启用 Cross-Origin-Isolation
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 SharedArrayBuffer Server running at https://localhost:${PORT}/`);
  console.log(`📋 Required headers set:`);
  console.log(`   Cross-Origin-Embedder-Policy: require-corp`);
  console.log(`   Cross-Origin-Opener-Policy: same-origin`);
  console.log(`\n⚠️  Note: Self-signed certificates - accept the warning in your browser`);
});
