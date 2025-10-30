const Koa = require('koa');
const Router = require('koa-router');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const path = require('path');

// 导入路由模块
const permanentRedirectRouter = require('./routes/permanent');
const temporaryRedirectRouter = require('./routes/temporary');
const specialRedirectRouter = require('./routes/special');

const app = new Koa();
const router = new Router();

// 中间件
app.use(bodyParser());
app.use(serve(path.join(__dirname, 'public')));

// 记录请求日志
app.use(async (ctx, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url}`);
  await next();
  const ms = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url} - ${ctx.status} (${ms}ms)`);
});

// 首页 - 展示所有重定向示例
router.get('/', async (ctx) => {
  ctx.body = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTP 重定向示例</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 90vh; }
        .container { background: rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 15px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37); }
        .section { margin: 20px 0; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .code { background: rgba(0, 0, 0, 0.3); padding: 10px; margin: 10px 0; border-radius: 3px; font-family: monospace; }
        a { color: #4fc3f7; text-decoration: none; margin: 5px; display: inline-block; padding: 8px 15px; background: rgba(79, 195, 247, 0.2); border-radius: 5px; transition: all 0.3s; }
        a:hover { text-decoration: underline; background: rgba(79, 195, 247, 0.4); }
        form { margin: 10px 0; display: inline-block; }
        input, button { margin: 5px; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; }
        button { background: #4caf50; color: white; transition: background 0.3s; }
        button:hover { background: #45a049; }
        .warning { background: #ff9800; }
        .warning:hover { background: #e68900; }
        .danger { background: #f44336; }
        .danger:hover { background: #da190b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 HTTP 重定向示例大全</h1>
        <p>本项目演示了 HTTP 协议中的各种重定向机制，包括状态码重定向、Meta Refresh 和 JavaScript 重定向。</p>
        
        <div class="section">
            <h2>🔄 1. 永久重定向 (3xx)</h2>
            <h3>301 Moved Permanently</h3>
            <p>💡 GET 方法保持不变，其他方法会变为 GET</p>
            <a href="/redirect/301/get" target="_blank">测试 301 GET</a>
            <form action="/redirect/301/post" method="post" target="_blank">
                <button type="submit">测试 301 POST</button>
            </form>
            
            <h3>308 Permanent Redirect</h3>
            <p>💡 方法和请求体都保持不变</p>
            <a href="/redirect/308/get" target="_blank">测试 308 GET</a>
            <form action="/redirect/308/post" method="post" target="_blank">
                <button type="submit">测试 308 POST</button>
            </form>
        </div>
        
        <div class="section">
            <h2>⏱️ 2. 临时重定向 (3xx)</h2>
            <h3>302 Found</h3>
            <p>💡 GET 方法保持不变，其他方法会变为 GET。常用于 OAuth2.0</p>
            <a href="/redirect/302/get" target="_blank">测试 302 GET</a>
            <form action="/redirect/302/post" method="post" target="_blank">
                <button type="submit">测试 302 POST</button>
            </form>
            <a href="/redirect/302/oauth?redirect_uri=http://localhost:3000/target&state=test123" target="_blank">OAuth2.0 模拟</a>
            
            <h3>303 See Other</h3>
            <p>💡 所有方法都变为 GET，用于 POST/PUT 完成后重定向</p>
            <a href="/redirect/303/get" target="_blank">测试 303 GET</a>
            <form action="/redirect/303/post" method="post" target="_blank">
                <button type="submit">测试 303 POST</button>
            </form>
            
            <h3>307 Temporary Redirect</h3>
            <p>💡 方法和请求体都保持不变，优先级高于 302</p>
            <a href="/redirect/307/get" target="_blank">测试 307 GET</a>
            <form action="/redirect/307/post" method="post" target="_blank">
                <button type="submit">测试 307 POST</button>
            </form>
        </div>
        
        <div class="section">
            <h2>🎯 3. 特殊重定向</h2>
            <h3>300 Multiple Choices</h3>
            <p>💡 资源有多个表示形式</p>
            <a href="/redirect/300" target="_blank">测试 300 多选项</a>
            
            <h3>304 Not Modified</h3>
            <p>💡 缓存协商，用于验证资源是否修改</p>
            <a href="/redirect/304" target="_blank">测试 304 缓存</a>
        </div>
        
        <div class="section">
            <h2>🖥️ 4. 前端重定向</h2>
            <a href="/meta-refresh.html" target="_blank">Meta Refresh 重定向演示</a>
            <a href="/js-redirect.html" target="_blank">JavaScript 重定向演示</a>
        </div>
        
        <div class="section">
            <h2>🏁 5. 重定向优先级测试</h2>
            <p>测试 HTTP 状态码、Meta Refresh 和 JavaScript 重定向的优先级</p>
            <a href="/priority-test.html" target="_blank" class="warning">🎯 优先级测试页面</a>
        </div>
        
        <div class="section">
            <h2>📚 6. 技术文档</h2>
            <p>查看项目的详细技术文档和 API 说明</p>
            <a href="/docs" target="_blank">📖 查看文档</a>
        </div>
    </div>
    
    <script>
        console.log('HTTP 重定向示例项目');
        console.log('项目地址: https://github.com/zenHeart/learn-network');
        console.log('当前时间:', new Date().toLocaleString());
    </script>
</body>
</html>
  `;
});

// 目标页面
router.get('/target', async (ctx) => {
  const from = ctx.query.from || '未知来源';
  const code = ctx.query.code || '';
  const state = ctx.query.state || '';
  const format = ctx.query.format || 'html';
  
  // 根据格式返回不同内容
  if (format === 'json') {
    ctx.type = 'application/json';
    ctx.body = {
      message: '重定向成功！',
      method: ctx.method,
      timestamp: new Date().toISOString(),
      referer: ctx.get('Referer') || '直接访问',
      from: from,
      query: ctx.query
    };
    return;
  }
  
  if (format === 'xml') {
    ctx.type = 'application/xml';
    ctx.body = `<?xml version="1.0" encoding="UTF-8"?>
<response>
    <message>重定向成功！</message>
    <method>${ctx.method}</method>
    <timestamp>${new Date().toISOString()}</timestamp>
    <referer>${ctx.get('Referer') || '直接访问'}</referer>
    <from>${from}</from>
</response>`;
    return;
  }
  
  ctx.body = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>重定向目标页面</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; text-align: center; background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; min-height: 80vh; display: flex; flex-direction: column; justify-content: center; }
        .container { background: rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 15px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37); }
        .success { color: #ffeb3b; font-size: 1.5em; margin: 20px 0; }
        .info { background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px; margin: 10px 0; text-align: left; }
        a { color: #4fc3f7; text-decoration: none; padding: 10px 20px; background: rgba(79, 195, 247, 0.2); border-radius: 5px; display: inline-block; margin: 10px; }
        a:hover { background: rgba(79, 195, 247, 0.4); }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="success">✅ 重定向成功！</h1>
        
        <div class="info">
            <h3>📊 请求信息:</h3>
            <p><strong>请求方法:</strong> ${ctx.method}</p>
            <p><strong>请求时间:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>请求来源:</strong> ${ctx.get('Referer') || '直接访问'}</p>
            <p><strong>重定向来源:</strong> ${from}</p>
            ${code ? `<p><strong>授权码:</strong> ${code}</p>` : ''}
            ${state ? `<p><strong>状态参数:</strong> ${state}</p>` : ''}
        </div>
        
        ${ctx.query.test ? '<div class="info"><p>🧪 这是一个测试请求</p></div>' : ''}
        
        <div style="margin: 30px 0;">
            <a href="/">🏠 返回首页</a>
            <a href="javascript:history.back()">⬅️ 返回上页</a>
            <a href="/target?format=json">📄 JSON 格式</a>
            <a href="/target?format=xml">📄 XML 格式</a>
        </div>
        
        <div class="info">
            <h3>💡 说明:</h3>
            <p>这个页面是所有重定向测试的目标页面。你可以通过不同的重定向方式到达这里，观察请求方法和参数的变化。</p>
        </div>
    </div>
    
    <script>
        console.log('重定向目标页面');
        console.log('请求方法:', '${ctx.method}');
        console.log('请求参数:', ${JSON.stringify(ctx.query)});
        console.log('请求头 Referer:', '${ctx.get('Referer') || ''}');
    </script>
</body>
</html>
  `;
});

// 文档页面
router.get('/docs', async (ctx) => {
  ctx.body = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTP 重定向示例 - 技术文档</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 3px solid #007acc; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }
        .code { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007acc; margin: 10px 0; font-family: 'Courier New', monospace; }
        .method { background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 5px 0; }
        .endpoint { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 5px 0; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .back-link { display: inline-block; margin-bottom: 20px; color: #007acc; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">← 返回首页</a>
        
        <h1>HTTP 重定向示例 - 技术文档</h1>
        
        <h2>项目概述</h2>
        <p>这个项目使用 Koa.js 框架演示了 HTTP 协议中的各种重定向机制，包括：</p>
        <ul>
            <li>HTTP 状态码重定向 (301, 302, 303, 307, 308)</li>
            <li>特殊重定向 (300, 304)</li>
            <li>Meta Refresh 重定向</li>
            <li>JavaScript 重定向</li>
            <li>重定向优先级测试</li>
        </ul>
        
        <h2>API 端点</h2>
        
        <h3>永久重定向</h3>
        <div class="endpoint">GET /redirect/301/get</div>
        <div class="method">返回 301 状态码，GET 方法保持不变</div>
        
        <div class="endpoint">POST /redirect/301/post</div>
        <div class="method">返回 301 状态码，POST 方法会变为 GET</div>
        
        <div class="endpoint">GET /redirect/308/get</div>
        <div class="method">返回 308 状态码，方法和请求体保持不变</div>
        
        <div class="endpoint">POST /redirect/308/post</div>
        <div class="method">返回 308 状态码，方法和请求体保持不变</div>
        
        <h3>临时重定向</h3>
        <div class="endpoint">GET /redirect/302/get</div>
        <div class="method">返回 302 状态码，GET 方法保持不变</div>
        
        <div class="endpoint">POST /redirect/302/post</div>
        <div class="method">返回 302 状态码，POST 方法会变为 GET</div>
        
        <div class="endpoint">GET /redirect/302/oauth</div>
        <div class="method">OAuth2.0 授权码模式模拟，支持 redirect_uri 和 state 参数</div>
        
        <div class="endpoint">GET /redirect/303/get</div>
        <div class="method">返回 303 状态码，所有方法都变为 GET</div>
        
        <div class="endpoint">POST /redirect/303/post</div>
        <div class="method">返回 303 状态码，用于表单提交后重定向</div>
        
        <div class="endpoint">GET /redirect/307/get</div>
        <div class="method">返回 307 状态码，方法和请求体保持不变</div>
        
        <div class="endpoint">POST /redirect/307/post</div>
        <div class="method">返回 307 状态码，方法和请求体保持不变</div>
        
        <h3>特殊重定向</h3>
        <div class="endpoint">GET /redirect/300</div>
        <div class="method">返回 300 状态码，展示多个资源选择</div>
        
        <div class="endpoint">GET /redirect/304</div>
        <div class="method">返回 304 状态码，演示缓存协商机制</div>
        
        <h2>重定向状态码对比</h2>
        <table>
            <tr>
                <th>状态码</th>
                <th>名称</th>
                <th>方法变化</th>
                <th>使用场景</th>
            </tr>
            <tr>
                <td>301</td>
                <td>Moved Permanently</td>
                <td>GET 不变，其他变 GET</td>
                <td>永久性 URL 变更</td>
            </tr>
            <tr>
                <td>302</td>
                <td>Found</td>
                <td>GET 不变，其他变 GET</td>
                <td>临时重定向，OAuth2.0</td>
            </tr>
            <tr>
                <td>303</td>
                <td>See Other</td>
                <td>所有方法都变 GET</td>
                <td>POST/PUT 后查看结果</td>
            </tr>
            <tr>
                <td>307</td>
                <td>Temporary Redirect</td>
                <td>方法和请求体不变</td>
                <td>临时重定向，保持方法</td>
            </tr>
            <tr>
                <td>308</td>
                <td>Permanent Redirect</td>
                <td>方法和请求体不变</td>
                <td>永久重定向，保持方法</td>
            </tr>
        </table>
        
        <h2>使用示例</h2>
        
        <h3>curl 命令测试</h3>
        <div class="code">
# 测试 301 GET 重定向
curl -v http://localhost:3000/redirect/301/get

# 测试 302 POST 重定向
curl -v -X POST http://localhost:3000/redirect/302/post

# 测试 304 缓存协商
curl -v -H "If-None-Match: W/\\"123456789\\"" http://localhost:3000/redirect/304

# 测试 OAuth2.0 重定向
curl -v "http://localhost:3000/redirect/302/oauth?redirect_uri=http://example.com&state=test123"
        </div>
        
        <h3>JavaScript 客户端测试</h3>
        <div class="code">
// 测试 fetch API 重定向行为
fetch('/redirect/301/get')
  .then(response => console.log('最终 URL:', response.url))
  .catch(error => console.error('错误:', error));

// 测试不同重定向方法
['301', '302', '303', '307', '308'].forEach(code => {
  fetch(\`/redirect/\${code}/get\`)
    .then(response => console.log(\`\${code} 重定向结果:\`, response.url));
});
        </div>
        
        <h2>项目结构</h2>
        <div class="code">
redirect/
├── app.js              # 主应用文件
├── package.json        # 项目配置
├── routes/
│   ├── permanent.js    # 永久重定向路由
│   ├── temporary.js    # 临时重定向路由
│   └── special.js      # 特殊重定向路由
├── public/
│   ├── meta-refresh.html    # Meta Refresh 演示
│   ├── js-redirect.html     # JavaScript 重定向演示
│   └── priority-test.html   # 优先级测试页面
└── README.md           # 项目说明
        </div>
        
        <h2>启动项目</h2>
        <div class="code">
# 安装依赖
npm install

# 启动服务器
npm start

# 开发模式 (自动重启)
npm run dev

# 访问地址
http://localhost:3000
        </div>
    </div>
</body>
</html>
  `;
});

// 注册路由
app.use(router.routes()).use(router.allowedMethods());
app.use(permanentRedirectRouter.routes()).use(permanentRedirectRouter.allowedMethods());
app.use(temporaryRedirectRouter.routes()).use(temporaryRedirectRouter.allowedMethods());
app.use(specialRedirectRouter.routes()).use(specialRedirectRouter.allowedMethods());

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HTTP 重定向示例服务器启动成功！`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`📚 技术文档: http://localhost:${PORT}/docs`);
  console.log(`🎯 优先级测试: http://localhost:${PORT}/priority-test.html`);
  console.log(`⏱️  Meta Refresh: http://localhost:${PORT}/meta-refresh.html`);
  console.log(`💻 JavaScript: http://localhost:${PORT}/js-redirect.html`);
});

module.exports = app;