# Axios Adapter 适配器模式

## 概述

Axios 是一个基于 Promise 的 HTTP 客户端，支持浏览器和 Node.js 环境。其核心设计理念之一是**适配器模式（Adapter Pattern）**：通过统一的接口，屏蔽不同环境的 HTTP 请求实现差异，让上层调用代码保持一致。

```
┌─────────────────────────────────────────────────────────────┐
│                        Axios Core                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Interceptors│→ │ dispatchRequest│→│  Adapter (xhr)  │  │
│  │             │  │              │  │  Adapter (http) │  │
│  │             │  │              │  │  Adapter (mock)  │  │
│  └─────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 适配器接口

### 接口签名

```typescript
// 适配器是一个接收 config，返回 Promise<Response> 的函数
interface AxiosAdapter {
  (config: AxiosRequestConfig): Promise<AxiosResponse>;
}
```

### 请求阶段划分

| 阶段 | 说明 | 可干预点 |
|------|------|----------|
| 1. 配置合并 | defaults + config 深度合并 | config |
| 2. 请求转换器 | transformRequest 序列化 data | transformRequest |
| 3. 请求拦截器 | 请求前统一处理（如加 header） | interceptors.request |
| **4. 适配器执行** | **实际发送 HTTP 请求** | **adapter** |
| 5. 响应拦截器 | 响应后统一处理（如错误转换） | interceptors.response |
| 6. 响应转换器 | transformResponse 反序列化 | transformResponse |

**适配器是唯一真正发起网络请求的地方。**

## 内置适配器

### 1. xhr.js（浏览器环境）

**实现**：XMLHttpRequest

**源码路径**：`lib/adapters/xhr.js`

**核心流程**：

```javascript
// 简化流程
export default function xhrAdapter(config) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    
    // 1. 打开连接
    request.open(config.method, config.url, true);
    
    // 2. 设置超时
    request.timeout = config.timeout;
    
    // 3. 设置请求头
    Object.entries(headers).forEach(([k, v]) => 
      request.setRequestHeader(k, v)
    );
    
    // 4. 处理跨域 Cookie
    request.withCredentials = !!config.withCredentials;
    
    // 5. 设置响应类型
    if (config.responseType) {
      request.responseType = config.responseType;
    }
    
    // 6. 注册进度事件（上传/下载）
    if (config.onUploadProgress) {
      request.upload.addEventListener('progress', onUploadProgress);
    }
    
    // 7. 注册事件处理器
    request.onloadend = () => {
      const response = {
        data: request.response,
        status: request.status,
        statusText: request.statusText,
        headers: parseHeaders(request.getAllResponseHeaders()),
        config,
        request
      };
      settle(resolve, reject, response);
    };
    
    request.onabort = () => reject(new AxiosError('Request aborted'));
    request.onerror = () => reject(new AxiosError('Network Error'));
    request.ontimeout = () => reject(new AxiosError('timeout exceeded'));
    
    // 8. 发送请求
    request.send(config.data);
  });
}
```

**关键特性**：
- 上传/下载进度追踪
- 请求取消（abort）
- 跨域 withCredentials
- 多种 responseType（json/text/blob/document/arraybuffer）
- 自动处理 data: URI 协议

### 2. http.js（Node.js 环境）

**实现**：Node.js 原生 `http` / `https` 模块

**源码路径**：`lib/adapters/http.js`

**核心能力**：

| 特性 | 实现方式 |
|------|----------|
| 重定向跟随 | `follow-redirects` 库 |
| HTTP/2 | `http2.connect()` |
| 代理 | `proxy-from-env` + `beforeRedirects` 钩子 |
| 流式响应 | `stream.Readable` 支持 |
| 进度追踪 | `stream.pipeline` + `progressEventReducer` |
| 取消 | `EventEmitter` + `AbortController` |

**关键差异**：
- 支持 HTTP/2 多路复用（Session 连接池）
- 支持代理自动发现（环境变量 `HTTP_PROXY`）
- 支持 `socketPath` 替代主机端口
- 支持 Gzip/Brotli 自动解压

### 适配器选择逻辑

```javascript
// lib/adapters/adapterResolutionUtils.js
function getAdapter(adapters) {
  // 1. 优先使用用户指定的 adapter
  if (config.adapter) {
    return adapters[config.adapter];
  }
  
  // 2. 根据环境自动选择
  adapters = adapters || [xhrAdapter, httpAdapter];
  
  const { knownAdapters, supportsRead } = utils;
  
  // 遍历适配器列表，返回第一个支持的
  for (const adapter of adapters) {
    if (typeof adapter === 'function') {
      // 检查适配器是否可用（如 xhr 需 XMLHttpRequest）
      if (adapter.request) {
        return adapter.request;
      }
      return adapter;
    }
  }
}
```

## 自定义适配器

### 场景一：Mock 适配器（测试环境）

```javascript
// mock-adapter.js
function mockAdapter(config) {
  return new Promise((resolve, reject) => {
    // 模拟网络延迟
    setTimeout(() => {
      const response = {
        data: { mocked: true, config },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
        request: null
      };

      // 可通过 config 模拟错误
      if (config.forceError) {
        reject(new AxiosError('Mock Error', 'ERR.Mock', config));
        return;
      }

      // 模拟 404
      if (config.mockStatus === 404) {
        response.status = 404;
        response.statusText = 'Not Found';
      }

      settle(resolve, reject, response);
    }, config.mockDelay || 100);
  });
}

// 注册为默认适配器
axios.defaults.adapter = mockAdapter;
```

### 场景二：重试适配器

```javascript
// retry-adapter.js
const originalAdapter = axios.defaults.adapter;

function retryAdapter(config) {
  const maxRetries = config.retryCount || 3;
  const retryDelay = config.retryDelay || 1000;
  const retryStatuses = [408, 429, 500, 502, 503, 504];

  function attempt(retryCount) {
    return originalAdapter(config)
      .catch(err => {
        if (retryCount < maxRetries) {
          const shouldRetry = 
            retryStatuses.includes(err.response?.status) ||
            err.code === 'ECONNRESET' ||
            err.code === 'ETIMEDOUT';
          
          if (shouldRetry) {
            return new Promise(resolve => 
              setTimeout(() => resolve(attempt(retryCount + 1)), retryDelay)
            );
          }
        }
        throw err;
      });
  }

  return attempt(0);
}

axios.defaults.adapter = retryAdapter;
```

### 场景三：微信小程序适配器

```javascript
// wx-adapter.js
function wxAdapter(config) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.url,
      method: config.method,
      data: config.data,
      header: config.headers,
      success: (res) => {
        resolve({
          data: res.data,
          status: res.statusCode,
          statusText: '',
          headers: res.header,
          config,
          request: res
        });
      },
      fail: (err) => {
        reject(new AxiosError(err.errMsg, 'ERR.NETWORK', config));
      }
    });
  });
}
```

## settle 函数

`settle` 是适配器与 Promise 桥接的关键函数：

```javascript
// lib/core/settle.js
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError(
      'Request failed with status ' + response.status,
      [AxiosError.ERR_BAD_RESPONSE, AxiosError.ERR_BAD_REQUEST][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}
```

**行为规则**：
- `2xx` 状态码 → resolve
- 非 2xx 状态码 → reject（除非 `validateStatus` 返回 true）
- 无状态码（网络错误）→ reject

## 与拦截器/转换器的区别

| 机制 | 层级 | 执行次数 | 典型用途 |
|------|------|----------|----------|
| **Adapter** | 底层网络 | 精确 1 次 | 跨平台适配、Mock |
| **Interceptor** | 请求/响应 | 可多次 | Header 注入、日志、错误统一处理 |
| **Transform** | 数据转换 | 精确 1 次 | JSON 解析、请求序列化 |

```
请求流程：
  User Config
       ↓
  [Transformer: transformRequest] ← 可修改 data
       ↓
  [Interceptor: request.use] ← 可修改 config
       ↓
  [Adapter: xhr/http] ← 实际网络请求
       ↓
  [Interceptor: response.use] ← 可修改 response
       ↓
  [Transformer: transformResponse] ← 可修改 data
       ↓
  User
```

## Adapter 与 AxiosError

适配器抛出的错误应使用 `AxiosError`：

```javascript
// AxiosError 构造签名
new AxiosError(message, code, config, request, response);

// 常用错误码
ERR_NETWORK      // 网络错误（如断网）
ECONNABORTED     // 请求超时
ERR_BAD_RESPONSE // 非 2xx 响应
ERR_BAD_REQUEST  // 4xx 响应
ERR_CANCELED     // 请求被取消
```

## 性能考量

1. **HTTP/2 Session 复用**：`http.js` 中 `Http2Sessions` 类缓存 Session，避免重复建连
2. **流式响应**：大文件下载使用 `stream.Readable`，避免内存峰值
3. **Zlib 解压**：自动处理 `gzip/br` 压缩响应，需考虑 CPU vs 带宽权衡
4. **FormData 边界**：自动检测 `FormData` 类型，使用 `formDataToStream` 避免内存拷贝

## 总结

Axios 适配器模式的核心价值：

1. **环境抽象**：一套 API，多端运行（浏览器/Node/小程序/React Native）
2. **可替换性**：通过 `config.adapter` 或 `axios.defaults.adapter` 注入自定义实现
3. **可测试性**：Mock 适配器让测试无需真实网络
4. **功能扩展**：重试、降级、调试拦截等横切关注点

理解适配器接口（`config → Promise<Response>`）是深度掌握 Axios 的关键。
