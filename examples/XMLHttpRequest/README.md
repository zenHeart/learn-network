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
7. responseType 设置响应数据类型
   1. `""` (空字符串) - 默认值，等同于 "text"
   2. `"text"` - 返回文本字符串
   3. `"arraybuffer"` - 返回 ArrayBuffer 对象
   4. `"blob"` - 返回 Blob 对象
   5. `"document"` - 返回解析为 HTML 或 XML 的文档对象，取决于接收到的数据 MIME 类型
   6. `"json"` - 将响应解析为 JSON，返回 JavaScript 对象
   7. 必须在调用 `send()` 前设置，否则可能不生效
   8. 如果返回类型不匹配，会出现解析失败返回空
      > 查看 [responseType 示例](./responseType/index.html) 了解不同 responseType 的使用方法和效果。
8. progress 监听下载进度
   1. event.loaded/event.total 计算上传进度
9. upload.onprogress 监听上传进度
   1. event.loaded/event.total 计算上传进度
   2. loadend 事件表示上传完成
