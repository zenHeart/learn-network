const net= require('net')
const { Socket } = net

const client = new Socket()

client.connect({
  port: '10001'
})

client.on('ready', function() {
  console.log('agrs:' ,arguments)
})