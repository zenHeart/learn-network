# TLS 握手演示

1. 采用 node 在本地模拟 tls 握手过程
2. demo 可以通过 wireshark 抓包，用来辅助理解 tls 的握手流程

## 使用说明

1. 首先生成证书：

   ```bash
   mkdir cert
   cd cert
   openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes -subj "/CN=localhost"
   ```

2. 启动服务器：

   ```bash
   node server.js
   ```

3. 新开终端，启动客户端：

   ```bash
   node client.js
   ```

4. 使用 Wireshark 抓包分析：
   - 过滤器：`tcp.port == 8443`
   - 可以观察到完整的 TLS 握手过程
