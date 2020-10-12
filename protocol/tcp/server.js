const net= require('net')
const server = net.createServer((socket) => {
  console.log('connected')
  // socket.end('goodbye\n');
}).on('error', (err) => {
  // Handle errors here.
  throw err;
});

server.listen(10001, () => {
  console.log('opened server on', server.address());
});