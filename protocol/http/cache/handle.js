exports.cache = function (req, res) {
	if(req.query.cacheControl) {
		res.header("Cache-Control", req.query.cacheControl); // update to match the domain you will make the request from
	}
	res.send({
		data: `random data ${~~(Math.random()*100)}`
	})
}
