const dgram = require('dgram')

// 创建 UDP 服务端
const server = dgram.createSocket('udp4')
server.on('message', (msg, rinfo) => {
  console.log(`服务器收到: ${msg.length} 字节 来自 ${rinfo.address}:${rinfo.port}`)
  server.send(`收到: ${msg.length} 字节`, rinfo.port, rinfo.address)
})
server.bind(41234, () => {
  console.log('服务器已启动，监听端口 41234')
})

// 创建 UDP 客户端
const client = dgram.createSocket('udp4')

// 添加客户端消息处理
client.on('message', (msg, rinfo) => {
  console.log(`客户端收到: ${msg.length} 字节 来自 ${rinfo.address}:${rinfo.port}`)
  // 收到服务器响应后关闭客户端
  client.close()
})

// 创建一个大于 64KB 的 buffer
const message = Buffer.alloc(10 * 2 ** 10, 'A') // 65537 字节 = 64KB + 1 字节

client.send(message, 41234, 'localhost', (err) => {
  if (err) console.error(err)
  else console.log('客户端消息已发送')
})
