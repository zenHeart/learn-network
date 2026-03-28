# Cloudflare 快速上手指南

> Cloudflare 是全球领先的 CDN + 安全服务提供商，本文介绍其核心功能和快速配置方法。

## 核心功能总览

| 功能 | 免费套餐 | 说明 |
|------|----------|------|
| CDN | ✅ 全球 200+ 节点 | 加速内容分发 |
| SSL/TLS | ✅ 免费证书 | 全站 HTTPS |
| DDoS 防护 | ✅ Layer 3/4/7 | 基础防护 |
| DNS | ✅ Anycast DNS | 全球分布 |
| WAF | ⚠️ 3 条规则 | Web 应用防火墙 |
| Workers | ⚠️ 每天 10 万次 | 边缘计算 |
| 缓存 | ✅ | 自动资源缓存 |

## 快速上手步骤

### 1. 注册账号

访问 [cloudflare.com](https://cloudflare.com)，使用邮箱注册。

### 2. 添加网站

1. 点击 "Add a Site"
2. 输入要加速的域名
3. Cloudflare 会自动扫描现有 DNS 记录
4. 选择要使用的 DNS 记录（通常默认即可）

### 3. 修改 Nameservers

在域名注册商处，将 NS 记录改为 Cloudflare 提供的地址：

```
主 NS：主.ns.cloudflare.com
副 NS：副.ns.cloudflare.com
```

生效时间：通常几分钟到 48 小时。

### 4. 配置 CDN

在 DNS 设置中，将要加速的域名记录状态设为 **Proxied**（橙色云）：

```
状态说明：
- DNS Only（灰色云）：仅 DNS，不走 CDN
- Proxied（橙色云）：流量经过 Cloudflare 加速
```

### 5. 配置 SSL

推荐设置为 **Full (strict)** 模式：

| 模式 | 说明 |
|------|------|
| Off | 不加密（不推荐）|
| Flexible | 客户端→CF 加密，CF→服务器不加密 |
| Full | 双向加密（推荐）|
| Full (strict) | 双向加密 + 需有效证书（最安全）|

## 常用配置

### DNS 记录类型

| 类型 | 用途 | 示例 |
|------|------|------|
| A | IPv4 地址 | 1.2.3.4 |
| AAAA | IPv6 地址 | 2001:db8::1 |
| CNAME | 别名 | example.com → www.example.com |
| MX | 邮件服务器 | mail.example.com |
| TXT | 验证信息 | SPF/DKIM 记录 |

### 缓存配置

在 **Caching → Configuration** 中：

- **Cache Level**: Standard（标准缓存）
- **Browser Cache TTL**: 访问者浏览器缓存时间
- **Always Online**: 网站宕机时显示缓存内容

### 防火墙规则示例

免费套餐提供 3 条防火墙规则，可用于：

```javascript
// 示例 1：阻止特定 IP
IP Source Address equals 192.0.2.1
→ Block

// 示例 2：阻止特定国家
IP Source Country equals CN
→ Block

// 示例 3：仅允许特定路径走 HTTPS
NOT URL Path starts with /api
→ Always HTTPS
```

## 核心概念

### CDN 工作原理

```
用户请求 → Cloudflare Edge（全球节点）
               ↓
         缓存命中？ → 直接返回（快）
               ↓ 否
         回源获取 → 返回给用户 + 缓存
```

### DNS 传播

DNS 更改后，全球所有 DNS 服务器需要时间同步：
- 通常：几分钟 ~ 几小时
- 最多：48 小时
- 验证：`dig example.com @8.8.8.8` 检查不同 DNS 服务器的解析结果

### SSL 证书类型

| 类型 | 说明 |
|------|------|
| 域名验证 (DV) | 仅验证域名所有权 |
| 组织验证 (OV) | 验证域名 + 机构信息 |
| 扩展验证 (EV) | 严格验证，显示绿色地址栏 |

Cloudflare 免费提供 DV 证书。

## Workers 入门（进阶）

Cloudflare Workers 是在边缘节点运行的 JavaScript 代码：

```javascript
// workers 处理示例
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  if (url.pathname === '/api') {
    // 边缘处理 API 请求
    return new Response(JSON.stringify({ 
      edge: true,
      colo: request.cf.colo,
      country: request.cf.country
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return fetch(request) // 透传到源站
}
```

Workers 定价：
- 免费：每天 10 万次请求
- 付费：$5/月起，1000 万次请求

## 常见问题

### 1. Cloudflare 生效慢？

DNS 传播最多 48 小时。可使用以下命令验证：

```bash
# 使用 Cloudflare DNS 查询
dig @dns.cloudflare.com example.com

# 使用 Google DNS 对比
dig @8.8.8.8 example.com
```

### 2. 缓存不更新？

强制刷新缓存：
1. Dashboard → Caching → Configuration → Purge Everything
2. 或使用 API：

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'
```

### 3. 502/503 错误？

通常原因：
- 源站 IP 配置错误
- 源站未响应
- 源站 SSL 证书问题（使用 Full(strict) 时）

解决：检查源站可达性，确认 SSL 证书有效。

### 4. 免费套餐限制

- Workers：每天 10 万次
- Firewall Rules：3 条
- Page Rules：3 条（已弃用，改用 WAF Rules）
- Bandwidth：无限

## 参考资料

- Cloudflare 官方文档：https://developers.cloudflare.com
- Cloudflare Dashboard：https://dash.cloudflare.com
- SSL/TLS 配置：https://developers.cloudflare.com/ssl/get-started
- Workers 文档：https://developers.cloudflare.com/workers
