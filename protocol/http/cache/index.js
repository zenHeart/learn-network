var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var handles = require('./handle')

// 设置缓存
app.use('/cache', bodyParser.json());
app.get('/cache',handles.cache)
app.post('/cache',handles.cache)

app.use(express.static('static'))


app.listen(3000, function () {
  console.log(`server listening on port http://localhost:3000`)
})
app.get('/',(req,res) => {
	res.send(200)
})
