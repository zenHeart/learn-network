const express = require('express')
const app = express();



// 规范 JSONP 的请求方式
app.get('/jsonp/:callbackId',function(req,res) {
	let {callbackId} = req.params;
	req.query.callback=`jsonp.${callbackId}`
	res.jsonp(callbackId);
})
// 验证 jsonp
app.get('/',function(req,res) {
	res.jsonp(`<h1>demo</h1>`);
})
const PORT = process.env.PORT || 3000;
app.listen(PORT,() => {
	console.log(`listen start ${PORT}`)
})