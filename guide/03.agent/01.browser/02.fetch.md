# [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

## 基本请求操作

1. **初始化请求**

   - `fetch(url, options)`
     - 返回一个 Promise，表示请求的响应
     - 所有 fetch 请求都是异步的，通过 Promise 处理

2. **基础配置**

   - **超时控制**

     - fetch 本身不直接支持超时，需要结合 AbortController 和 setTimeout 实现

     ```js
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
     fetch(url, { signal: controller.signal })
       .then(response => /* 处理响应 */)
       .catch(err => {
         if (err.name === 'AbortError') console.log('请求超时');
       })
       .finally(() => clearTimeout(timeoutId));
     ```

   - **设置请求头**

     ```js
     fetch(url, {
       headers: {
         "Content-Type": "application/json",
         "Custom-Header": "value",
       },
     });
     ```

     - 也可使用 Headers 类: `new Headers({'Content-Type': 'application/json'})`

   - **响应数据类型**
     - 不需要预设，而是通过响应对象的方法来处理不同类型
       - `response.text()` - 返回文本字符串的 Promise
       - `response.json()` - 返回解析为 JSON 的 Promise
       - `response.blob()` - 返回 Blob 对象的 Promise
       - `response.arrayBuffer()` - 返回 ArrayBuffer 的 Promise
       - `response.formData()` - 返回 FormData 的 Promise

3. **请求发送**

   - 通过 options 对象的 body 参数设置请求体

     ```js
     fetch(url, {
       method: "POST",
       body: JSON.stringify(data), // 字符串
       // body: new FormData(form) // FormData
       // body: new Blob([...]) // Blob
       // body: new URLSearchParams('key=value') // URLSearchParams
     });
     ```

     - 注意：GET 或 HEAD 请求不能包含 body

4. **取消请求**

   - 使用 AbortController 取消请求

     ```js
     const controller = new AbortController();
     const signal = controller.signal;

     fetch(url, { signal })
       .then(response => /* 处理响应 */)
       .catch(err => {
         if (err.name === 'AbortError') console.log('请求被取消');
       });

     // 在需要时取消请求
     controller.abort();
     ```

5. **响应消费**

   - **检查响应状态**

     ```js
     fetch(url).then((response) => {
       if (!response.ok) {
         throw new Error(`HTTP error! Status: ${response.status}`);
       }
       return response.json();
     });
     ```

   - **读取响应数据**
     - 注意：响应体只能被消费一次

6. **错误处理**

   - fetch 只有在网络错误或请求被阻止时才会 reject
   - HTTP 错误状态（如 404 或 500）不会导致 Promise 被拒绝

     ```js
     fetch(url)
       .then((response) => {
         if (!response.ok)
           throw new Error(`HTTP error! Status: ${response.status}`);
         return response.json();
       })
       .then((data) => console.log(data))
       .catch((error) => console.error("Fetch error:", error));
     ```

## CORS

1. **鉴权信息**

   - `credentials` 控制是否发送 cookies

     ```js
     fetch(url, {
       credentials: "same-origin", // 默认值，只在同源请求中发送 cookies
       // credentials: 'include' // 在所有请求中发送 cookies（跨域也发送）
       // credentials: 'omit' // 不发送 cookies
     });
     ```

     - 跨域请求需要服务器设置 `Access-Control-Allow-Credentials: true`
     - 跨域请求需要服务器设置特定的 `Access-Control-Allow-Origin`，不能使用通配符 \*

## 进度监控

1. **下载进度**

   ```js
   fetch(url).then((response) => {
     const reader = response.body.getReader();
     const contentLength = +response.headers.get("Content-Length");

     let receivedLength = 0;
     let chunks = [];

     return new Promise((resolve, reject) => {
       function processChunk({ done, value }) {
         if (done) {
           const body = new Uint8Array(receivedLength);
           let position = 0;
           for (let chunk of chunks) {
             body.set(chunk, position);
             position += chunk.length;
           }
           resolve(body);
           return;
         }

         receivedLength += value.length;
         chunks.push(value);
         console.log(
           `已接收 ${receivedLength} of ${contentLength} (${Math.round(
             (receivedLength / contentLength) * 100
           )}%)`
         );

         return reader.read().then(processChunk);
       }

       reader.read().then(processChunk);
     });
   });
   ```

2. **上传进度**
   - fetch API 本身不直接支持上传进度
   - 可以使用较新的 [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) 实现
   - 注意由于 Stream 在 chrome 使用 http2 上传，会导致丢失 content-length 头部, 可以利用自定义头部解决此问题

## 特有功能

1. **请求模式**

   ```js
   fetch(url, {
     mode: "cors", // 默认值，允许跨域请求
     // mode: 'no-cors', // 限制跨域请求
     // mode: 'same-origin', // 只允许同源请求
     // mode: 'navigate' // 用于浏览器导航
   });
   ```

2. **缓存控制**

   ```js
   fetch(url, {
     cache: "default", // 默认，使用浏览器的标准缓存规则
     // cache: 'no-store', // 不使用缓存
     // cache: 'reload', // 忽略缓存，重新获取资源
     // cache: 'no-cache', // 验证缓存是否过期
     // cache: 'force-cache', // 即使过期也使用缓存
     // cache: 'only-if-cached' // 只使用缓存，不访问网络
   });
   ```

3. **重定向处理**

   ```js
   fetch(url, {
     redirect: "follow", // 默认，自动跟随重定向
     // redirect: 'error', // 重定向时抛出错误
     // redirect: 'manual' // 手动处理重定向
   });
   ```
