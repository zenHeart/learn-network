# DNS 查询工具：dig 与 nslookup 完全指南

DNS（域名系统）是互联网的基础设施之一，负责将人类可读的域名（如 `example.com`）解析为机器可读的 IP 地址。当遇到域名无法访问、解析错误或需要排查 DNS 相关问题时，`dig` 和 `nslookup` 是最常用的两款命令行工具。

---

## 目录

- [dig 命令](#dig-命令)
- [nslookup 命令](#nslookup-命令)
- [dig vs nslookup 对比](#dig-vs-nslookup-对比)
- [DNS 故障排查流程](#dns-故障排查流程)
- [常用公共 DNS 服务器](#常用公共-dns-服务器)

---

## dig 命令

`dig`（Domain Information Groper）是 Linux/Unix 系统中功能最强大的 DNS 查询工具，由 BIND 工具包提供。

### 基本语法

```bash
dig [@server] [name] [type]
```

| 参数 | 说明 |
|------|------|
| `@server` | 指定查询使用的 DNS 服务器（IP 或域名），不指定则使用 `/etc/resolv.conf` 中的默认服务器 |
| `name` | 要查询的域名，如 `example.com` |
| `type` | 查询类型，常见值：`A`、`AAAA`、`MX`、`TXT`、`CNAME`、`NS`、`SOA`、`PTR`、`ANY` |

### 常用选项

| 选项 | 说明 |
|------|------|
| `+short` | 仅输出简化的答案结果，去除统计信息和附加段 |
| `+trace` | 追踪 DNS 解析路径，从根服务器开始迭代查询 |
| `+time=2` | 设置查询超时时间（秒），默认 5 秒 |
| `-x` | 反向查询，通过 IP 地址查找域名（PTR 记录） |
| `-t <type>` | 指定查询类型，与 `type` 参数效果相同 |
| `+noall +answer` | 仅输出 Answer 段 |

### 常用示例

**查询域名的 A 记录（IPv4 地址）**

```bash
dig example.com A
```

输出示例：

```
;; ANSWER SECTION:
example.com.        86400    IN    A    93.184.216.34
```

**查询 MX 记录（邮件服务器）**

```bash
dig example.com MX
```

**查询 NS 记录（域名服务器）**

```bash
dig example.com NS
```

**使用指定 DNS 服务器查询**

```bash
dig @8.8.8.8 example.com A
dig @1.1.1.1 example.com A
```

**简化输出（仅答案）**

```bash
dig example.com A +short
```

输出：

```
93.184.216.34
```

**追踪完整解析路径**

```bash
dig example.com A +trace
```

这会从根服务器（`.`）开始，依次查询 TLD 服务器、权威服务器，完整展示递归解析过程。

**反向查询（IP → 域名）**

```bash
dig -x 93.184.216.34
```

**批量查询多域名**

```bash
dig +short example.com A google.com A cloudflare.com A
```

**查看 DNS 传播（查看权威答案的 TTL）**

```bash
dig example.com A +noall +answer +ttlid
```

---

## nslookup 命令

`nslookup` 是一款跨平台（Windows/Linux/macOS）的 DNS 查询工具，功能比 `dig` 简单，但足以应对日常排查。

### 两种运行模式

#### 非交互模式

直接在一行命令中完成查询，适合脚本使用：

```bash
nslookup [name] [server]
```

#### 交互模式

进入交互式提示符，可连续执行多条查询：

```bash
nslookup
> server 8.8.8.8    # 切换 DNS 服务器
> set type=MX        # 设置查询类型
> example.com        # 执行查询
> exit               # 退出
```

### 常用选项

| 命令 | 说明 |
|------|------|
| `server <DNS服务器>` | 指定查询使用的 DNS 服务器 |
| `set type=<类型>` | 设置查询类型：`A`、`MX`、`TXT`、`NS`、`CNAME`、`ANY`、`PTR` |
| `set debug` | 开启调试模式，显示完整的响应报文 |
| `set timeout=<秒>` | 设置查询超时时间 |

### 常用示例

**基本查询**

```bash
nslookup example.com
```

**使用指定 DNS 服务器查询**

```bash
nslookup example.com 8.8.8.8
```

**查询邮件服务器记录**

```bash
nslookup -type=MX example.com
```

在交互模式中：

```
> set type=MX
> example.com
```

**查询 TXT 记录（常用于 SPF、DKIM 验证）**

```bash
nslookup -type=TXT example.com
```

**开启调试模式查看完整响应**

```bash
nslookup -debug example.com
```

---

## dig vs nslookup 对比

| 特性 | dig | nslookup |
|------|-----|----------|
| **跨平台** | Linux/Unix/macOS（需安装 BIND） | Windows/Linux/macOS 内置 |
| **输出详细程度** | 非常详细（含统计、TTL、权限段） | 相对简洁 |
| **+short 模式** | ✅ 支持 | ❌ 不支持 |
| **+trace 追踪** | ✅ 支持 | ❌ 不支持 |
| **反向查询语法** | `dig -x <IP>` | `nslookup <IP>` |
| **批量查询** | ✅ 支持 | ❌ 不支持 |
| **脚本化** | 适合 | 适合 |
| **权威性** | 直接显示权威答案 | 显示递归查询结果 |
| **维护状态** | 活跃维护（BIND 9） | 逐步被弃用 |

### 选型建议

- **日常快速排查**：使用 `nslookup`（上手简单，随系统可用）
- **深度故障排查、脚本化**：使用 `dig`（功能更全面，输出更可控）
- **追踪解析路径**：必须使用 `dig +trace`
- **多域名批量查询**：必须使用 `dig`
- **Windows 环境下**：优先 `nslookup`，有条件可安装 `dig`（via BIND 或 Chocolatey）

> ⚠️ **注意**：`nslookup` 正在被逐步淘汰，部分现代 Linux 发行版已默认不再预装。推荐掌握 `dig` 作为主要工具。

---

## DNS 故障排查流程

当遇到域名无法访问或 DNS 相关问题时，按以下流程逐步排查：

### 步骤 1：ping 域名 — 验证 DNS 解析

```bash
ping example.com
```

- **成功**：`PING example.com (93.184.216.34) ...` — DNS 解析正常，问题可能在其他层
- **失败**：`ping: cannot resolve example.com` — DNS 解析有问题，继续下一步

### 步骤 2：nslookup/dig — 确认 DNS 解析结果

```bash
nslookup example.com
# 或
dig example.com A +short
```

确认返回的 IP 地址是否预期值。

### 步骤 3：对比多个 DNS 服务器 — 排查 DNS 服务器问题

不同公共 DNS 服务器可能缓存不同的结果：

```bash
dig @8.8.8.8 example.com A +short    # Google DNS
dig @1.1.1.1 example.com A +short   # Cloudflare DNS
dig @208.67.222.222 example.com A +short  # OpenDNS
```

- **所有服务器返回相同结果**：DNS 记录本身没有问题
- **某些服务器返回不同结果**：该服务器可能缓存了过期/错误记录
- **部分服务器无响应**：该 DNS 服务器可能故障

### 步骤 4：dig +trace — 追踪解析路径

当常规查询结果异常时，使用 trace 追踪完整解析链路：

```bash
dig example.com A +trace
```

观察在哪一步出现问题：

- 根服务器无响应 → 网络连接问题
- TLD 服务器无响应 → 域名可能已过期
- 权威服务器返回 NXDOMAIN → 域名未注册或配置错误

### 步骤 5：检查 TTL 值 — 排查缓存问题

DNS 记录有 TTL（生存时间），缓存过期前不会重新查询：

```bash
dig example.com A +noall +answer +ttlid
```

输出示例：

```
example.com.        86400    IN    A    93.184.216.34
```

- **TTL 很高（如 86400 = 24小时）**：修改 DNS 记录后需等待较长时间生效
- **TTL 很低（如 300 = 5分钟）**：DNS 变更会快速生效，但也可能频繁解析

#### 强制刷新本地 DNS 缓存

| 操作系统 | 命令 |
|----------|------|
| Windows | `ipconfig /flushdns` |
| macOS | `sudo dscacheutil -flushcache` |
| Linux | `sudo systemd-resolve --flush-caches` 或 `sudo service nscd restart` |

### 完整排查示例

```bash
# 1. ping 测试
ping example.com

# 2. dig 简查
dig example.com A +short

# 3. 对比多 DNS 服务器
dig @8.8.8.8 example.com A
dig @1.1.1.1 example.com A

# 4. 追踪路径
dig example.com A +trace

# 5. 查看 TTL
dig example.com A +noall +answer +ttlid
```

---

## 常用公共 DNS 服务器

当需要对比排查或绕过 ISP DNS 时，可使用以下公共 DNS 服务器：

| 提供商 | IP 地址 | 备用 IP | 特点 |
|--------|---------|---------|------|
| **Google** | `8.8.8.8` | `8.8.4.4` | 全球覆盖，稳定性高 |
| **Cloudflare** | `1.1.1.1` | `1.0.0.1` | 隐私优先，不记录查询日志 |
| **OpenDNS** | `208.67.222.222` | `208.67.220.220` | Cisco 旗下，含安全过滤选项 |
| **Quad9** | `9.9.9.9` | `149.112.112.112` | 安全优先，拦截恶意域名 |

### 使用方法

```bash
# 临时指定 DNS 服务器（单次查询）
dig @8.8.8.8 example.com A

# 永久修改系统 DNS（Linux）
# 编辑 /etc/resolv.conf
nameserver 8.8.8.8
nameserver 1.1.1.1

# 永久修改系统 DNS（Windows）
# 控制面板 → 网络和共享中心 → 更改适配器设置 → IPv4 属性
```

---

## 相关资源

- [DNS 协议详解](../http/dns-protocol.md)（如已有）
- [DNS over HTTPS (DoH)](../http/doh.md)
- [VitePress 部署文档](../../.vitepress/config.md)
