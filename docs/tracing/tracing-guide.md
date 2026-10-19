# 调用链路追踪与日志打点指南

> 如何打点，实现快速追踪问题调用链路

## 目录

- [核心概念](#核心概念)
- [前端打点方案](#前端打点方案)
- [Trace ID 生成与传递](#trace-id-生成与传递)
- [日志聚合方案](#日志聚合方案)
- [常见 APM 工具对比](#常见-apm-工具对比)
- [快速追踪技巧](#快速追踪技巧)
- [最佳实践](#最佳实践)

---

## 核心概念

### 什么是调用链路追踪

调用链路追踪（Distributed Tracing）用于追踪请求在系统中的完整调用路径，从前端发起请求到后端服务，再到数据库，完整记录每个环节。

### 关键术语

| 术语 | 说明 |
|------|------|
| Trace | 一次完整的请求调用链，包含多个 Span |
| Span | 调用链中的一个节点，代表一个操作 |
| Trace ID | 贯穿整个请求的唯一标识符 |
| Parent Span | 当前 Span 的父节点 |
| Sampling | 采样策略，只追踪部分请求 |

### 工作原理

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Gateway   │────▶│  Service A  │
│  (TraceID)  │     │  (AddID)    │     │  (Log ID)   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │  Service B  │
                                        │  (Log ID)   │
                                        └─────────────┘
```

---

## 前端打点方案

### 页面埋点

```javascript
// 页面 PV/UV 埋点
function trackPageView() {
  const data = {
    event: 'page_view',
    page: location.pathname,
    referrer: document.referrer,
    timestamp: Date.now(),
    traceId: getTraceId()
  };
  sendToServer('/api/track', data);
}

// 自动触发
window.addEventListener('load', trackPageView);
history.pushState = (function(original) {
  return function() {
    original.apply(this, arguments);
    trackPageView();
  };
})(history.pushState);
```

### 事件埋点

```javascript
// 通用事件埋点
function trackEvent(category, action, label, value, extra) {
  const data = {
    event: 'custom_event',
    category,
    action,
    label,
    value,
    extra,
    traceId: getTraceId(),
    userId: getUserId(),
    timestamp: Date.now()
  };
  navigator.sendBeacon('/api/track', JSON.stringify(data));
}

// 使用示例
trackEvent('button', 'click', 'submit_form', 1, { formId: 'login' });
```

### 错误追踪

```javascript
// 全局错误捕获
window.addEventListener('error', (e) => {
  reportError({
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    stack: e.error?.stack,
    traceId: getTraceId(),
    userId: getUserId(),
    timestamp: Date.now()
  });
});

// Promise 异常捕获
window.addEventListener('unhandledrejection', (e) => {
  reportError({
    message: e.reason?.message || e.reason,
    stack: e.reason?.stack,
    traceId: getTraceId(),
    timestamp: Date.now()
  });
});

function reportError(data) {
  // 使用 sendBeacon 确保页面关闭时也能发送
  navigator.sendBeacon('/api/error', JSON.stringify(data));
}
```

### 性能监控

```javascript
// 关键性能指标
const performanceData = {
  // 页面加载时间
  loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
  // 首次渲染时间
  firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
  // 最大内容绘制
  LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
  // 首次输入延迟
  FID: performance.getEntriesByType('first-input')[0]?.processingStart - performance.getEntriesByType('first-input')[0]?.startTime,
  // 累积布局偏移
  CLS: getCLS(),
  traceId: getTraceId()
};
```

---

## Trace ID 生成与传递

### 生成唯一 Trace ID

```javascript
// 方法一：UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 方法二：时间戳 + 随机数
function generateTraceId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

// 方法三：W3C Trace Context（推荐）
// 格式：00-{32位trace-id}-{16位span-id}-{flags}
function generateW3CTraceId() {
  const traceId = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  const spanId = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `00-${traceId}-${spanId}-01`;
}
```

### 前端传递 Trace ID

```javascript
// 1. HTTP Header 传递（XMLHttpRequest/fetch）
async function fetchWithTrace(url, options = {}) {
  const traceId = getTraceId();
  const spanId = generateSpanId();

  const headers = {
    ...options.headers,
    'X-Trace-Id': traceId,
    'X-Span-Id': spanId,
    'X-Parent-Id': spanId
  };

  return fetch(url, { ...options, headers });
}

// 2. URL 参数传递
function createTraceUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  url.searchParams.set('__trace_id', getTraceId());
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

// 3. Cookie 传递（适用于同域）
function setTraceCookie() {
  document.cookie = `trace_id=${getTraceId()}; path=/; SameSite=strict`;
}
```

### 后端接收与传递

```javascript
// Node.js Express 示例
app.use((req, res, next) => {
  // 优先使用传入的 Trace ID，否则生成新的
  req.traceId = req.headers['x-trace-id'] || generateTraceId();

  // 将 Trace ID 传递给下游服务
  res.setHeader('X-Trace-Id', req.traceId);

  // 添加到日志
  req.log = bunyan.createLogger({
    name: 'api',
    traceId: req.traceId
  });

  next();
});

// 调用下游服务时传递
async function callDownstreamService(url) {
  return fetch(url, {
    headers: {
      'X-Trace-Id': req.traceId,
      'X-Parent-Id': generateSpanId()
    }
  });
}
```

---

## 日志聚合方案

### 日志框架选择

| 框架 | 语言 | 特点 |
|------|------|------|
| Winston | Node.js | 最流行，支持多传输 |
| Bunyan | Node.js | JSON 格式，高性能 |
| Log4j/Logback | Java | Java 标准 |
| Zap | Go | 高性能，零分配 |
| Logrus | Go | 结构化日志 |

### Winston 配置示例

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    // 控制台输出（开发环境）
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // 文件输出（生产环境）
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// 添加 Trace ID 支持
logger.withTrace = (traceId) => {
  return logger.child({ traceId });
};

export default logger;
```

### CLS（Continuation Local Storage）

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Node.js CLS 用于在异步调用中传递上下文
import cls from 'continuation-local-storage';

const namespace = cls.createNamespace('trace');

// 在请求开始时创建 Trace 上下文
app.use((req, res, next) => {
  namespace.run(() => {
    namespace.set('traceId', req.traceId || generateTraceId());
    namespace.set('userId', req.user?.id);
    next();
  });
});

// 在任何异步操作中获取 Trace ID
function getTraceIdFromCls() {
  return namespace.get('traceId');
}

// 中间件中使用
app.use((req, res, next) => {
  const logger = winston.child({
    traceId: namespace.get('traceId'),
    userId: namespace.get('userId')
  });
  req.logger = logger;
  next();
});
```

### ELK 日志聚合

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   应用服务   │──▶│   Logstash   │──▶│  Elasticsearch│──▶│   Kibana   │
│  (JSON Log) │   │  (收集过滤)  │   │   (存储搜索)  │   │  (可视化)   │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
       │                                      ▲
       │         ┌─────────────┐              │
       └────────▶│    Redis     │              │
                 │  (缓存队列)   │              │
                 └─────────────┘              │
                                               │
                 ┌─────────────┐               │
                 │   Filebeat  │───────────────┘
                 │  (轻量收集)  │
                 └─────────────┘
```

### Filebeat 配置

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: api-gateway
      environment: production
    fields_under_root: true

output.redis:
  hosts: ["redis:6379"]
  key: "filebeat-logs"
  db: 0
  timeout: 5s

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "app-logs-%{+yyyy.MM.dd}"

setup.kibana:
  host: "kibana:5601"
```

---

## 常见 APM 工具对比

### 开源方案

| 工具 | 语言 | 特点 | 适用场景 |
|------|------|------|----------|
| **Jaeger** | 多语言 | CNCF 项目，Go 编写，Hotrod 演示 | 云原生，微服务 |
| **Zipkin** | 多语言 | Twitter 开源，简单易用 | 轻量级追踪 |
| **SkyWalking** | Java/多语言 | 国产，APM + 日志 + 链路 | 全栈可观测 |
| **Pinpoint** | Java/多语言 | Naver 开源，无代码入侵 | Java 应用 |
| **Elastic APM** | 多语言 | ELK 生态集成 | 已有 ELK 栈 |

### SaaS 方案

| 工具 | 特点 | 定价 |
|------|------|------|
| **Datadog APM** | 全栈监控，AI 告警 | 按主机/数据量 |
| **New Relic** | 老牌 APM，实时监控 | 按用户/数据量 |
| **Sentry** | 专注错误追踪 | 免费/按事件 |
| **AWS X-Ray** | AWS 原生集成 | 按使用量 |

### Jaeger 快速上手

```javascript
// 1. 安装 Jaeger Client
import { initTracer } from 'jaeger-client';

// 2. 初始化 Tracer
const tracer = initTracer({
  serviceName: 'frontend-app',
  reporter: {
    collectorEndpoint: 'http://jaeger:14268/api/traces',
    logSpans: true
  },
  sampler: {
    type: 'const',
    param: 1  // 1 = 100% 采样
  }
});

// 3. 创建 Span
async function fetchWithTrace(url) {
  const span = tracer.startSpan('http.request');
  span.setTag('http.url', url);
  span.setTag('http.method', 'GET');

  try {
    const response = await fetch(url, {
      headers: {
        'X-Trace-Id': span.context().traceId
      }
    });
    span.setTag('http.status', response.status);
    span.finish();
    return response;
  } catch (error) {
    span.setTag('error', true);
    span.log({ event: 'error', message: error.message });
    span.finish();
    throw error;
  }
}

// 4. 自动注入到 HTTP 请求
import { instrumentationfetch } from 'jaeger-client';
instrumentationfetch(tracer);
```

### SkyWalking 配置

```yaml
# skywalking-agent/config/agent.config
agent.service_name=${SW_AGENT_NAME:frontend-app}
collector.backend_service=${SW_AGENT_COLLECTOR_BACKEND_SERVICES:oap-server:11800}
```

```html
<script>
  // SkyWalking Browser Agent
  window.SW_AGENT = {
    collector: 'http://oap-server:12800',
    service: 'frontend-app',
    serviceVersion: '1.0.0'
  };
</script>
<script src="sw-agent.js"></script>
```

---

## 快速追踪技巧

### 1. 生成唯一 Trace ID 贯穿全链路

```javascript
// 前端生成
const traceId = generateTraceId();
localStorage.setItem('trace_id', traceId);

// 所有请求带上
axios.interceptors.request.use((config) => {
  config.headers['X-Trace-Id'] = localStorage.getItem('trace_id');
  return config;
});

// 后端日志输出
console.log(`[${traceId}] Processing request`);
```

### 2. 日志染色标识

```javascript
// 测试流量染色
function isTestTraffic() {
  return localStorage.getItem('debug_mode') === 'true';
}

// 测试流量特殊标记
function getTraceHeaders() {
  const headers = {
    'X-Trace-Id': getTraceId()
  };

  if (isTestTraffic()) {
    headers['X-Debug-Mode'] = 'true';
    headers['X-Trace-Level'] = 'verbose';
  }

  return headers;
}
```

### 3. 链路可视化

```javascript
// 生成调用链时间线
function visualizeCallChain(spans) {
  const timeline = [];

  spans.forEach((span, index) => {
    timeline.push({
      id: span.id,
      name: span.name,
      start: span.startTime,
      duration: span.endTime - span.startTime,
      depth: index
    });
  });

  return timeline;
}

// 渲染调用链图
function renderTraceDiagram(spans) {
  const container = document.getElementById('trace-diagram');

  spans.forEach((span, index) => {
    const element = document.createElement('div');
    element.className = 'trace-span';
    element.style.left = `${span.depth * 20}px`;
    element.style.width = `${span.duration}px`;
    element.textContent = `${span.name} (${span.duration}ms)`;
    container.appendChild(element);
  });
}
```

### 4. 日志查询技巧

```bash
# 查询特定 Trace ID 的所有日志
grep "trace-id=abc123" /var/log/app/*.log | sort -t'[' -k2

# Elasticsearch 查询
GET /app-logs/_search
{
  "query": {
    "term": {
      "traceId": "abc123"
    }
  },
  "sort": [
    { "@timestamp": "asc" }
  ]
}

# Kibana 过滤
traceId: "abc123" AND level: "error"
```

---

## 最佳实践

### 打点原则

1. **关键路径必打点**
   - 页面加载
   - 用户交互
   - API 请求
   - 错误发生

2. **数据脱敏**
   - 用户信息脱敏
   - 敏感参数过滤
   - 合规要求

3. **性能友好**
   - 使用 `navigator.sendBeacon` 发送打点数据
   - 批量上报减少请求
   - 采样策略控制数据量

4. **上下文完整**
   - 包含 Trace ID
   - 包含时间戳
   - 包含用户标识

### 采样策略

```javascript
const SAMPLE_RATE = 0.1; // 10% 采样

function shouldSample() {
  return Math.random() < SAMPLE_RATE;
}

function trace(event, data) {
  if (!shouldSample()) return;

  sendToServer({
    event,
    ...data,
    traceId: getTraceId(),
    timestamp: Date.now()
  });
}
```

### 异常处理

```javascript
// 防止打点影响主业务
async function safeTrack(event, data) {
  try {
    await track(event, data);
  } catch (error) {
    // 静默失败，不影响用户
    console.debug('Track failed:', error);
  }
}
```

---

## 参考资料

- [OpenTelemetry 官方文档](https://opentelemetry.io/docs/)
- [Jaeger 官方文档](https://www.jaegertracing.io/docs/1.48/)
- [W3C Trace Context 规范](https://www.w3.org/TR/trace-context/)
- [Elastic APM 文档](https://www.elastic.co/guide/en/apm/get-started/current/index.html)
- [SkyWalking 文档](https://skywalking.apache.org/docs/)
