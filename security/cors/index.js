var express = require('express')
var cors = require('cors')
var app = express()

app.use(cors())

app.post('/trustClaimUse/trustClaimFileUpload', function (req, res, next) {
  res.json({
      code:0,
      msg:'sdf',
      data:'dfs'
  })
})

app.listen(3000, function () {
  console.log('CORS-enabled web server listening on port 3000')
})