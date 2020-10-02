# cors

**详细讲解 cors 协议**

## CORS 概述
`ajax` 会受到浏览器同源策略的限制。 [CORS 规范 (coress orgin resource share)](https://www.w3.org/TR/CORS/) 解决了跨域下的资源共享的问题。

相比 JSONP， CORS 允许发送 `POST` 请求，并且结合 CORS 扩展的请求头，可以实现更加完善的跨域控制。

CORS 请求分为两种
* 简单请求（simple request）直接向服务端发送请求
* 预检请求 （preflight request） 在实际请求发出前，浏览器会向服务端发送 `Options` 请求

## 简单请求
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

简答请求会携带 `Orgin` 头部说明请求源。服务端的响应头部必须包含如下字段 [Access-Control-Allow-Origin](#Access-Control-Allow-Origin) 说明允许的跨域源。

## 预检请求
当检测为预检请求时浏览器会自动发送 `Options` 请求给服务端，服务端正确响应预检请求后，浏览器才会发送实际请求。流程如下图 ![](./preflight.svg)

`options` 请求会携带如下请求头

* `Access-Control-Request-Method` 发送允许的请求方法
* `Access-Control-Request-Headers` 发送允许的请求头

服务端对预检请求必须相应如下内容

* `Access-Control-Allow-Methods` 服务端支持的请求方法
* `Access-Control-Allow-Headers` 服务端支持的请求头
* `Access-Control-Allow-Origin` 服务端支持的跨域源

浏览器接收到服务端响应后，会先判断请求符合限制要求，弱不符合则不会触发实际请求直接跑出错误。

当请求符合服务端限制后，浏览器才会发送实际请求。
此时服务端仍需响应 `Access-Control-Allow-Origin` 字段，否则浏览器器仍会跑出错误。

> 注意 `Access-Control-Allow-Methods` 无法限制 GET，POST 请求


为了避免每次都需要发送 `Options` 请求进行预检，服务端在相应 `Options` 请求时可设置 `Access-Control-Max-Age` 申明 `Options` 请求的有效时间，在有效期内服务端会直接发送实际请求，当超过有效期后会重新发送 `Otpions` 请求进行预检，注意不同浏览器会有有效期到最大限制，详见 [Max-Age](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age)

## 请求凭证
默认 CORS 请求不会携带 `Cookie` 或 `Authentication` 等凭证信息，需要显示声明该配置，对于 `fetch` api 需申明 `credentials` 为 `include` 。此时服务端请求头必须包含 

`Access-Control-Allow-Credentials: true` 同时  `Access-Control-Allow-Origin` 的值必须和请求的 `	Origin` 相同才可生效。



## CORS 常用同步综述
### Access-Control-Allow-Origin
合法的值为 `<origin> | *`,当请求为 `credentials` 模式时，只允许返回 `origin` 请求不在设定的允许源中，会抛出 `has been blocked by CORS policy: The 'Access-Control-Allow-Origin'`

参考 [fetch credential](https://fetch.spec.whatwg.org/#concept-request-credentials-mode) `fetch` 请求包含三个值

* **omit** 所有请求移除 cookie 等凭证字段
* **same-origin** 同源请求保留凭证字段，默认值
* **include** 针对跨域请求保留凭证字段


### Access-Control-Allow-Credentials
当请求为 `credential` 模式时，服务端必须返回此请求头，并且值为 true。
否则浏览器会抛起该请求

### Access-Control-Expose-Headers
合法值为 `<header-name>[,<header-name>]* | *`
控制哪些请求头，在跨域返回的响应对象中可获取。默认支持参见 <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers#wikiArticle>


## 知识点
1. CORS 协议解决同源策略限制下，服务资源共享的问题
2. CORS 类别
   1. 简单请求，无 `options` 请求
   2. 预检请求，发送 `options` 请求作为预检
      1. 预检请求 `Options` 相应非法时，不会触发实际请求
3. 采用 `credentials` 使跨域请求携带 Cookie 等验证信息，浏览器需要显示设置 `credentials` 
   1. fetch 为 `include`
   2. XMLhttp 为 `true`
4. 核心请求头
   1. 请求头
      1. `Origin` 标识跨域请求
      2. `Access-Control-Request-Method` 预检请求设置允许的方法
      3. `Access-Control-Request-Headers` 预检请求设置允许的请求头
   2. 响应头
      1. `Access-Control-Allow-Orgin` 设置允许接收跨域请求的源
        1. 支持 `<Origin> | *` 模式
        2. 对于设置 `Credential` 的请求必须返回明确的 `<Orgin>`
      2. `Access-Control-Allow-Credentials` 携带凭证的请求必须包含此请求头，值需为 `true` 
      3. `Access-Control-Expose-Headers` 设置浏览器响应对象可以解析的额外请求头，支持 `<header-name>[,header-name] | *` 模式
      4. `Access-Control-Max-Age` 设置预检请求 `options` 的缓存时间
      5. `Access-Control-Allow-Methods` 设置预检请求允许的请求类型
         1. 只在预检请求 `Options` 中起作用，限制服务端允许接收的请求类型，注意 `POST,GET` 不受此限制，浏览器会在发送前检查请求是否符合限制，不符合不会触发请求
      6. `Access-Control-Allow-Headers` 设置预检请求允许的请求头部



## 参考资料
* [wiki CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing#cite_note-22)
* [fetch spec](https://fetch.spec.whatwg.org/#cors-request)
* [CORS mdn](https://developer.mozilla.org/en-US/docs/Web/HTTP/cors)
* [CORS w3c](https://w3c.github.io/webappsec-CORS-for-developers/)
* [Developers don't understand CORS](https://fosterelli.co/developers-dont-understand-cors)
* [ ] [Using CORS](https://www.html5rocks.com/en/tutorials/cors/)

