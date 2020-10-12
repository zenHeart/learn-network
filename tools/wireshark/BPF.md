# BPF

## BPF 是什么
BPF(Berkeley Packet Filter) 是一种用于对网络包进行过滤的语言描述，常用于 wireshark 等网络抓包工具。

## BPF 结构
一个典型的 BPF 描述如下

> `host www.example.com and not port 80 and not port 25`

上述语句含义为
1. 过滤域名为 www.example.com 的网络包
2. 在 1 的基础上网络包端口不能为 80
3. 在 2 的基础上网络包端口不能为 25

上述语句的抽象结构如下

> `<primitives> [<logic> <primitives>]*`

* **primitives** 表示一个独立的描述例如 `host www.example.com`,`port 80 ` 等
* `<logic>` 为连接 `<primitive>` 的逻辑，支持 `and,or,not` 也可用 `||,&&,!` 符号进行替换。

过滤语法的学习重点就是 `<primitives>` 表达是的学习。

## primitives
primitives 的结构又可以拆分为

> `<qualifier> <id>`

* `<qualifier>` 是 `<id>` 的修饰符，例如 `host,port` 等都是 `<qualifier>`
* `<id>` 表示具体的过滤内容，例如 `www.example.com,80` 就是 `<id>`,当不包含 `<qualifier>` 时，默认 `<id>` 的 `<qualifier>` 为 `host`


### qualifier
`<qualifier>` 的类别分为三种

* `type` 描述 `id` 属于哪种，常见类型为
  * `host` 域名，**当 id 不带有 <qualifier> 时默认解析为 host**
  * `port` 端口号，将 `<id>` 作为端口号处理
  * `portrange` 端口范围描述，**注意此时的 <id> 值必须用 `-` 划分表示范围，例如 `80-82`**
  * `net` IP 地址
* `dir` 说明网络包的传输方向
  * `src` 源地址，例如 `src host www.example.com` 只过滤从 `www.example.com` 发出的内容
  * `dst` 目标地址，例如 `dst host www.example.com` 只过滤发往 `www.example.com` 的内容
  * `src or dst` 源地址或目标地址,**未声明 `<dir>` 时的默认值**，例如 `host www.example.com` 过滤发出和来自 `www.example.com` 的内容
  * `src and dst` 源地址且目标地址，例如 `host www.example.com` 过滤发出和来自 `src and dst www.example.com` 表示发出和目标地址均为 `www.example.com` 的请求，**多用于本地请求**
* `proto` 限制匹配的协议，常见的如 `tcp,udp,ip,ip6,wlan,http` 等，例如 `tcp port 80` 表示只过滤端口为 `80` 的 tcp 请求


可以看到不同类型 `<qualifier>` 可以组合使用。通过不同的 `<qualifire>` 结合 `<id>` 可以实现不同类型的 `<primitives>`, 合法的 `<primitives>` 清单详见 [Allowable primitives](https://www.tcpdump.org/manpages/pcap-filter.7.html)


## 包过滤
除了协议层面的过滤，我们期望可以对网络包进行过滤。
例如 `icmp[0:2]==0x0301` 过滤协议 icmp 数据包头部两字节等于 `0x0301` 的网络包。语法格式为

> <expr> <relop> <expr>

* `<expr>` 表达式，用于描述网络包的字段或者求值
* `<relop>` 关系运算符，进行逻辑判断，支持所有合法的 C 逻辑运算符，例如 `>, <, >=, <=, =, !=,+, -, *, /, %, &, |, ^, <<, >>`

网络包具体数据帧的描述语法如下

> `<proto>[expr: size]<logic>`

* `<proto>` 表示协议类型，规则和 `<qualifier>` 中的 `proto` 一致
* `[expr: size]` 表示协议包中的具体字段
  * `expr` 表示一字节为单位的偏移，例如 `icmp[0]` 为 icmp 协议0 偏移位置即首字节的内容
  * `size` 可选，表示字节长度，例如 `icmp[0:2]` 为 icmp 协议 0 偏移位置长度为 2 个字节的内容


典型示例

```
# 过滤从 1500-1550 端口发出或接受的请求
(tcp[0:2] > 1500 and tcp[0:2] < 1550) or (tcp[2:2] > 1500 and tcp[2:2] < 1550)
```

## 典型示例

```
# 发送或发出域名包含 sundown,的网络包
host sundown
# 发送或发出域名包含 helios，hot，ace 其中一个的网络包
host helios and (hot or ace)
# 选择 ipv4 ，发送或发出域名包含 ace 且无 helios 的网络包
ip host ace and not helios
```


## 参考资料
* [BPF wiki](https://en.wikipedia.org/wiki/Berkeley_Packet_Filter)
* [Filtering while capturing](https://www.wireshark.org/docs/wsug_html_chunked/ChCapCaptureFilterSection.html)
* [PCAP-FILTER](https://www.tcpdump.org/manpages/pcap-filter.7.html)