# SSL TLS 证书错误详解

## 概述

当浏览器提示 SSL/TLS 证书错误时，通常意味着 HTTPS 连接无法建立。本文详细介绍常见的证书错误类型、产生原因及排查方法。

## 1. 证书过期相关错误

### 1.1 证书已过期（notAfter < 当前时间）

**错误现象**：浏览器显示「此连接不私密」或「SSL证书已过期」

**原因**：证书的有效期通常为 1 年以内，从签发之日起到过期日止。一旦超过 `notAfter` 时间戳，证书即失效。

```
证书有效期示意：
[ notBefore ]==========[ notAfter ]
        ↑                      ↑
     生效时间                 过期时间
        |______________________|
              有效期内
                        |______|
                        已过期
```

**解决方法**：
- 联系网站管理员续期证书
- Let's Encrypt 证书可使用 certbot 自动续期

### 1.2 证书尚未生效（notBefore > 当前时间）

**错误现象**：「证书尚未生效」或「SSL 证书有效时间错误」

**原因**：某些证书在配置时将生效时间设定为未来某个日期，常见于：
- 计划性更换证书
- 测试环境证书
- 证书签发日期配置错误

**解决方法**：
- 确认服务器系统时间是否正确
- 等待证书生效时间到达
- 联系管理员检查证书配置

### 1.3 证书被吊销

**错误现象**：浏览器显示「此证书已被吊销」

**原因**：证书在到期前被 CA 机构强制失效，原因包括：
- 私钥泄露
- 证书签发错误
- 域名所有权变更
- CA 机构被信任度下降

**检查机制**：
- **CRL（Certificate Revocation List）**：CA 发布的吊销证书列表
- **OCSP（Online Certificate Status Protocol）**：实时查询证书状态

```
吊销检查流程：
浏览器 ──→ OCSP responder ──→ 返回证书状态
          或
浏览器 ──→ 下载 CRL ──→ 查找序列号
```

### 1.4 系统时间错误

**错误现象**：证书明明在有效期内，但浏览器提示过期

**原因**：用户设备的系统时间被篡改或电池耗尽导致时间重置

**解决方法**：
- 校准系统时间为网络时间（NTP）
- 同步手机等设备时间

## 2. 证书域名不匹配

### 2.1 Common Name vs Subject Alternative Name

**Common Name (CN)**：传统证书字段，仅支持单个域名
```
CN = example.com
```

**Subject Alternative Name (SAN)**：现代证书标准，支持多个域名
```
SAN = DNS:example.com, DNS:www.example.com, DNS:api.example.com
```

:::tip
自 2000 年起，CA/Browser Forum 规定 CA 必须将域名记录在 SAN 字段中，CN 字段仅用于展示。
:::

### 2.2 通配符证书限制

**通配符证书**：`*.example.com` 可匹配所有子域名

```
*.example.com 匹配：
- www.example.com ✓
- api.example.com ✓
- mail.example.com ✓

但不匹配：
- example.com ✗（缺少子域名）
- sub.www.example.com ✗（只能匹配一级子域名）
```

### 2.3 多域名证书

多域名证书（SAN 证书）允许一个证书覆盖多个完全不同的域名：

```
证书包含：
- example.com
- example.org
- example.net
- www.example.org
```

### 2.4 域名拼写与大小写

**常见错误**：
- `exampel.com` vs `example.com`（拼写错误）
- `EXAMPLE.COM` vs `example.com`（理论上 DNS 不区分大小写，但证书验证严格区分）
- `www.example.com` vs `example.com`（缺少或不缺少 www）

## 3. 证书链不完整

### 3.1 证书链结构

完整的证书链包含三层：

```
┌─────────────────────────────────┐
│      根证书（Root CA）           │
│  - 浏览器内置，信任锚点           │
│  - 通常不可见                    │
└───────────────┬─────────────────┘
                │ 颁发
                ▼
┌─────────────────────────────────┐
│    中间证书（Intermediate CA）   │
│  - 由根 CA 颁发                  │
│  - 可能有多级中间证书            │
└───────────────┬─────────────────┘
                │ 颁发
                ▼
┌─────────────────────────────────┐
│      服务器证书（End Entity）     │
│  - 网站实际使用的证书             │
│  - 包含公钥和域名信息             │
└─────────────────────────────────┘
```

### 3.2 证书链验证过程

浏览器验证证书链时，会执行以下步骤：

1. **获取服务器证书**：从握手消息中提取服务器证书
2. **查找签发者**：从证书中获取 `issuer` 字段
3. **获取中间证书**：服务器应提供完整的证书链
4. **验证签名**：逐级向上验证每个证书的签名
5. **验证有效性**：检查每个证书的 notBefore 和 notAfter
6. **检查吊销状态**：通过 CRL 或 OCSP 验证

### 3.3 常见错误对照表

| 错误代码 | 错误名称 | 原因 |
|---------|---------|------|
| `ERR_CERT_AUTHORITY_INVALID` | 证书颁发者无效 | 中间证书缺失或不被信任 |
| `ERR_CERT_CHAIN裁剪` | 证书链被截断 | 服务器未发送完整证书链 |
| `ERR_CERT_COMMON_NAME_INVALID` | 通用名称无效 | 域名与证书不匹配 |
| `ERR_CERT_DATE_INVALID` | 证书日期无效 | 证书过期或尚未生效 |
| `ERR_CERT_REVOKED` | 证书已被吊销 | 证书被 CA 吊销 |

### 3.4 自签名证书问题

**自签名证书**：由网站自己生成的证书，不经过 CA

```
自签名证书结构：
┌─────────────────────────────────┐
│     自签名证书（Self-Signed）    │
│  - 签发者 = 主体                 │
│  - 没有 CA 信任链                │
└─────────────────────────────────┘
```

**问题**：
- 浏览器不信任自签名证书
- 容易受到中间人攻击
- 无法通过 OCSP/CRL 验证吊销状态

**适用场景**：
- 本地开发环境
- 内网环境
- 测试环境

## 4. 证书问题排查方法

### 4.1 OpenSSL 命令行工具

**查看证书信息**：
```bash
# 查看证书内容
openssl x509 -in certificate.pem -text -noout

# 查看证书有效期
openssl x509 -in certificate.pem -noout -dates

# 查看证书域名
openssl x509 -in certificate.pem -noout -subject -alt_names

# 检查证书与私钥是否匹配
openssl x509 -in cert.pem -noout -modulus | md5sum
openssl rsa -in key.pem -noout -modulus | md5sum
```

**验证证书链**：
```bash
# 验证证书链完整性
openssl verify -CAfile ca-bundle.crt certificate.pem

# 查看证书链
openssl s_client -connect example.com:443 -showcerts
```

**测试 SSL 连接**：
```bash
# 测试 SSL 连接并获取证书信息
openssl s_client -connect example.com:443

# 指定 SNI 域名
openssl s_client -connect example.com:443 -servername www.example.com
```

### 4.2 浏览器开发者工具

1. 打开浏览器开发者工具（F12）
2. 切换到 Security（安全）标签
3. 查看证书详情：
   - 证书颁发者信息
   - 有效期时间
   - 证书链结构
   - 域名匹配情况

### 4.3 在线检测工具

**SSL Labs Server Test**：
- 地址：https://www.ssllabs.com/ssltest/
- 功能：全面分析 SSL/TLS 配置，评分 A-F
- 输出：协议支持、密码套件、证书链、漏洞检测

**其他工具**：
- https://www.sslshopper.com/ssl-checker.html - 证书链检查
- https://www.digicert.com/help/ - 证书详情检查

### 4.4 证书链可视化

```
实际检查证书链的方法：

1. Chrome 浏览器
   └─ 查看站点信息 → 证书 → 证书路径（可视化树形结构）

2. OpenSSL
   └─ openssl s_client -connect example.com:443 -showcerts

3. SSL Labs
   └─ 自动生成完整的证书链图
```

## 5. 常见错误场景与解决方案

### 场景一：HTTPS 升级后证书错误

**现象**：从 HTTP 升级到 HTTPS 后出现证书错误

**排查**：
1. 确认证书是否正确安装
2. 检查证书链是否完整
3. 验证 443 端口配置是否正确

### 场景二：CDN/HTTPS 加速后证书问题

**现象**：使用 CDN 后出现证书错误

**排查**：
1. CDN 是否配置了独立证书
2. 源站证书与 CDN 证书是否一致
3. 域名是否已完成 CDN 验证

### 场景三：证书突然失效

**排查步骤**：
1. 检查证书是否过期
2. 检查证书是否被吊销
3. 检查 CA 是否有问题（如 Let's Encrypt 证书）
4. 联系 CA 支持

## 延伸阅读

- [SSL/TLS 协议运行机制](https://www.ruanyifeng.com/blog/2014/02/ssl_tls.html)
- [Let's Encrypt 证书配置指南](https://letsencrypt.org/docs/)
- [SSL Labs SSL 最佳实践指南](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
