[同源策略](https://en.wikipedia.org/wiki/Same-origin_policy)
====

## 什么是同源策略
浏览器厂商为了保证 web 资源的安全性.
定义了同源策略.同源策略的重点是,限制不同网络资源之间的控制策略.

在同源策略中,同源要求如下三点

1. 相同的协议类型
2. 相同的主机名
3. 相同的端口号

相关示例参见 [同源规则](https://en.wikipedia.org/wiki/Same-origin_policy#Origin_determination_rules)
RFC 定义参见 [同源概念](https://tools.ietf.org/html/rfc6454).

根据 [google 安全手册](http://www.ph33rinc.net/google_browser/browsersec/wiki/Part2.html).
可将同源分为如下几类.

### DOM  同源策略
网页加载的 js 或其他脚本文件只有和对应 html 文件同源,才可对 DOM 对象进行控制.

## 范例
参看 examples 

* 同源策略只限定了 ajax 无法加载非同源脚本,
而 script 标签任然可以,加载并执行非同源脚本.

> **tip**
> 注意同源策略限制 dom 等操作都是针对 ajax 而言的对于原生标签没有限制.



## 参考资料
* [mdn 同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
* [同源策略](http://www.ruanyifeng.com/blog/2016/04/same-origin-policy.html)
* [ ] [rfc same origin]([cors](https://tools.ietf.org/html/rfc6454))











