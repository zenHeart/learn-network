# [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)

## 说明

1. `request.open(method, url, async)`
   1. async 控制请求是否同步发送如果同步发送，浏览器会在请求完成之前阻塞主线程，默认为异步
2. `request.timeout`
   1. 设置请求超时时间，单位为毫秒
   2. 对于同步请求无效
3. ReadyState
   1. `request.readyState` 代表请求的当前状态
      1. 0: 请求未初始化
      2. 1: 服务器连接已建立
      3. 2: 请求已接收
      4. 3: 请求处理中
      5. 4: 请求已完成，且响应已就绪
4. status
   1. `request.status` 代表响应的 HTTP 状态, 默认值为 0，出错也返回 0
5. setRequestHeader 设置请求头
   1. http 规范请求头名不区分大小写
   2. 默认浏览器会将首字母大写
   3. 非法的请求头会抛出异常
6. withCredentials 添加鉴权信息
   1. 注意改配置只针对非同源才有效
   2. 注意需要确保 Access-Control-Allow-Origin 头部的值包含跨域的 url
   3. 注意需要确保 Access-Control-Allow-Credentials 头部的值为 true
