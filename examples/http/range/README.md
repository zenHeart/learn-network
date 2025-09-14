# 断点续传

## 说明

1. 采用 nodejs 实现一个最简单的断点续传服务器
2. 采用 supertest 编写测试用例验证 Range 头部是否生效

## 使用方法

1. 启动服务端：

   ```bash
   node server.js
   ```

2. 运行测试用例：

   ```bash
   npm install
   npx jest range.test.js
   ```

3. 在 `server.js` 中可以修改 `sample.txt` 文件路径以测试不同文件。
