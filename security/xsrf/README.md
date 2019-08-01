
此处为了避免 xsrf 攻击,采用 XSRF-TOKEN 机制实现授权.参考资料如下:
* [xsrf](https://en.wikipedia.org/wiki/Cross-site_request_forgery)
* [xsrf-token](https://stormpath.com/blog/angular-xsrf)

> **tip**
> 注意为了使 xsrf-token 生效,**服务端不要在 cookie 上设置 HttpOnly 选项**,此外确保设定了 cookie 的过期时间,避免在由于未设定过期导致 cookie 在浏览器关闭后失效.推荐设定 cookie 过期时间略大于 token 过期时间即可.更详细的 cookie 说明参见 [阮一峰 cookie](http://javascript.ruanyifeng.com/bom/cookie.html#toc7)