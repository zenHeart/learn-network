# IP 地址子网掩码判断原理详解

## 目录

- [IP 地址的二进制结构](#ip-地址的二进制结构)
- [子网掩码与 AND 运算原理](#子网掩码与-and-运算原理)
- [判断两个 IP 是否在同一网段](#判断两个-ip-是否在同一网段)
- [CIDR 表示法](#cidr-表示法)
- [私有 IP 地址范围](#私有-ip-地址范围)
- [IPv4 vs IPv6 地址结构区别](#ipv4-vs-ipv6-地址结构区别)
- [常见场景](#常见场景)
- [代码示例](#代码示例)

---

## IP 地址的二进制结构

### IPv4 地址组成

IPv4 地址由 **32 位二进制数**组成，通常以点分十进制格式表示（如 `192.168.1.1`）。

```
┌─────────────────────────────────────────────────────────────┐
│                    IPv4 地址结构 (32 bit)                    │
├─────────────────────────────────────────────────────────────┤
│  网络部分 (Network)    │      主机部分 (Host)                │
│   高位 bit              │      低位 bit                      │
├─────────────────────────┼───────────────────────────────────┤
│  8 bit  │  8 bit  │  8 bit  │  8 bit                       │
│  192    │  168    │   1     │   1                           │
│ 11000000│10101000 │00000001 │00000001                      │
└─────────┴─────────┴─────────┴──────────────────────────────┘
```

### 十进制与二进制的转换

| 十进制 | 二进制 (8 bit) |
|--------|----------------|
| 0      | 00000000       |
| 1      | 00000001       |
| 128    | 10000000       |
| 192    | 11000000       |
| 168    | 10101000       |
| 255    | 11111111       |

### 示例：192.168.1.1 的二进制表示

```
192 = 11000000
168 = 10101000
1   = 00000001
1   = 00000001

完整二进制：11000000.10101000.00000001.00000001
```

---

## 子网掩码与 AND 运算原理

### 什么是子网掩码

子网掩码（Subnet Mask）用于区分 IP 地址中的 **网络部分** 和 **主机部分**。它是一个 32 位的数字，与 IP 地址配合使用。

**规则：**
- 子网掩码中为 `1` 的位，对应 IP 地址的网络部分
- 子网掩码中为 `0` 的位，对应 IP 地址的主机部分

### 常见子网掩码

| 子网掩码          | 二进制表示                            | CIDR | 可用主机数 |
|-------------------|--------------------------------------|------|-----------|
| 255.255.255.0     | 11111111.11111111.11111111.00000000 | /24  | 254       |
| 255.255.0.0       | 11111111.11111111.00000000.00000000 | /16  | 65,534    |
| 255.0.0.0         | 11111111.00000000.00000000.00000000 | /8   | 16,777,214|
| 255.255.255.128   | 11111111.11111111.11111111.10000000 | /25  | 126       |
| 255.255.255.192   | 11111111.11111111.11111111.11000000 | /26  | 62        |

### AND 运算（按位与）

AND 运算是判断同网段的核心操作：

```
0 AND 0 = 0
0 AND 1 = 0
1 AND 0 = 0
1 AND 1 = 1
```

### IP 地址与子网掩码的 AND 运算

```
IP 地址:    192.168.1.100  = 11000000.10101000.00000001.01100100
子网掩码:   255.255.255.0  = 11111111.11111111.11111111.00000000
                            ─────────────────────────────────────
AND 结果:   192.168.1.0     = 11000000.10101000.00000001.00000000
                                              ↑ 这部分保留（网络部分）
                                                 ↑ 这部分变 0（主机部分）
```

**运算结果 = 网络地址（网段）**

---

## 判断两个 IP 是否在同一网段

### 判断方法

**三步法：**

1. **获取两个 IP 地址**
2. **分别与子网掩码进行 AND 运算**
3. **比较两个 AND 结果是否相同**

### 示例判断

**场景：** 判断 `192.168.1.100` 和 `192.168.1.200` 是否在同一网段（子网掩码 `255.255.255.0`）

```
第一步：IP1 AND 掩码
  192.168.1.100 = 11000000.10101000.00000001.01100100
  255.255.255.0 = 11111111.11111111.11111111.00000000
                = 11000000.10101000.00000001.00000000
                = 192.168.1.0

第二步：IP2 AND 掩码
  192.168.1.200 = 11000000.10101000.00000001.11001000
  255.255.255.0 = 11111111.11111111.11111111.00000000
                = 11000000.10101000.00000001.00000000
                = 192.168.1.0

第三步：比较结果
  192.168.1.0 == 192.168.1.0  →  ✓ 在同一网段
```

### 反面示例

**场景：** 判断 `192.168.1.100` 和 `192.168.2.100` 是否在同一网段（子网掩码 `255.255.255.0`）

```
IP1 AND 掩码 = 192.168.1.0
IP2 AND 掩码 = 192.168.2.0

192.168.1.0 != 192.168.2.0  →  ✗ 不在同一网段
```

---

## CIDR 表示法

### 什么是 CIDR

CIDR（Classless Inter-Domain Routing，无类别域间路由）是一种表示子网掩码的简洁方法。

**表示形式：** `IP前缀/网络位数`

```
192.168.1.0/24  解释：
  - 前 24 位是网络部分
  - 剩余 8 位是主机部分
  - 相当于子网掩码 255.255.255.0
```

### CIDR 与子网掩码对应表

| CIDR   | 子网掩码           | 网络位数 | 主机位数 | 可用 IP 数    |
|--------|-------------------|---------|---------|--------------|
| /32    | 255.255.255.255  | 32      | 0       | 1            |
| /31    | 255.255.255.254  | 31      | 1       | 2            |
| /30    | 255.255.255.252  | 30      | 2       | 4 (2 可用)   |
| /29    | 255.255.255.248  | 29      | 3       | 8 (6 可用)   |
| /28    | 255.255.255.240  | 28      | 4       | 16 (14 可用) |
| /27    | 255.255.255.224  | 27      | 5       | 32 (30 可用) |
| /26    | 255.255.255.192  | 26      | 6       | 64 (62 可用) |
| /25    | 255.255.255.128  | 25      | 7       | 128 (126 可用)|
| /24    | 255.255.255.0    | 24      | 8       | 256 (254 可用)|
| /16    | 255.255.0.0      | 16      | 16      | 65,536 (65,534 可用)|
| /8     | 255.0.0.0        | 8       | 24      | 16,777,216 (16,777,214 可用)|

### 可用主机数计算

```
可用主机数 = 2^(32 - CIDR前缀) - 2

减去 2 的原因：
  - 主机位全 0：代表网络地址（网段本身）
  - 主机位全 1：代表广播地址（向网段内所有主机发送）

例如 /24：2^(32-24) - 2 = 256 - 2 = 254 个可用 IP
```

---

## 私有 IP 地址范围

私有 IP 地址是局域网内部使用的地址，不能直接访问互联网。

### 三大私有地址段

| 类别   | 地址范围                  | CIDR 表示        | 地址数量   | 说明                    |
|--------|--------------------------|-----------------|-----------|------------------------|
| A 类   | 10.0.0.0 - 10.255.255.255 | 10.0.0.0/8      | 16,777,216 | 大型组织/云计算 VPC     |
| B 类   | 172.16.0.0 - 172.31.255.255| 172.16.0.0/12  | 1,048,576  | 中型网络               |
| C 类   | 192.168.0.0 - 192.168.255.255| 192.168.0.0/16 | 65,536    | 家庭/小型办公室网络     |

### 地址段详解

#### 10.0.0.0/8（A 类）
```
范围：10.0.0.0 - 10.255.255.255
网络数：1 个 /8 网段
主机数：每个网段 16,777,214 台

常见用途：AWS VPC、阿里云 VPC、企业骨干网络
```

#### 172.16.0.0/12（B 类）
```
范围：172.16.0.0 - 172.31.255.255
网络数：16 个 /16 网段
主机数：每个网段 65,534 台

子网划分示例：
  172.16.0.0/16
  172.17.0.0/16
  ...
  172.31.0.0/16

常见用途：Docker 默认网段、VMware 虚拟网络
```

#### 192.168.0.0/16（C 类）
```
范围：192.168.0.0 - 192.168.255.255
网络数：256 个 /24 网段
主机数：每个网段 254 台

常见用途：家庭路由器、小型办公室网络
默认网关常见配置：192.168.1.1 或 192.168.0.1
```

### 特殊 IP 地址

| 地址              | 说明                                      |
|------------------|------------------------------------------|
| 0.0.0.0           | 代表"本网络"或"所有主机"（路由表使用）       |
| 127.0.0.1         | 本机 Loopback 地址                       |
| 169.254.0.0/16    | 链路本地地址（DHCP 失败时自动分配）         |
| 255.255.255.255  | 受限广播地址（仅本地网段广播）              |

---

## IPv4 vs IPv6 地址结构区别

### 核心对比

| 特性         | IPv4                      | IPv6                              |
|-------------|---------------------------|----------------------------------|
| 地址长度     | 32 位（4 字节）            | 128 位（16 字节）                 |
| 地址格式     | 点分十进制（192.168.1.1）   | 冒号十六进制（2001:0db8::1）      |
| 地址数量     | 约 43 亿                  | 约 340 润（340 undecillion）      |
| 子网掩码表示 | 255.255.255.0 或 /24      | 仅使用 CIDR 表示法                |
| 私有地址    | 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 | 使用唯一本地地址（ULA）fc00::/7 |

### IPv6 地址结构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        IPv6 地址结构 (128 bit)                           │
├──────────────────────────────────────────────────────────────────────────┤
│  前缀 (64 bit)              │  接口标识符 (64 bit)                        │
├─────────────────────────────┼────────────────────────────────────────────┤
│  全球路由前缀 / 站点前缀      │  EUI-64 / 随机生成 / DHCPv6              │
│  2001:0db8:0100:0001        │  0000:0000:0000:0001                      │
└─────────────────────────────┴────────────────────────────────────────────┘

示例：2001:0db8:0100:0001:0000:0000:0000:0001
简化：2001:db8:100:1::1
```

### IPv6 子网划分

IPv6 通常使用 /64 子网（简化地址管理 SLAAC）：

```
网络前缀：2001:db8:100:1::
接口ID：  ::1
完整地址：2001:db8:100:1::1

子网掩码概念弱化：/64 通常是最小推荐单位
```

---

## 常见场景

### 场景一：局域网内通信判断

**问题：** 我的电脑 IP 是 `192.168.1.100`，网关是 `192.168.1.1`，能否直接访问 `192.168.1.50`？

```
判断：
  - 电脑 IP:     192.168.1.100/24
  - 目标 IP:     192.168.1.50/24
  - 两者 AND 掩码后都是 192.168.1.0

结论：同一网段，可以直接通信（ ARP 请求获取 MAC 地址）
```

### 场景二：跨网段通信

**问题：** 能否直接访问 `192.168.2.100`？

```
判断：
  - 电脑 IP:     192.168.1.100/24
  - 目标 IP:     192.168.2.100/24
  - 电脑所在网段: 192.168.1.0
  - 目标所在网段: 192.168.2.0

结论：不同网段，需要通过网关转发
```

### 场景三：路由决策

**路由决策原则：**
1. 目标 IP 与路由条目进行 AND 运算
2. 结果与路由条目网络地址匹配 → 使用该路由
3. 匹配多条时，使用最长前缀匹配（Longest Prefix Match）

```
路由表示例：
  0.0.0.0/0      → 默认网关 192.168.1.1
  192.168.1.0/24 → 直连网络

访问 8.8.8.8 时：
  - 匹配默认路由 0.0.0.0/0 → 通过网关 192.168.1.1 转发

访问 192.168.1.50 时：
  - 匹配 192.168.1.0/24 → 直连网络，无需网关
```

### 场景四：子网规划

**需求：** 为 200 台设备分配 IP，使用 /24 网段

**方案：**
```
可用地址：254 个/网段
需要的网段数：1 个（200 < 254）

可分配：192.168.1.0/24
可用范围：192.168.1.1 - 192.168.1.254
网关：192.168.1.1
广播地址：192.168.1.255
```

**需求变更：** 部门 A 100台，部门 B 100台

```
方案：划分两个 /25 网段

部门 A：192.168.1.0/25 (126 台可用)
  范围：192.168.1.0 - 192.168.1.127

部门 B：192.168.1.128/25 (126 台可用)
  范围：192.168.1.128 - 192.168.1.255
```

---

## 代码示例

### JavaScript/Node.js 实现

#### 1. IP 与子网掩码的 AND 运算

```javascript
/**
 * 将 IP 地址字符串转换为 32 位整数
 * @param {string} ip - IP 地址，如 "192.168.1.1"
 * @returns {number} 32 位整数
 */
function ipToNumber(ip) {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * 将 32 位整数转换为 IP 地址字符串
 * @param {number} num - 32 位整数
 * @returns {string} IP 地址字符串
 */
function numberToIp(num) {
  const unsigned = num >>> 0;
  return [
    (unsigned >> 24) & 255,
    (unsigned >> 16) & 255,
    (unsigned >> 8) & 255,
    unsigned & 255
  ].join('.');
}

/**
 * IP 地址与子网掩码进行 AND 运算
 * @param {string} ip - IP 地址
 * @param {string} mask - 子网掩码
 * @returns {string} 网络地址
 */
function getNetworkAddress(ip, mask) {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  const networkNum = ipNum & maskNum;
  return numberToIp(networkNum);
}

// 测试
console.log(getNetworkAddress('192.168.1.100', '255.255.255.0'));
// 输出: 192.168.1.0
```

#### 2. 判断两个 IP 是否在同一网段

```javascript
/**
 * 判断两个 IP 是否在同一网段
 * @param {string} ip1 - 第一个 IP 地址
 * @param {string} ip2 - 第二个 IP 地址
 * @param {string} mask - 子网掩码
 * @returns {boolean} 是否在同一网段
 */
function isInSameSubnet(ip1, ip2, mask) {
  const net1 = getNetworkAddress(ip1, mask);
  const net2 = getNetworkAddress(ip2, mask);
  return net1 === net2;
}

// 测试
console.log(isInSameSubnet('192.168.1.100', '192.168.1.200', '255.255.255.0'));
// 输出: true

console.log(isInSameSubnet('192.168.1.100', '192.168.2.100', '255.255.255.0'));
// 输出: false
```

#### 3. CIDR 表示法解析

```javascript
/**
 * 解析 CIDR 表示法，获取网络地址和广播地址
 * @param {string} cidr - CIDR 表示法，如 "192.168.1.0/24"
 * @returns {Object} { network, broadcast, mask, usableHosts }
 */
function parseCIDR(cidr) {
  const [ip, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  if (prefix < 0 || prefix > 32) {
    throw new Error('Invalid prefix length');
  }

  // 计算子网掩码
  const maskNum = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const mask = numberToIp(maskNum);

  // 计算网络地址
  const networkNum = ipToNumber(ip) & maskNum;
  const network = numberToIp(networkNum);

  // 计算广播地址（主机位全 1）
  const hostBits = 32 - prefix;
  const broadcastNum = hostBits === 0 ? networkNum : networkNum | ((1 << hostBits) - 1);
  const broadcast = numberToIp(broadcastNum >>> 0);

  // 计算可用主机数
  const usableHosts = hostBits === 0 ? 1 : Math.pow(2, hostBits) - 2;

  return { network, broadcast, mask, usableHosts };
}

// 测试
console.log(parseCIDR('192.168.1.0/24'));
// 输出:
// {
//   network: '192.168.1.0',
//   broadcast: '192.168.1.255',
//   mask: '255.255.255.0',
//   usableHosts: 254
// }

console.log(parseCIDR('10.0.0.0/8'));
// 输出:
// {
//   network: '10.0.0.0',
//   broadcast: '10.255.255.255',
//   mask: '255.0.0.0',
//   usableHosts: 16777214
// }
```

#### 4. 验证 IP 地址格式

```javascript
/**
 * 验证 IP 地址格式是否合法
 * @param {string} ip - IP 地址字符串
 * @returns {boolean} 是否合法
 */
function isValidIp(ip) {
  if (typeof ip !== 'string') return false;

  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every(part => {
    // 必须是数字
    if (!/^\d+$/.test(part)) return false;
    // 必须在 0-255 范围内
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * 验证子网掩码是否合法
 * @param {string} mask - 子网掩码
 * @returns {boolean} 是否合法
 */
function isValidMask(mask) {
  if (!isValidIp(mask)) return false;

  const maskNum = ipToNumber(mask);

  // 子网掩码必须是连续的 1 后跟连续的 0
  // 例如: 11111111.11111111.11111111.00000000

  // 取反后应该是连续的 0 后跟连续的 1
  const inverted = ~maskNum >>> 0;

  // 使用布林方法检查：连续0后跟连续1
  let seenZero = false;
  for (let i = 31; i >= 0; i--) {
    const bit = (inverted >> i) & 1;
    if (bit === 0) {
      seenZero = true;
    } else if (bit === 1 && seenZero) {
      // 出现了 1 后面跟着 0 的情况，不合法
      return false;
    }
  }

  return true;
}

// 测试
console.log(isValidIp('192.168.1.1'));      // true
console.log(isValidIp('192.168.1.256'));    // false
console.log(isValidIp('192.168.1'));         // false

console.log(isValidMask('255.255.255.0'));  // true
console.log(isValidMask('255.255.0.255'));  // false（不连续）
console.log(isValidMask('255.0.255.0'));    // false（不连续）
```

#### 5. IP 地址范围计算

```javascript
/**
 * 计算 CIDR 网段内的所有 IP 地址
 * @param {string} cidr - CIDR 表示法
 * @returns {string[]} IP 地址数组
 */
function getIpRange(cidr) {
  const { network, broadcast, usableHosts } = parseCIDR(cidr);

  if (usableHosts > 1000) {
    throw new Error('IP range too large, max 1000 addresses');
  }

  const networkNum = ipToNumber(network);
  const broadcastNum = ipToNumber(broadcast);

  const ips = [];
  for (let i = networkNum; i <= broadcastNum; i++) {
    ips.push(numberToIp(i >>> 0));
  }

  return ips;
}

// 测试
console.log(getIpRange('192.168.1.0/30'));
// 输出: ['192.168.1.0', '192.168.1.1', '192.168.1.2', '192.168.1.3']
```

#### 6. 完整示例 - 网络工具类

```javascript
class NetworkUtils {
  constructor(ip, maskOrPrefix) {
    this.ip = ip;
    if (typeof maskOrPrefix === 'string' && maskOrPrefix.includes('/')) {
      const [, prefix] = maskOrPrefix.split('/');
      this.prefix = parseInt(prefix, 10);
      this.mask = numberToIp((~0 << (32 - this.prefix)) >>> 0);
    } else {
      this.mask = maskOrPrefix;
      this.prefix = this.calculatePrefix();
    }
    this.networkAddress = getNetworkAddress(this.ip, this.mask);
  }

  calculatePrefix() {
    const maskNum = ipToNumber(this.mask);
    let prefix = 0;
    for (let i = 31; i >= 0; i--) {
      if ((maskNum >> i) & 1) {
        prefix++;
      } else {
        break;
      }
    }
    return prefix;
  }

  getBroadcast() {
    const networkNum = ipToNumber(this.networkAddress);
    const hostBits = 32 - this.prefix;
    return numberToIp((networkNum | ((1 << hostBits) - 1)) >>> 0);
  }

  getUsableHosts() {
    const hostBits = 32 - this.prefix;
    if (hostBits <= 0) return 0;
    return Math.pow(2, hostBits) - 2;
  }

  isInSameNetwork(otherIp) {
    const otherNetwork = getNetworkAddress(otherIp, this.mask);
    return this.networkAddress === otherNetwork;
  }

  toString() {
    return `${this.networkAddress}/${this.prefix}`;
  }
}

// 使用示例
const local = new NetworkUtils('192.168.1.100', '255.255.255.0');
console.log('网络地址:', local.networkAddress);      // 192.168.1.0
console.log('广播地址:', local.getBroadcast());       // 192.168.1.255
console.log('可用主机数:', local.getUsableHosts());   // 254
console.log('网关是否同网段:', local.isInSameNetwork('192.168.1.1')); // true
console.log('外部IP是否同网段:', local.isInSameNetwork('8.8.8.8'));  // false
```

---

## 总结

### 核心要点

1. **IP 地址 = 网络部分 + 主机部分**
   - 子网掩码决定如何划分

2. **AND 运算是关键**
   - IP AND 掩码 = 网络地址
   - 网络地址相同 = 同一网段

3. **CIDR 简化表示**
   - `/24` = 255.255.255.0
   - `/16` = 255.255.0.0
   - 可用主机数 = 2^(32-前缀) - 2

4. **私有地址三大段**
   - 10.0.0.0/8
   - 172.16.0.0/12
   - 192.168.0.0/16

### 实际应用

- **局域网通信**：直接通信（同一网段）
- **跨网段通信**：需要网关转发
- **路由决策**：最长前缀匹配原则
- **子网规划**：根据主机数量选择合适的 CIDR 前缀
