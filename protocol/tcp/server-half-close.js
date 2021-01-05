const net= require('net')
const { setImmediate, setInterval } = require('timers')
const { Socket } = net

function creatClient() {
  const client = new Socket({
    allowHalfOpen: true
  })

  client.connect({
    port: '10001'
  })

  client.on('ready', function() {
    console.log('agrs:' ,arguments)
    client.end(() => {
      console.log('close half')
    })
  })
  client.on('data', function(data) {
    console.log('receive:' , data)
    client.write('client send', data)
  })
}


const server = net.createServer({
  allowHalfOpen: true
}, (socket) => {
  console.log(`client connected`)
  socket.on('end' , function() {
    const data = Array.from({
      length: 1e3 + 1
    }).join('1')
    socket.write(data)
    console.log('write data', data)
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

