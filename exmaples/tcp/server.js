const net= require('net')
const { Socket } = net

exports.creatClient =  function creatClient() {
  const client = new Socket()

  client.connect({
    port: '10001'
  })
  
  client.on('ready', function() {
    console.log('agrs:' ,arguments)
  })
}


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

creatClient();

