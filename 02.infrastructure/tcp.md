---
title: tcp_udp    
tag: tcp_udp      
birth: 2017-02-22      
modified: 2017-02-22      
---

tcp_udp
===
**前言:讲解 tcp udp 的基本知识**

---

TCP 具有如下的连接状态

状态|作用|
:---|---|
listen|监听来自远方 tcp 端口发出的请求
syn-sent|发送请求后，等待连接匹配的连接请求
syn-received|等待确认连接的连接请求
established|建立了一个连接
fin-wait-1|等待远程 tcp 连接中断请求，或先前的连接终端确认
fin-wait-2|从远程 tcp 等待连接终端请求
close-wait|等待从本地用户发来的连接中断请求
last-ack|等待原来的发向远程 tcp 的连接中断请求的确认
time-wait|等待足够的时间确认远程 tcp 接受到连接中断请求的确认
closed|没有任何连接状态


利用 `netstat` 查看连接的类型

```bash
# 查看所有 tcp 连接
# 或者 `netstat -nlp` 也可
netstat -alt 

Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 lockePc:mysql           *:*                     LISTEN     
tcp        0      0 *:netbios-ssn           *:*                     LISTEN     
tcp        0      0 127.0.1.1:domain        *:*                     LISTEN     
tcp        0      0 *:ssh                   *:*                     LISTEN     
tcp        0      0 *:microsoft-ds          *:*                     LISTEN     
tcp        0      0 10.86.136.14:46926      10.86.136.2:24800       ESTABLISHED
tcp        0      0 10.86.136.:microsoft-ds 10.86.136.2:56710       ESTABLISHED
tcp        0      0 lockePc:43322           lockePc:mysql           ESTABLISHED
tcp        0      0 10.86.136.:microsoft-ds 10.86.136.2:56709       ESTABLISHED
tcp        0      0 lockePc:mysql           lockePc:43322           ESTABLISHED
tcp        0      0 10.86.136.:microsoft-ds 10.86.136.2:57431       ESTABLISHED
tcp        0      0 10.86.136.14:33210      112.74.170.197:ssh      ESTABLISHED
tcp        0      0 10.86.136.:microsoft-ds 10.86.136.2:57432       ESTABLISHED
tcp6       0      0 [::]:netbios-ssn        [::]:*                  LISTEN     
tcp6       0      0 [::]:http               [::]:*                  LISTEN     
tcp6       0      0 [::]:ssh                [::]:*                  LISTEN     
tcp6       0      0 [::]:microsoft-ds       [::]:*                  LISTEN     

```
注意理解 `local adress` 这个字段决定了服务的连接范围。
假设某一服务显示如下的格式则含义为

* :::80 允许任意 ip 地址连接，(ipv4 或 ipv6)
* 0.0.0.0:80 允许任意 ipv4 端口连接
* 127.0.0.1:80 只允许本地连接
* 192.168.0.5:80 允许额外的 ipv4 地址 192、168.0.5 连接

注意 ip 和端口可以利用符号指代。使用 `netstat` 命令时
`-n` 参数就是以非指代方式进行显示,常见的指代含义如下

**ip 的别名**

名称|含义|
:---|---|
`*`|类似 `0.0.0.0`
`[::]`|类似`::`

**端口的别名**

名称|含义|
:---|---|
ssh|指代 22 端口|
http|指代 80 端口|
mysql|指代 3306 端口|

通过此特性配置网络连接的允许范围。

## 参看资料

[tcp 和 udp](http://www.erg.abdn.ac.uk/users/gorry/course/inet-pages/packet-decode.html)


# frame description

```packetdiag
packetdiag {
  colwidth = 32;
  node_height = 72;

  0-15: Source Port; 
  16-31: Destination Port;
  32-63: Sequence Number;
  64-95: Acknowledgment Number;
  // TCP 数据帧字节数, 对应数字*4B, 因为默认为 32 位 测试
  96-99: Data Offset;
  // 保留控制位, 6 位
  100-105: Reserved;
  106: URG [rotate = 270];
  107: ACK [rotate = 270];
  108: PSH [rotate = 270];
  109: RST [rotate = 270];
  110: SYN [rotate = 270];
  111: FIN [rotate = 270];
  // 滑动窗口大小
  112-127: Window;
  // 校验和
  128-143: Checksum;
  // 紧急指针？
  144-159: Urgent Pointer;
  160-191: (Options and Padding);
  192-223: data [colheight = 3];
}
```

## Sequence Number 的初始值

1. sequence number 的生成规则？

## acknowldge number

1. acknowledge number 默认为 0
2. 为什么 acknowledge number 默认为 0，为什么 sequence number 不像 acknowledge number 一样默认为 0

在 TCP 连接建立的过程中，`acknowledge number`（确认号）在初始 SYN 包中默认为 0，因为在连接建立之前，双方还没有交换任何数据，因此没有需要确认的数据。

而 `sequence number`（序列号）则不同。`sequence number` 是用来标识每个数据包在整个数据流中的位置的。为了确保每个连接的唯一性和安全性，`sequence number` 的初始值（Initial Sequence Number, ISN）是随机生成的。这样可以防止重放攻击和其他安全威胁。如果 `sequence number` 默认为 0，那么攻击者可以更容易地预测和劫持连接。

## 为什么 sequence number 为 0 会被攻击

如果 `sequence number` 默认为 0，攻击者可以利用这一点进行 TCP 序列号预测攻击。以下是一个具体的例子：

1. 假设客户端 A 与服务器 B 建立连接，客户端 A 的初始序列号为 0。
2. 攻击者 C 知道客户端 A 的初始序列号为 0，并且可以伪造一个与服务器 B 的连接请求，使用相同的初始序列号 0。
3. 服务器 B 收到攻击者 C 的伪造请求后，会认为这是一个合法的请求，并与攻击者 C 建立连接。
4. 攻击者 C 可以发送伪造的数据包，冒充客户端 A 与服务器 B 通信，甚至可以劫持整个连接。

通过随机生成初始序列号，可以使攻击者难以预测序列号，从而提高连接的安全性，防止上述攻击。





