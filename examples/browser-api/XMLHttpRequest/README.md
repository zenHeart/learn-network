# [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)

## 基本请求操作

1. **初始化请求**

   - `request.open(method, url, async)`
     - async 控制请求是否同步发送，如果同步发送，浏览器会在请求完成之前阻塞主线程，默认为异步

2. **基础配置**

   - `request.timeout` 设置请求超时
     - 设置请求超时时间，单位为毫秒
     - 对于同步请求无效
   - `setRequestHeader` 设置请求头
     - http 规范请求头名不区分大小写
     - 默认浏览器会将首字母大写
     - 非法的请求头会抛出异常
   - `responseType` 设置响应数据类型
     - `""` (空字符串) - 默认值，等同于 "text"
     - `"text"` - 返回文本字符串
     - `"arraybuffer"` - 返回 ArrayBuffer 对象
     - `"blob"` - 返回 Blob 对象
     - `"document"` - 返回解析为 HTML 或 XML 的文档对象，取决于接收到的数据 MIME 类型
     - `"json"` - 将响应解析为 JSON，返回 JavaScript 对象
     - 必须在调用 `send()` 前设置，否则可能不生效
     - 如果返回类型不匹配，会出现解析失败返回空
       > 查看 [responseType 示例](./responseType/index.html) 了解不同 responseType 的使用方法和效果。

3. **请求发送**

   - 采用 `request.send(data)` 发送请求
     - send 只能调用一次，多次调用会抛出异常
     - data 支持如下格式
     - `null` - 不发送请求体
     - `string` - 发送字符串
     - `ArrayBuffer` - 发送 ArrayBuffer 对象
     - `Blob` - 发送 Blob 对象
     - `Document` - 发送 Document 对象
     - `FormData` - 发送 FormData 对象
     - 注意：如果请求方法是 `GET`，则不能设置请求体

4. **取消请求**

   - `request.abort()`
     - 取消请求
     - 注意：如果请求已经完成，调用 `abort()` 不会有任何效果
     - 注意：如果请求已经完成，调用 `abort()` 不会触发 `onreadystatechange` 事件
     - 可以采用 AbortController 来取消请求
       > 建议统一采用 AbortController 来取消请求，这样可以保证请求的取消和状态的统一管理
   - `request.onabort` 监听请求取消
     - 注意：如果请求失败，`request.status` 会返回 0

5. **响应消费**

   - `request.response`
     - 获取响应数据
     - 注意：如果请求失败，返回 `null`
   - `request.responseText`
     - 基于 `responseType` 的值为 `text` 或 `json` 则返回字符串
   - `request.responseXML`
     - 如果服务器返回的是 text/xml 或 application/xml，则可访问返回一个 Document 对象（可用于 DOM 解析）
   - `request.status` 代表响应的 HTTP 状态, 默认值为 0，出错也返回 0
   - `request.statusText` 代表响应的 HTTP 状态文本
   - `request.getAllResponseHeaders()` 获取所有响应头
     - 返回一个字符串，包含所有响应头
     - 注意：如果请求失败，返回 `null`
     - 如果是 CORS 请求，只能获取 `Access-Control-Allow-Headers` 头部中列出的响应头, 非 CORS 请求可以获取所有响应头

6. **核心属性和事件**

   - `request.readyState` 代表请求的当前状态
     - 0: 请求未初始化
     - 1: 服务器连接已建立
     - 2: 请求已接收
     - 3: 请求处理中
     - 4: 请求已完成，且响应已就绪
   - `request.onreadystatechange` 监听请求状态变化
     - `request.readyState` 变化时触发
     - 注意：如果请求失败，`request.readyState` 不会变化
   - `request.onload` 监听请求完成
     - `request.readyState` 为 4 时触发
     - 注意：如果请求失败，`request.status` 不会变化
   - `request.onerror` 监听请求失败
     - `request.readyState` 为 4 时触发
     - 注意：如果请求失败，`request.status` 不会变化
     - 注意：如果请求失败，`request.status` 不会变化
   - `request.ontimeout` 监听请求超时
     - `request.readyState` 为 4 时触发
     - 注意：如果请求失败，`request.status` 不会变化

## CORS

1. **鉴权信息**
   - `withCredentials` 添加鉴权信息
     - 注意改配置只针对非同源才有效
     - 注意需要确保 Access-Control-Allow-Origin 头部的值包含跨域的 url
     - 注意需要确保 Access-Control-Allow-Credentials 头部的值为 true
     - `Access-Control-Allow-Origin` 是 `*`，但 `Access-Control-Allow-Credentials` 是 true
       - 这种情况下，浏览器会拒绝请求
       - 解决方案：将 Access-Control-Allow-Origin 设置为具体的域名，而不是 `*`

## 进度监控

1. **下载进度**

   - `progress` 监听下载进度
   - `event.loaded/event.total` 计算上传进度

2. **上传进度**
   - `upload.onprogress` 监听上传进度
   - `event.loaded/event.total` 计算上传进度
   - `loadend` 事件表示上传完成
