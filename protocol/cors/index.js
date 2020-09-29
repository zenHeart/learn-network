var express = require('express')
var app = express()
var app1 = express();

app.get('/',function (req, res) {
	console.dir()
	if(req.query.allowOrigin) {
		res.header("Access-Control-Allow-Origin", req.query.allowOrigin); // update to match the domain you will make the request from
	}
	res.send({
		data:`random data ${~~(Math.random()*100)}`
	})
})

app.listen(3000, function () {
  console.log('CORS-enabled web server listening on port 3000')
})

// 默认地址 
app1.use(express.static('static'))
app1.listen(3001,function() {
	console.log('static server start on port 3001');
})