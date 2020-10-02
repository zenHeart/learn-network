exports.simple = function (req, res) {
  // 简单请求也可以传递 POST
  console.dir(req.body)
	if(req.query.allowOrigin) {
		res.header("Access-Control-Allow-Origin", req.query.allowOrigin); // update to match the domain you will make the request from
  }
	if(req.query.withCrendential) {
		res.header("Access-Control-Allow-Credentials", req.query.withCrendential); // update to match the domain you will make the request from
	}

	// 允许浏览器访问自定义请求头
	res.header("Customer-Header", '1'); // update to match the domain you will make the request from
	res.header("Customer-Header1", '2'); // update to match the domain you will make the request from
	if(req.query.customHeader) {
		res.header("Access-Control-Expose-Headers", req.query.customHeader); // update to match the domain you will make the request from
	}
	res.send({
		data:`random data ${~~(Math.random()*100)}`
	})
}


exports.preflightOption = function(req,res) {
  // TODO: 注意即使未包含 POST 和 GET 请求浏览器也不限制
  res.header('Access-Control-Allow-Methods', 'DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  // max-age 设置 options 请求的缓存时间
  res.header('Access-Control-Max-Age',5);

  // 注意预检请求若为 credential 模式下列字段必须携带
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.header("Access-Control-Allow-Credentials", true); // update to match the domain you will make the request from

  res.send(200);
}

exports.preflight =  function (req, res) {
	let data = req.body;
	console.dir(data);
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
	
	if(data.allowOrigin) {
		res.header("Access-Control-Allow-Origin", data.allowOrigin); // update to match the domain you will make the request from
	}
	if(data.withCrendential) {
		res.header("Access-Control-Allow-Credentials", data.withCrendential); // update to match the domain you will make the request from
	}


	// 允许浏览器访问自定义请求头
	res.header("Customer-Header", '1'); // update to match the domain you will make the request from
	res.header("Customer-Header1", '2'); // update to match the domain you will make the request from
	if(data.customHeader) {
		res.header("Access-Control-Expose-Headers", data.customHeader); // update to match the domain you will make the request from
  }
	res.send({
		data:`random data ${~~(Math.random()*100)}`
	})
}