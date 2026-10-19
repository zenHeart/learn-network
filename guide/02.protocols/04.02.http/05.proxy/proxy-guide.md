# HTTP 代理完全指南

> 本文档系统梳理代理技术体系，包括正向代理、反向代理、透明代理、SOCKS 代理，以及 PAC 自动配置脚本。

---

## 目录

1. [代理概述](#1-代理概述)
2. [正向代理（Forward Proxy）](#2-正向代理forward-proxy)
3. [反向代理（Reverse Proxy）](#3-反向代理reverse-proxy)
4. [透明代理（Transparent Proxy）](#4-透明代理transparent-proxy)
5. [SOCKS 代理](#5-socks-代理)
6. [PAC 自动配置](#6-pac-自动配置)
7. [代理协议对比](#7-代理协议对比)
8. [实战配置](#8-实战配置)

---

## 1. 代理概述

### 1.1 什么是代理

代理（Proxy）是位于客户端和服务器之间的中间层，代替客户端向服务器发起请求，或代替服务器向客户端返回响应。

```
客户端  ──请求──▶  代理服务器  ──请求──▶  目标服务器
客户端  ◀──响应──  代理服务器  ◀──响应──  目标服务器
```

### 1.2 代理的分类

| 分类 | 位置 | 客户端感知 | 典型用途 |
|------|------|-----------|---------|
| 正向代理 | 客户端侧 | 客户端显式配置 | 翻墙、缓存、企业内网 |
| 反向代理 | 服务器侧 | 客户端无感知 | 负载均衡、CDN、安全防护 |
| 透明代理 | 网络层 | 两者均无感知 | 内容过滤、流量监控 |

---

## 2. 正向代理（Forward Proxy）

### 2.1 原理

正向代理代表客户端向服务器发起请求。服务器不知道真实客户端是谁，因为请求实际上来自代理服务器。

```
浏览器 ──请求 myapp.com──▶  正向代理（翻墙服务器）───请求──▶  myapp.com
                              代理服务器 IP 作为源地址
```

### 2.2 典型场景

**场景一：企业内网访问控制**
```bash
# 员工电脑配置正向代理，所有 HTTP 请求经过公司代理
export http_proxy=http://proxy.company.com:8080
export https_proxy=http://proxy.company.com:8080
curl https://api.github.com/users
```

**场景二：浏览器配置代理**
```js
// Chrome 浏览器可通过扩展或系统设置配置代理
// 系统代理设置 → 手动配置 → 输入代理地址和端口
```

**场景三：Node.js 请求经过代理**
```js
import https from 'https';
import http from 'http';

function requestWithProxy(url, proxy) {
  const agent = new https.Agent({
    keepAlive: true,
    proxy: proxy // http.Agent 支持 proxy 选项
  });
  
  return fetch(url, { agent });
}
```

### 2.3 CONNECT 方法

HTTP CONNECT 方法用于建立隧道，使代理服务器转发 TCP 连接：

```
CONNECT target-server.com:443 HTTP/1.1
Host: target-server.com:443
Proxy-Authorization: Basic dXNlcjpwYXNz

HTTP/1.1 200 Connection Established
```

建立隧道后，客户端和服务器之间可以传输任意数据（加密的 HTTPS 流量）。

---

## 3. 反向代理（Reverse Proxy）

### 3.1 原理

反向代理位于服务器端，代表一个或多个服务器接收请求。客户端不知道具体是哪台服务器处理的请求。

```
用户 ──请求 /api ──▶  Nginx（反向代理）─┬─▶  Server A:3000
                                      ├─▶  Server B:3000
                                      └─▶  Server C:3000
```

### 3.2 Nginx 反向代理配置

```nginx
# /etc/nginx/conf.d/reverse-proxy.conf

upstream backend {
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;
  keepalive 64; # 长连接复用
}

server {
  listen 80;
  server_name example.com;

  # 静态文件直接返回
  location /static/ {
    alias /var/www/static/;
    expires 30d;
  }

  # API 代理到后端
  location /api/ {
    proxy_pass http://backend/;
    
    # 转发必要头部
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 超时配置
    proxy_connect_timeout 10s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # WebSocket 支持
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### 3.3 负载均衡策略

```nginx
upstream backend {
  # 轮询（默认）
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;
  
  # 加权轮询
  server 127.0.0.1:3000 weight=3;
  server 127.0.0.1:3001 weight=1;
}

upstream backend_ip_hash {
  # IP 哈希：同一客户端 IP 固定到同一后端
  ip_hash;
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;
}

upstream backend_least_conn {
  # 最少连接优先
  least_conn;
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;
}
```

---

## 4. 透明代理（Transparent Proxy）

### 4.1 原理

透明代理在网络层拦截流量，客户端和服务器都不知道流量经过了代理。常用于：
- 企业内容过滤（不允许访问某些网站）
- ISP 流量缓存
- 强制 SSL 检查（MITM 代理）

### 4.2 iptables 透明代理配置

```bash
# 将 HTTP 流量重定向到本地代理端口
iptables -t nat -A PREROUTING -p tcp --dport 80 \
  -j REDIRECT --to-port 3128

# Squid 透明代理配置
# /etc/squid/squid.conf
http_port 3128 transparent
http_access allow all
```

### 4.3 透明代理 vs 正向代理

| 特性 | 透明代理 | 正向代理 |
|------|---------|---------|
| 客户端配置 | 无需配置 | 需显式配置 |
| HTTPS 支持 | 需 MITM | CONNECT 隧道 |
| 部署位置 | 网络层/路由器 | 客户端侧 |
| 适用场景 | 流量监控/过滤 | 翻墙/匿名 |

---

## 5. SOCKS 代理

### 5.1 SOCKS5 协议

SOCKS5 是 SOCKS 协议的第五版，比 SOCKS4 更安全，支持 UDP 和完整身份认证。

```
客户端 ──认证协商──▶ SOCKS代理
客户端 ◀──认证响应── SOCKS代理
客户端 ──连接请求──▶ SOCKS代理（目标地址）
客户端 ◀──连接响应── SOCKS代理
客户端 ──数据传输──▶ SOCKS代理 ──数据──▶ 目标服务器
```

### 5.2 SOCKS5 连接流程

```js
// Node.js 实现 SOCKS5 客户端
import net from 'net';

async function connectViaSocks5(proxyHost, proxyPort, targetHost, targetPort) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(proxyPort, proxyHost, () => {
      // SOCKS5 握手
      socket.write(Buffer.from([0x05, 0x01, 0x00])); // VER, NMETHODS, METHODS
      
      socket.once('data', buf => {
        if (buf[0] !== 0x05 || buf[1] === 0xff) {
          socket.end();
          return reject(new Error('SOCKS5 handshake failed'));
        }
        
        // 连接请求（CONNECT）
        const request = Buffer.alloc(7 + targetHost.length);
        request[0] = 0x05; // VER
        request[1] = 0x01; // CMD: CONNECT
        request[2] = 0x00; // RSV
        request[3] = 0x03; // ATYP: DOMAINNAME
        request[4] = targetHost.length; // DST.ADDR 长度
        request.write(targetHost, 5); // DST.ADDR
        request.writeUInt16BE(targetPort, 5 + targetHost.length); // DST.PORT
        socket.write(request);
      });
      
      socket.once('data', buf => {
        if (buf[1] === 0x00) resolve(socket); // 成功
        else reject(new Error(`SOCKS5 error: ${buf[1]}`));
      });
    });
    
    socket.on('error', reject);
  });
}
```

### 5.3 SSH SOCKS 代理

```bash
# 建立 SOCKS5 代理
ssh -D 1080 user@remote-server.com

# 配置浏览器使用本地 SOCKS 代理
# SOCKS Host: localhost, Port: 1080
```

---

## 6. PAC 自动配置

### 6.1 PAC 文件是什么

PAC（Proxy Auto-Config）是一个 JavaScript 函数，返回代理服务器地址或 `"DIRECT"`（直连）。

```js
function FindProxyForURL(url, host) {
  // 返回代理字符串
  // 格式: "PROXY proxy.example.com:8080"
  //       "SOCKS5 proxy.example.com:1080"
  //       "DIRECT"
  
  return "PROXY proxy.example.com:8080";
}
```

### 6.2 PAC 完整函数

```js
// my-pac.pac

function FindProxyForURL(url, host) {
  // 内网直连
  if (isInNet(host, "10.0.0.0", "255.0.0.0")) return "DIRECT";
  if (isInNet(host, "172.16.0.0", "255.240.0.0")) return "DIRECT";
  if (isInNet(host, "192.168.0.0", "255.255.0.0")) return "DIRECT";
  
  // 特定域名走直连
  if (dnsDomainIs(host, ".local")) return "DIRECT";
  if (shExpMatch(host, "*.local")) return "DIRECT";
  
  // 开发环境直连
  if (shExpMatch(host, "*.dev") || shExpMatch(host, "*.test")) return "DIRECT";
  
  // 国内域名直连
  if (dnsDomainIs(host, ".cn")) return "DIRECT";
  
  // 公司内网走代理
  if (dnsDomainIs(host, ".company.com")) return "PROXY proxy.company.com:8080";
  
  // 其他走代理（多个代理可用分号分隔）
  return "SOCKS5 proxy.example.com:1080; PROXY proxy2.example.com:8080; DIRECT";
}
```

### 6.3 PAC 核心函数

| 函数 | 说明 |
|------|------|
| `isInNet(host, ip, mask)` | 判断 IP 是否在指定网段 |
| `dnsDomainIs(host, domain)` | 判断域名是否匹配后缀 |
| `shExpMatch(str, shell_exp)` | Shell 风格通配符匹配 |
| `dateRange(...)` | 日期范围判断 |
| `timeRange(...)` | 时间范围判断（分时代理） |
| `localHostOrDomainIs(host, hostdom)` | 域名或精确匹配 |
| `dnsResolve(host)` | DNS 解析 |
| `myIpAddress()` | 本机 IP |

### 6.4 PAC 分时策略示例

```js
// 工作时间走高速代理，非工作时间走免费代理
function FindProxyForURL(url, host) {
  const hour = new Date().getHours();
  
  // 工作时间 9:00-18:00
  if (timeRange(9, 0, 18, 0)) {
    if (dnsDomainIs(host, ".internal.com")) return "PROXY internal.proxy.com:8080";
    return "PROXY fast.proxy.com:8080";
  }
  
  // 非工作时间用免费代理
  return "PROXY free.proxy.com:8080; DIRECT";
}
```

### 6.5 浏览器使用 PAC

```bash
# 浏览器设置 PAC URL
# Chrome: 设置 → 系统 → 代理设置 → 自动配置脚本 URL
# 输入: https://proxy.company.com/proxy.pac
```

### 6.6 WPAD 协议

WPAD（Web Proxy Auto-Discovery）让浏览器自动发现代理配置：

```html
<!-- 在网站根目录提供 wpad.dat -->
<!-- https://example.com/wpad.dat → PAC 文件 -->

<!-- 或通过 DHCP 提供 -->
<!-- DHCP Option 252 → PAC URL -->
```

浏览器启动时依次尝试：
1. DHCP 查询 (Option 252)
2. DNS: `http://wpad.example.com/wpad.dat`
3. DNS: `http://wpad.example.com/proxy.pac`

---

## 7. 代理协议对比

| 特性 | HTTP 代理 | HTTPS 代理（CONNECT） | SOCKS5 | PAC |
|------|----------|---------------------|--------|-----|
| 协议层 | 应用层 | 传输层隧道 | 传输层 | JavaScript |
| HTTP 头修改 | 支持 | 不支持（加密） | 不支持 | 不适用 |
| HTTPS | via CONNECT | 原生支持 | 支持 | 不适用 |
| UDP | 不支持 | 支持（隧道） | 支持 | 不适用 |
| 身份认证 | Basic/Digest | 端到端 | GSSAPI/密码 | URL 内嵌 |
| 透明支持 | 可配置 | 困难 | 否 | 否 |
| 配置复杂度 | 低 | 中 | 中 | 高 |

---

## 8. 实战配置

### 8.1 Node.js 代理中间件

```js
// 使用 http-proxy 搭建 HTTP 代理服务器
import httpProxy from 'http-proxy';
import express from 'express';

const proxy = httpProxy.createProxyServer({
  target: 'http://target-server.com:3000',
  changeOrigin: true,
  selfHandleResponse: false // 启用响应拦截
});

proxy.on('proxyReq', (proxyReq, req, res, options) => {
  // 可以在此处修改请求
  proxyReq.setHeader('X-Forwarded-By', 'MyProxy');
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.status(502).json({ error: 'Proxy error' });
});

const app = express();
app.use('/api', (req, res) => proxy.web(req, res));
app.listen(8080);
```

### 8.2 代理链

多个代理串联使用：

```js
// 请求: Client → Proxy A → Proxy B → Target
async function chainRequest(targetUrl, proxies) {
  let currentProxy = proxies.shift();
  
  while (currentProxy) {
    const response = await fetch(targetUrl, {
      agent: new HttpsAgent({
        proxy: `http://${currentProxy.host}:${currentProxy.port}`
      })
    });
    
    if (proxies.length === 0) return response;
    
    // 使用响应体作为下一个请求的 URL（适用于重定向场景）
    targetUrl = await response.text();
    currentProxy = proxies.shift();
  }
}
```

### 8.3 企业代理环境检测

```js
function detectProxy() {
  const proxySettings = {
    http: process.env.http_proxy || process.env.HTTP_PROXY,
    https: process.env.https_proxy || process.env.HTTPS_PROXY,
    no_proxy: process.env.no_proxy || process.env.NO_PROXY
  };
  
  return Object.values(proxySettings).some(v => v) ? proxySettings : null;
}

// Axios 自动使用代理
import axios from 'axios';
const proxy = detectProxy();
if (proxy?.http) {
  axios.defaults.proxy = {
    host: new URL(proxy.http).hostname,
    port: new URL(proxy.http).port
  };
}
```

---

## 参考资料

- [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://tools.ietf.org/html/rfc7230)
- [RFC 1928 SOCKS Protocol Version 5](https://tools.ietf.org/html/rfc1928)
- [MDN Proxy-Auto-Configuration](https://developer.mozilla.org/en-US/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_(PAC)_file)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [PAC 文件规范 (Gnome)](https://developer.gnome.org/NetworkManager/stable/nm-settings.html)
