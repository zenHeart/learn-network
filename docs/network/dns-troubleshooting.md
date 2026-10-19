# DNS 问题排查完全指南

> 本文详细介绍如何使用 dig、nslookup 等工具排查 DNS 问题。

## 一、DNS 基础回顾

### 1.1 DNS 查询流程

```
客户端 → 本地 DNS 缓存 → 递归 DNS 服务器 → 根域名服务器 → TLD 服务器 → 权威 DNS 服务器
```

### 1.2 DNS 记录类型

| 类型 | 含义 | 用途 |
|------|------|------|
| A | IPv4 地址 | 域名 → IP 地址 |
| AAAA | IPv6 地址 | 域名 → IPv6 地址 |
| CNAME | 别名 | 域名 → 另一个域名 |
| MX | 邮件交换 | 邮件服务器地址 |
| TXT | 文本记录 | 验证、SPF 等 |
| NS | 域名服务器 | 域名服务器地址 |
| SOA | 起始授权 | DNS 区域信息 |
| PTR | 指针记录 | IP → 域名（反向查询）|

---

## 二、dig 命令详解

### 2.1 基本用法

```bash
# 查询域名的 A 记录
dig example.com

# 指定 DNS 服务器查询
dig @8.8.8.8 example.com

# 只查询特定记录类型
dig example.com A
dig example.com AAAA
dig example.com MX
dig example.com CNAME
```

### 2.2 简化输出

```bash
# +short：只显示结果
dig example.com +short
# 输出：93.184.216.34

# +noall +answer：只显示答案部分
dig example.com +noall +answer
```

### 2.3 完整输出解析

```bash
dig example.com
```

**输出示例：**
```
; <<>> DiG 9.18.1 <<>> example.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 0

;; QUESTION SECTION:
;example.com.                     IN      A

;; ANSWER SECTION:
example.com.              86400   IN      A       93.184.216.34

;; Query time: 12 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: Thu Mar 26 2026 11:00:00 CST
;; MSG SIZE  rcvd: 45
```

**关键字段说明：**

| 字段 | 含义 |
|------|------|
| status: NOERROR | 查询成功 |
| status: NXDOMAIN | 域名不存在 |
| status: SERVFAIL | 服务器失败 |
| flags: qr | 这是响应（Query Response）|
| flags: rd | 递归查询（Recursion Desired）|
| flags: ra | 递归可用（Recursion Available）|
| Query time | 查询耗时 |

### 2.4 追踪完整查询路径

```bash
# +trace：从根服务器开始追踪整个 DNS 解析过程
dig example.com +trace
```

### 2.5 反向查询

```bash
# PTR 记录查询（IP → 域名）
dig -x 8.8.8.8
# 或
dig @8.8.8.8 -x 8.8.8.8 PTR
```

---

## 三、nslookup 命令详解

### 3.1 交互模式

```bash
nslookup
> set type=A           # 设置查询类型
> example.com           # 查询 A 记录
> set type=MX           # 切换到 MX 查询
> example.com           # 查询邮件服务器
> exit                  # 退出
```

### 3.2 单行命令

```bash
# 查询 A 记录
nslookup example.com

# 查询 MX 记录
nslookup -type=MX example.com

# 指定 DNS 服务器
nslookup example.com 8.8.8.8

# 反向查询
nslookup 8.8.8.8
```

### 3.3 Windows 特定

```powershell
# Windows 上使用 nslookup 查询 TXT 记录（SPF）
nslookup -type=TXT example.com

# 查看 DNS 缓存
ipconfig /displaydns

# 清除 DNS 缓存
ipconfig /flushdns
```

---

## 四、常见 DNS 问题排查

### 4.1 域名解析失败（NXDOMAIN）

**症状**：`status: NXDOMAIN`

**排查步骤**：

```bash
# 1. 检查域名是否拼写正确
dig example.com +short

# 2. 检查域名是否已注册
whois example.com

# 3. 检查 DNS 服务器是否可达
dig @ns1.example.com example.com

# 4. 检查 TTL 是否过期
dig example.com +noall +answer +ttlid
```

### 4.2 DNS 污染/劫持

**症状**：返回错误的 IP 地址

**排查步骤**：

```bash
# 1. 使用多个 DNS 服务器对比结果
dig @8.8.8.8 example.com
dig @1.1.1.1 example.com
dig @9.9.9.9 example.com

# 2. 使用 DoH（DNS over HTTPS）
curl -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=example.com&type=A'

# 3. 使用 DoT（DNS over TLS）
# 通过 853 端口连接

# 4. 检查本地 /etc/hosts
cat /etc/hosts | grep example.com
```

### 4.3 DNS 解析缓慢

**症状**：网站加载很慢

**排查步骤**：

```bash
# 1. 测试各环节耗时
dig example.com +stats

# 2. 对比不同 DNS 服务器速度
time dig @8.8.8.8 example.com +short
time dig @1.1.1.1 example.com +short
time dig @ns1.example.com example.com +short

# 3. 使用 +tcp 强制 TCP 查询
dig +tcp example.com

# 4. 测试 DNS 缓存
# 第一次查询（慢）
dig example.com
# 第二次查询（应该快，如果慢说明没缓存）
dig example.com
```

### 4.4 CNAME 链过长

**症状**：CNAME 解析多跳后才能得到最终 IP

```bash
dig example.com +trace
```

**问题**：过多的 CNAME 重定向会增加延迟

**优化建议**：尽量减少 CNAME 链的长度

---

## 五、实战案例

### 案例 1：网站打不开，怀疑 DNS 问题

```bash
# 1. 先 ping 域名，看是否能解析
ping example.com

# 2. 用 dig 检查 DNS 解析
dig example.com

# 3. 检查 DNS 是否返回正确 IP
dig example.com +short
# 对比正常时的 IP
curl -I https://example.com 2>/dev/null | grep -i location

# 4. 换 DNS 服务器测试
dig @1.1.1.1 example.com +short
dig @8.8.8.8 example.com +short
```

### 案例 2：邮件发送失败

```bash
# 1. 检查 MX 记录
dig example.com MX +short

# 2. 检查邮件服务器 IP
dig mail.example.com A +short

# 3. 测试 SMTP 连接
telnet mail.example.com 25
```

### 案例 3：HTTPS 证书错误

**（通常是 CDN 或负载均衡器的 IP 问题）**

```bash
# 1. 检查 CDN 域名的真实 IP
dig cdn.example.com +short

# 2. 对比 hosts 文件
cat /etc/hosts | grep cdn

# 3. 清除本地 DNS 缓存
# macOS:
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
# Linux:
sudo systemd-resolve --flush-caches
# Windows:
ipconfig /flushdns
```

---

## 六、DNS 工具推荐

### 6.1 在线工具

| 工具 | 网址 | 用途 |
|------|------|------|
| DNS Checker | dnschecker.org | 全球 DNS 传播检查 |
| WhatsMyDNS | whatsmydns.net | DNS 传播验证 |
| MXToolbox | mxtoolbox.com | DNS 各类检查 |
| DNSPerf | dnspperf.com | DNS 速度排名 |

### 6.2 命令行工具对比

| 工具 | 平台 | 特点 |
|------|------|------|
| dig | Linux/macOS | 功能最全面 |
| nslookup | 跨平台 | 简单易用 |
| host | Linux/macOS | 输出简洁 |
| drill | Linux | dig 的替代品 |

### 6.3 常用命令速查

```bash
# 快速查询 A 记录
dig +short example.com

# 查询 MX 记录
dig +short example.com MX

# 查询 SOA 记录
dig +short example.com SOA

# 追踪解析路径
dig example.com +trace

# 反向查询
dig -x 8.8.8.8

# 指定 DNS 服务器
dig @8.8.8.8 example.com

# 强制 TCP 查询
dig +tcp example.com

# 查看完整响应
dig example.com +noall +answer

# 查看统计信息
dig example.com +stats
```

---

## 七、安全相关

### 7.1 DNS 隧道检测

```bash
# 检查异常的 TXT 记录查询
dig example.com TXT

# 监控异常的 DNS 查询量
# 使用 Wireshark 或 tcpdump
sudo tcpdump -i eth0 -n port 53
```

### 7.2 DNSSEC 验证

```bash
# 检查 DNSSEC 签名
dig example.com DNSKEY +short

# 验证 DNSSEC
dig +sigchase example.com
```

### 7.3 隐私保护

```bash
# 使用加密 DNS
# DoH（DNS over HTTPS）
curl -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=example.com&type=A'

# DoT（DNS over TLS）
# 使用 853 端口
```

---

## 八、常见问题

### Q1：dig 和 nslookup 哪个更准确？

**dig 更准确**。nslookup 在某些平台上可能使用不同的 DNS 解析库，结果可能与实际网络请求不同。

### Q2：DNS 缓存多长时间更新？

**TTL 决定**。DNS 记录的 TTL（Time To Live）告诉缓存服务器缓存多长时间。常见值：
- 快速变更的记录：300 秒（5 分钟）
- 稳定记录：3600 秒（1 小时）
- 超长缓存：86400 秒（1 天）

### Q3：如何强制刷新本地 DNS 缓存？

| 系统 | 命令 |
|------|------|
| macOS | `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` |
| Linux | `sudo systemd-resolve --flush-caches` |
| Windows | `ipconfig /flushdns` |
| Chrome | 访问 `chrome://net-internals/#dns` 点击 "Clear host cache" |

### Q4：为什么修改 DNS 后还是不生效？

**原因**：本地或运营商 DNS 缓存未过期

**解决方法**：
1. 等待 TTL 到期
2. 手动清除本地缓存
3. 联系运营商刷新缓存
4. 使用 `+short` 立即查询权威 DNS

---

## 九、总结

**排查流程**：

```
1. 确认问题：网站打不开/邮件发不出/速度慢
       ↓
2. 检查基本连通性：ping / telnet
       ↓
3. 查询 DNS 记录：dig / nslookup
       ↓
4. 对比多个 DNS 服务器结果
       ↓
5. 清除本地缓存后重试
       ↓
6. 确认是否为 DNS 传播问题（全球是否一致）
```

**必备命令**：

```bash
dig example.com +short           # 快速查询
dig example.com +trace           # 追踪路径
dig @8.8.8.8 example.com        # 指定 DNS
nslookup example.com            # 简单查询
whois example.com                # 域名注册信息
```
