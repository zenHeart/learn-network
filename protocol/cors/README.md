# cors

**详细讲解 cors 协议**

----


## cors 的概念
由于安全原因浏览器的 `ajax` 会收到同源策略的限制。为了实现跨域的资源获取产生了 JSONP。但 JSONP 存在如下限制。
1. 只能使用 get 请求
2. 请求无法携带过多信息

基于上述原因 w3c 制定了 [cors 规范](https://www.w3.org/TR/cors/) 以实现 `ajax` 跨域请求资源的功能

## cors 详述

为了实现跨域,客户端在发送 http 请求时。会根据请求的类型存在两种 cors 请求类型

1. 简单请求
2. 预测请求

### 简单请求
简单请求需要同时满足如下条件
1. 请求方法的限制,只能是如下几种
	* HEAD
	* GET
	* POST
2. 请求头限制,只能设定如下请求头
	* Accept
	* Accept-Language
	* Content-Language
	* Content-Type
	* DPR
	* Downlink
	* Save-Data
	* Viewport-Width
	* Width
    > 后面几个头部用于指定客户端信息,详见 [HTTP Client Hints](https://httpwg.org/http-extensions/client-hints.html#dpr)
3. 内容限制,`Content-Type` 只能是如下类型
	* `text/plain`
	* `multipart/form-data`
	* `application/x-www-form-urlencoded`

简单请求会类似其他跨域请求只有一次请求响应。


## 参考资料
* [Developers don't understand CORS](https://fosterelli.co/developers-dont-understand-cors)
* [ ] [Using CORS](https://www.html5rocks.com/en/tutorials/cors/)

