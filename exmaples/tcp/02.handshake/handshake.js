const net = require('net');

function createClient() {
  const client = new net.Socket();

  client.connect({ port: 10001 }, () => {
    console.log('Client connected');
  });

  client.on('close', () => {
    console.log('Connection closed');
  });
}

const server = net.createServer((socket) => {
  console.log('Client connected');

  socket.on('end', () => {
    console.log('Client disconnected');
  });

}).on('error', (err) => {
  throw err;
});

server.listen(10001, () => {
  console.log('Server listening on port 10001');
  createClient();
});