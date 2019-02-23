# xss

**讲解跨域脚本攻击的概念及防范**

----


## 概述
xss 是 `cross site script` 的简称,为了和 css 区分所以简写为 xss.

## xss 攻击步骤
1. 网站可以注入恶意 html 或 脚本
2. 新用户访问网页会触发脚本
3. 触发脚本从用户浏览器获取私人信息
4. 攻击者利用获取信息伪造用户登录系统

你用脚本注入方式实现了对用户浏览器的控制.
则基于此典型操作如下
1. 获取该用户下的用户 cookie
2. 通过诱导连接等方式,进一步获取更高的用户权限


## xss 范例


## 参考资料
* [mdn xss](https://developer.mozilla.org/zh-CN/docs/Glossary/Cross-site_scripting)

