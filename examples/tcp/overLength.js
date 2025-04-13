const net = require('net')

const server = net.createServer((socket) => {
  console.log('客户端已连接')

  socket.on('data', (data) => {
    console.log(`服务器收到: ${data.length} 字节`)
    socket.write(`收到: ${data.length} 字节`)
  })

  socket.on('end', () => {
    console.log('客户端已断开')
  })

  socket.on('error', (err) => {
    console.error('Socket error:', err)
  })
})

server.listen(41234, () => {
  console.log('服务器已启动，监听端口 41234')
})

const client = net.createConnection({ port: 41234 }, () => {
  console.log('已连接到服务器')

  // 由于支持流所以服务器端可以接收大于 64KB 的数据，而 udp 不行
  const message = Buffer.alloc(100 * 2 ** 10, 'A') // 10KB

  client.write(message, (err) => {
    if (err) console.error('发送错误:', err)
    else console.log('客户端消息已发送')
    client.end()
  })
})

client.on('data', (data) => {
  console.log(`客户端收到: ${data.length} 字节`)
  client.end()
})

client.on('end', () => {
  console.log('已从服务器断开')
})

client.on('error', (err) => {
  console.error('连接错误:', err)
})
