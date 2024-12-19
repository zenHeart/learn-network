# JSONP

**详解 JSONP 的作用及应用场景**

----


## 什么是 JSONP
JSONP 是 **JSON with padding** 的缩写,是一种利用 **script** 标签实现跨域的服务器通信的协议。


## 如何使用 JSONP
1. 客户端和服务端约定 JSONP 请求响应方式。例如
	* 客户端按照 `?callback=fun1&arg1=xx&...` 的方式向服务端请求脚本
   * 服务端根据请求内容返回 `fun1({data:..})` 的 js 文本 
2. 客户端采用 `<script type="application/javascript" src="xxx?callback=func1&arg1=ad"></script>` 的方式请求资源
3. 服务端按照协议返回形如 `fun1({data:..})` 的文本
4. 客户端会自动解析并执行该回调方法达到跨域资源请求的效果

## JSONP 的相关实践
由于使用之前需要先定义回调函数,为了避免全局回调对命名空间的污染。采用如下方式显示命名空间。
1. 客户端端约定请求的 url 格式如下 `jsonp/<callbackId>?<query>`
2. 服务端按照 `jsonp.<callbackId>(data)` 的模式放回结果

该约定将所有回调限制在 jsonp 的命名空间方便操作。

## JSONP 的局限
1. 由于 JSONP 是利用 script 标签模拟请求,所以只能采用 get 方法
2. src 属性受到浏览器 http url 长度限制,会限制向服务端发送内容的尺寸
3. 由于结果有服务端返回,会出现 xss 注入的风险

## JSONP
## 参考资料
* [JSONP wiki](https://en.wikipedia.org/wiki/JSONP#cite_note-2)
* [Remote JSON - JSONP](https://bob.ippoli.to/archives/2005/12/05/remote-json-jsonp/)