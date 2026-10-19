# SSL/TLS 证书问题排查指南

## 概述

当浏览器访问 HTTPS 网站时，会验证证书链的每个环节。任何一环出问题都会导致安全警告甚至连接拒绝。本文系统梳理常见的证书问题类型、浏览器表现、排查方法和解决方案。

---

## 一、证书问题类型

### 1. 证书本身过期（Certificate Expired）

**原理：** SSL 证书有有效期的起始和截止日期（Not Before / Not After），浏览器会检查当前时间是否在此范围内。

```
证书有效期：
[ Not Before ] ======= 当前时间 ======= [ Not After ]
      └─────────────────────┘
             ✓ 有效

[ Not Before ] ======= [ Not After ] ======= 当前时间 ]
      └─────────────────────┘
                      └──────── × 过期
```

**典型场景：**
- 运维忘记续期证书
- 错误的系统时间导致"被过期"
- 证书申请过早，上线时已接近过期

### 2. 证书链不完整（Incomplete Certificate Chain）

**原理：** 浏览器验证证书时需要从终端实体证书一路验到根 CA。服务器必须提供完整的中间证书链，否则浏览器无法追溯到受信任的根 CA。

```
完整证书链：
┌─────────────────────┐
│   根证书 (Root CA)   │  ← 浏览器内置，受操作系统信任
└──────────┬──────────┘
           │ 签名
           ▼
┌─────────────────────┐
│  中间证书 (Intermediate) │  ← 可能有多级中间 CA
└──────────┬──────────┘
           │ 签名
           ▼
┌─────────────────────┐
│  终端实体证书 (Server) │  ← 服务器配置的证书
└─────────────────────┘

不完整时：
服务器只发送了终端证书 → 浏览器找不到中间证书 → 无法验证到根 → 不安全
```

**典型场景：**
- Nginx/Apache 只配置了 `fullchain.pem`，实际发送的是纯实体证书
- 反向代理（Nginx、HAProxy）没有正确传递证书链
- 使用了新的 ACME 渠道签发的证书，中间 CA 较新，浏览器不熟悉

### 3. 域名不匹配（Domain Mismatch）

**原理：** 证书的 Subject Alternative Name (SAN) 或 Common Name (CN) 必须覆盖当前访问的域名。

```
证书CN=SAN: example.com
访问 https://example.com       → ✓ 通过
访问 https://www.example.com   → × SAN 不包含 www
访问 https://api.example.com   → × SAN 不包含 api
```

**典型场景：**
- 申请证书时只填了 `example.com`，但实际也用 `www.example.com` 访问
- 通配符证书 `*.example.com` 不覆盖多级子域名 `sub.www.example.com`
- 证书申请时的域名和实际访问的 IP/域名不一致
- 测试环境使用生产域名的证书

### 4. 自签名证书（Self-Signed Certificate）

**原理：** 自签名证书没有经过受信任 CA 的签名，其根证书不在浏览器信任列表中。

```
自签名：
┌─────────────────────┐
│  自签名证书 (自己签自己) │
└─────────────────────┘
          ↓
浏览器查找根 CA → 找不到 → 不信任

正规 CA：
证书由受信任根 CA 签发 → 根 CA 在浏览器信任列表 → 信任
```

**典型场景：**
- 开发/测试环境使用 OpenSSL 自签证书
- 内网系统使用私有 CA 签发的证书，但未导入根证书
- 某些 IoT 设备使用硬编码的自签名证书

### 5. 根证书过期（Root CA Expired）

**原理：** 证书链顶端的根证书本身有过期时间（通常 20-30 年）。如果根 CA 过期，所有由它签发的证书都会失效，即使中间证书和终端证书本身未过期。

```
根 CA 过期时间线：
根 CA 有效期：2010-01-01 ~ 2030-01-01
中间 CA 有效期：2020-01-01 ~ 2040-01-01   ← 中间 CA 还在有效期内
终端证书有效期：2024-01-01 ~ 2025-01-01  ← 终端证书也在有效期内

但访问时：
浏览器检查根 CA → 根 CA 已过期 → 整条链无效 → 报错
```

**典型场景：**
- 老旧设备的内置根证书已过期（如某些嵌入式设备）
- 企业私有 CA 的根证书过期后未及时更新
- 某些老版本 Windows XP/IE6 系统

### 6. 混合内容问题（Mixed Content）

**原理：** HTTPS 页面加载了 HTTP 协议的资源（图片、脚本、样式表），浏览器会报"混合内容"警告。

```
https://example.com
  ├── <script src="https://cdn.example.com/app.js">  ✓ 安全
  └── <script src="http://cdn.example.com/app.js">  ✗ 混合内容
```

---

## 二、浏览器提示场景对照表

| 错误类型 | Chrome 提示 | Firefox 提示 | Safari 提示 | Edge 提示 |
|---------|------------|-------------|------------|-----------|
| 证书过期 | "此连接不是私密连接" / "ERR_CERT_EXPIRED" | "警告：前方有安全隐患" | "此连接不是专用" | 同 Chrome |
| 证书链不完整 | "ERR_CERT_AUTHORITY_INVALID" | "sec_error_unknown_issuer" | "此证书无效" | 同 Chrome |
| 域名不匹配 | "ERR_CERT_COMMON_NAME_INVALID" | "ssl_error_bad_cert_domain" | "Safari 无法验证网站身份" | 同 Chrome |
| 自签名证书 | "ERR_CERT_AUTHORITY_INVALID" | "sec_error_untrusted_issuer" | "此证书无效" | 同 Chrome |
| 根证书过期 | "ERR_CERT_PATH_EXCEEDS_LENGTH" 或 "CERT_HAS_EXPIRED" | "untrusted_cert_authority" | "此证书不受信任" | 同 Chrome |
| 混合内容 | 控制台警告，不完全阻止 | 控制台警告 | 控制台警告 | 同 Chrome |

---

## 三、排查方法

### 1. OpenSSL 命令行排查

#### 查看证书详情
```bash
# 查看证书的所有信息
openssl x509 -in server.crt -noout -text

# 查看证书有效期
openssl x509 -in server.crt -noout -dates

# 查看证书支持的域名
openssl x509 -in server.crt -noout -ext subjectAltName

# 查看证书的颁发者
openssl x509 -in server.crt -noout -issuer
```

#### 检查证书链
```bash
# 模拟浏览器验证证书链（连接到服务器）
openssl s_client -connect example.com:443 -showcerts

# 只显示证书链
openssl s_client -connect example.com:443 -showcerts 2>/dev/null | openssl x509 -noout -text

# 检查完整的证书链（包括中间证书）
openssl s_client -connect example.com:443 -partial_chain -showcerts
```

#### 检查私钥匹配
```bash
# 查看私钥的 MD5 指纹
openssl pkey -in privkey.pem -pubout -outform der | openssl md5

# 查看证书的 MD5 指纹
openssl x509 -in cert.pem -pubkey -noout | openssl pkey -pubout -outform der | openssl md5

# 两个 MD5 值相同则匹配
```

#### 验证证书链完整性
```bash
# 将证书链合并（服务器证书在前，中间证书在后）
cat server.crt intermediate.crt root.crt > chain.pem

# 验证证书链
openssl verify -CAfile root.crt -untrusted intermediate.crt server.crt
```

### 2. Chrome DevTools 排查

#### Security 面板
1. 打开 DevTools（F12）
2. 切换到 **Security** 标签
3. 查看证书信息：
   - 证书有效性
   - 证书链完整性
   - 具体哪一级证书出问题

#### 查看证书详情
1. 点击锁图标 🔒 → "连接不安全" → "详细信息"
2. 或直接访问 `chrome://cert-internals`

#### 查看证书链
```
DevTools → Security → View certificate → 证书路径（查看每一级状态）
```

#### Console 面板混合内容警告
```
DevTools → Console → 搜索 "Mixed Content" 或 "mixed-content"
```

### 3. 在线工具

| 工具 | 地址 | 用途 |
|------|------|------|
| SSL Labs | https://www.ssllabs.com/ssltest/ | 全面 SSL 配置检测 |
| SSL Shopper | https://www.sslshopper.com/ssl-checker.html | 证书链检查 |
| Let's Encrypt | https://letsencrypt.org/certificates/ | 查看中间 CA |
| Chrome Certificate Viewer | chrome://cert-internals | 查看内置根 CA |

---

## 四、常见设备/浏览器兼容性说明

### 根证书兼容性

| 设备/浏览器 | 内置根 CA 库 | 更新频率 | 备注 |
|-----------|-------------|---------|------|
| Windows 10/11 | Windows Update | 自动 | 企业环境可通过 AD 推送 |
| macOS | Apple Root CA Program | 系统更新 | Safari 定期同步 |
| iOS | Apple Root CA Program | 系统更新 | 某些根 CA 需要用户手动信任 |
| Android | 设备厂商 | 不一致 | 老设备可能缺少新根 CA |
| Chrome (Linux) | Mozilla NSS | 定期更新 | 与 Firefox 共享同一套根 CA |
| Firefox | 自己的根 CA 列表 | 6-8 周 | 独立于系统和 Chrome |
| Java (JDK) | `cacerts` keystore | 随 JDK 更新 | 默认密码 `changeit` |

### Let's Encrypt 证书兼容性

Let's Encrypt 使用的是 **ISRG Root X1** 和 **ISRG Root X2** 根证书：

| 客户端/设备 | ISRG Root X1 支持 | ISRG Root X2 支持 | 备注 |
|-----------|-----------------|-----------------|------|
| Android 7.1+ | ✓ | ✗ | 7.1 以下需要 DST Root CA X3 |
| Firefox (所有版本) | ✓ | ✓ | 内置自己的根 CA 列表 |
| Chrome (Win/Mac) | ✓ | ✓ | 依赖系统根 CA |
| Java 11+ | ✓ | 部分 | 某些旧 JDK 版本有问题 |
| OpenSSL 1.1.1+ | ✓ | ✓ | |

### 证书签名算法兼容性

| 算法 | 兼容性 | 说明 |
|------|--------|------|
| SHA-1 with RSA | ❌ 已废弃 | 2020 年起所有浏览器拒绝 |
| SHA-256 with RSA | ✓ 通用 | 最低要求 |
| SHA-384 with RSA | ✓ 通用 | 推荐用于金融等高安全场景 |
| ECDSA P-256 | ✓ 现代 | 更小、更快，逐渐成为主流 |
| ECDSA P-384 | ✓ 现代 | 高安全要求场景 |

### 密钥长度要求

| 算法 | 密钥长度 | 兼容性 |
|------|---------|--------|
| RSA | 2048-bit | ✓ 最低要求 |
| RSA | 4096-bit | ⚠ 老旧设备可能不支持 |
| ECDSA | P-256 | ✓ 现代通用 |
| ECDSA | P-384 | ✓ 高安全场景 |

---

## 五、解决方案

### 证书过期 → 续期
```bash
# 使用 acme.sh 续期
acme.sh --renew -d example.com

# 使用 certbot 续期
certbot renew

# 手动替换证书后重载 Nginx
nginx -s reload
```

### 证书链不完整 → 拼接中间证书
```bash
# 查看服务器发送的证书链
openssl s_client -connect example.com:443 -showcerts

# 下载中间证书（以 Let's Encrypt 为例）
curl -sS https://letsencrypt.org/certs/isrgrootx1.pem > root.pem
curl -sS https://letsencrypt.org/certs/letsencryptAuthorityX3.pem > intermediate.pem

# 合并证书链（服务器证书在前，中间证书在后）
cat /etc/ssl/certs/example.com.crt /etc/ssl/certs/intermediate.pem > /etc/ssl/certs/fullchain.pem

# Nginx 配置
ssl_certificate /etc/ssl/certs/fullchain.pem;  # 不是 server.crt
ssl_certificate_key /etc/ssl/private/example.com.key;
```

### 域名不匹配 → 重新申请或添加 SAN
```bash
# 通配符证书覆盖所有子域名
certbot -d "example.com" -d "*.example.com"

# 多域名证书
certbot -d "example.com" -d "www.example.com" -d "api.example.com"
```

### 自签名证书 → 开发环境使用
```bash
# 生成自签名证书（仅测试用）
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=localhost"

# 将根证书导入系统信任库（仅内网）
# macOS
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt

# Linux (Ubuntu/Debian)
sudo cp ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

### 根证书过期 → 更新根证书
```bash
# 浏览器自动更新（大多数情况）
# 企业环境：更新内部 CA

# 检查系统根证书过期时间
openssl x509 -in /etc/ssl/certs/ca-certificates.crt -noout -dates
```

---

## 六、实战排查流程

```
遇到证书错误？
  │
  ├─ 1. 确认错误类型
  │     Chrome DevTools → Security 面板
  │
  ├─ 2. 查看证书详情
  │     锁图标 → "证书信息" → 有效期、域名、颁发者
  │
  ├─ 3. 检查证书链
  │     Security 面板 → 证书路径 → 哪一级有问题？
  │
  ├─ 4. 本地验证
  │     openssl s_client -connect example.com:443 -showcerts
  │
  └─ 5. 针对性修复
        过期 → 续期
        链不完整 → 补全中间证书
        域名不匹配 → 重新申请
        自签名 → 导入根证书或更换证书
```

---

## 七、相关资源

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [Let's Encrypt 证书链说明](https://letsencrypt.org/certificates/)
- [Chrome 根证书存储](https://.chromium.googlesource.com/chromium/src/+/main/net/data/ssl/symantec_certs/)
