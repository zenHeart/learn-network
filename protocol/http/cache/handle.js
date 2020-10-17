const onHeaders = require('on-headers')
exports.cache = function (req, res) {
	if(req.query.cacheControl) {
		res.header("Cache-Control", req.query.cacheControl); // update to match the domain you will make the request from
	}
	res.send({
		data: `random data ${~~(Math.random()*100)}`
	})
}

function removeHeaders(res) {
  onHeaders(res, () => {
    res.removeHeader('ETag');
    // remove other headers ...
  });
}
exports.cachePost = function (req, res) {
  removeHeaders(res);
	if(req.query.cacheControl) {
		res.header("Cache-Control", req.query.cacheControl); // update to match the domain you will make the request from
	}
	res.send({
		data: `random data ${~~(Math.random()*100)}`
	})
}
