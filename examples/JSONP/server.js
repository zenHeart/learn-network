const express = require('express');
const app = express();
const path = require('path');

const app1 = express();
// 提供静态资源服务
app1.use(express.static(path.join(__dirname)));
const PORT1 = 3000;
app1.listen(PORT1, () => {
   console.log(`静态资源服务器运行在 http://localhost:${PORT1}`);
})


// 添加一个常规的 JSON 接口 - 用于对比 JSONP
app.get('/api/data', (req, res) => {
   res.json({
      timestamp: new Date().toISOString(),
      message: "这是普通 JSON 接口，受到同源策略限制",
      data: [1, 2, 3, 4, 5]
   });
});

// JSONP 回调接口 - 允许客户端指定回调函数名
app.get('/api/jsonp', (req, res) => {
   // 获取客户端指定的回调函数名
   const callback = req.query.callback || 'callback';

   // 准备返回的数据
   const data = {
      sererTime: new Date().toISOString(),
      message: "这是通过 JSONP 返回的数据，可以跨域访问",
      data: Array.from({ length: 5 }, (_, i) => ~~(Math.random() * 100) + 1)
   };

   // 设置正确的 MIME 类型为 JavaScript
   res.setHeader('Content-Type', 'application/javascript');

   // 返回包裹在回调函数中的数据
   res.send(`${callback}(${JSON.stringify(data)});`);
});

// 支持命名空间调用的 JSONP 接口
app.get('/api/jsonp/:callbackId', (req, res) => {
   let { callbackId } = req.params;
   const namespaceCallback = req.query.namespace || 'jsonp';
   const callbackFn = `${namespaceCallback}.${callbackId}`;

   // 准备返回的数据
   const data = {
      id: callbackId,
      timestamp: new Date().toISOString(),
      message: `这是通过命名空间方式调用的 JSONP 数据 (${callbackId})`,
      success: true
   };

   // 设置正确的 MIME 类型
   res.setHeader('Content-Type', 'application/javascript');

   // 返回 JavaScript 函数调用
   res.send(`${callbackFn}(${JSON.stringify(data)});`);
});

const PORT = 3001;
app.listen(PORT, () => {
   console.log(`JSONP API 服务器运行在 http://localhost:${PORT}`);
});



