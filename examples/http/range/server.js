const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const filePath = path.join(__dirname, 'sample.txt'); // Replace with your file
const clientFilePath = path.join(__dirname, 'client.html'); // Path to client.html

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/client.html') {
    // Serve the client.html file
    fs.readFile(clientFilePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Error loading client.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.method === 'GET' && req.headers.range) {
    // Handle range requests
    const range = req.headers.range;
    const stats = fs.statSync(filePath);
    const total = stats.size;

    const [start, end] = range.replace(/bytes=/, '').split('-');
    const chunkStart = parseInt(start, 10);
    const chunkEnd = end ? parseInt(end, 10) : total - 1;

    if (chunkStart >= total || chunkEnd >= total) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` });
      return res.end();
    }

    res.writeHead(206, {
      'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkEnd - chunkStart + 1,
      'Content-Type': 'application/octet-stream',
    });

    const stream = fs.createReadStream(filePath, { start: chunkStart, end: chunkEnd });
    stream.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Range header not provided');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

module.exports = server;