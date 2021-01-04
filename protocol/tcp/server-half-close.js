const net= require('net')
const { Socket } = net

function creatClient() {
  const client = new Socket()

  client.connect({
    port: '10001'
  })

  client.on('ready', function() {
    console.log('agrs:' ,arguments)
    client.end(() => {
      console.log('close half')
    })
  })
}


const server = net.createServer((socket) => {
  console.log('connected')
  socket.on('close' , function() {
    console.log('socket close')
  })
  // socket.end('goodbye\n');
}).on('error', (err) => {
  // Handle errors here.
  throw err;
});

server.listen(10001, () => {
  console.log('opened server on', server.address());
});

creatClient();

