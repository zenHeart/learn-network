var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var handles = require('./handle')
// 设置缓存
app.use('/cache', bodyParser.json());
app.get('/cache',handles.cache)
app.post('/cache',handles.cachePost)
const PORT = 3002;
app.use(express.static('static',{
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    if (path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public,max-age=86400');
    }
    if (path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'private,public,max-age=86400');
    }
  },
}))


app.listen(PORT, function () {
  console.log(`server listening on port http://localhost:${PORT}`)
})
app.get('/',(req,res) => {
	res.send(200)
})
