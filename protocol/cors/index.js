var express = require('express')
var cors = require('cors')
var app = express()
var app1 = express();

app.use(cors())

app.get('/',function (req, res, next) {
	res.send({
		data:`random data ${~~(Math.random()*100)}`
	})
})

app.listen(3000, function () {
  console.log('CORS-enabled web server listening on port 3000')
})

app1.use(express.static('static'))
app1.listen(3001,function() {
	console.log('static server start on port 3001');
})