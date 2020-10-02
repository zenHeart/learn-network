var express = require('express')
var app = express()
var app1 = express();
var bodyParser = require('body-parser')
var { simple, preflight ,preflightOption} = require('./handle')

// 简单请求
app.use('/simple', bodyParser.text());
app.get('/simple',simple)
app.post('/simple',simple)

// 预检请求
app.use('/preflight', bodyParser.json())
app.options('/preflight',preflightOption)
app.use('/preflight',preflight)


app.listen(3000, function () {
  console.log('CORS-enabled web server listening on port 3000')
})
// 默认地址 
app1.use(express.static('static'))
app1.listen(3001,function() {
	console.log('static server start on port 3001');
})
app1.get('/',(req,res) => {
	res.send(200)
})