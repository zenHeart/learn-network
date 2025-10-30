const Router = require('koa-router');

const specialRedirectRouter = new Router({ prefix: '/redirect' });

// 模拟存储的ETag和资源
const resources = {
  '/api/data': {
    content: { message: 'Hello World', timestamp: Date.now() },
    etag: 'W/"123456789"',
    lastModified: new Date().toUTCString()
  }
};

// 300 Multiple Choices - 资源有多个地址
specialRedirectRouter.get('/300', async (ctx) => {
  console.log(`300 重定向: ${ctx.method} ${ctx.url}`);
  
  ctx.status = 300;
  ctx.set('Link', [
    '</target>; rel="alternate"; title="默认页面"',
    '</target?format=json>; rel="alternate"; title="JSON格式"',
    '</target?format=xml>; rel="alternate"; title="XML格式"'
  ]);
  
  ctx.body = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>300 Multiple Choices</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .choice { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        a { color: #007acc; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>300 Multiple Choices</h1>
    <p>该资源有多个表示形式，请选择一个:</p>
    
    <div class="choice">
        <h3><a href="/target">默认 HTML 页面</a></h3>
        <p>标准的 HTML 格式响应</p>
    </div>
    
    <div class="choice">
        <h3><a href="/target?format=json">JSON 格式</a></h3>
        <p>适用于 API 调用的 JSON 格式</p>
    </div>
    
    <div class="choice">
        <h3><a href="/target?format=xml">XML 格式</a></h3>
        <p>XML 格式的数据表示</p>
    </div>
    
    <p><small>注意: Link 头部包含了机器可读的选项信息</small></p>
</body>
</html>
  `;
});

// 304 Not Modified - 缓存协商
specialRedirectRouter.get('/304', async (ctx) => {
  console.log(`304 缓存协商: ${ctx.method} ${ctx.url}`);
  
  const resource = resources['/api/data'];
  const ifNoneMatch = ctx.get('If-None-Match');
  const ifModifiedSince = ctx.get('If-Modified-Since');
  
  console.log('客户端 If-None-Match:', ifNoneMatch);
  console.log('客户端 If-Modified-Since:', ifModifiedSince);
  console.log('服务器 ETag:', resource.etag);
  console.log('服务器 Last-Modified:', resource.lastModified);
  
  // 检查 ETag
  if (ifNoneMatch && ifNoneMatch === resource.etag) {
    console.log('ETag 匹配，返回 304');
    ctx.status = 304;
    ctx.set('ETag', resource.etag);
    ctx.set('Last-Modified', resource.lastModified);
    ctx.set('Cache-Control', 'max-age=3600');
    return;
  }
  
  // 检查 Last-Modified
  if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(resource.lastModified)) {
    console.log('Last-Modified 检查，资源未修改，返回 304');
    ctx.status = 304;
    ctx.set('ETag', resource.etag);
    ctx.set('Last-Modified', resource.lastModified);
    ctx.set('Cache-Control', 'max-age=3600');
    return;
  }
  
  // 资源已修改或首次请求，返回完整内容
  console.log('资源已修改或首次请求，返回 200');
  ctx.status = 200;
  ctx.set('ETag', resource.etag);
  ctx.set('Last-Modified', resource.lastModified);
  ctx.set('Cache-Control', 'max-age=3600');
  
  ctx.body = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>304 缓存协商示例</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .cache-info { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .test-button { background: #007acc; color: white; padding: 10px 15px; border: none; border-radius: 3px; cursor: pointer; margin: 5px; }
        .test-button:hover { background: #005fa3; }
    </style>
</head>
<body>
    <h1>304 Not Modified 缓存协商示例</h1>
    
    <div class="cache-info">
        <h3>当前资源信息:</h3>
        <p><strong>ETag:</strong> ${resource.etag}</p>
        <p><strong>Last-Modified:</strong> ${resource.lastModified}</p>
        <p><strong>内容:</strong> ${JSON.stringify(resource.content)}</p>
    </div>
    
    <h3>测试说明:</h3>
    <p>1. 首次访问此页面会返回 200 状态码和完整内容</p>
    <p>2. 再次刷新页面，浏览器会发送 If-None-Match 头部</p>
    <p>3. 服务器比较 ETag，如果匹配则返回 304 Not Modified</p>
    <p>4. 浏览器使用缓存的版本，节省带宽和服务器资源</p>
    
    <button class="test-button" onclick="location.reload()">刷新页面测试</button>
    <button class="test-button" onclick="location.reload(true)">强制刷新(绕过缓存)</button>
    
    <script>
        // 显示请求头信息
        console.log('当前页面的缓存头信息:');
        console.log('ETag:', '${resource.etag}');
        console.log('Last-Modified:', '${resource.lastModified}');
    </script>
</body>
</html>
  `;
});

// 更新资源的端点(用于测试304)
specialRedirectRouter.post('/304/update', async (ctx) => {
  console.log('更新资源，生成新的 ETag 和 Last-Modified');
  
  const resource = resources['/api/data'];
  resource.content.timestamp = Date.now();
  resource.content.message = ctx.request.body?.message || 'Updated Hello World';
  resource.etag = `W/"${Date.now()}"`;
  resource.lastModified = new Date().toUTCString();
  
  ctx.body = {
    message: '资源已更新',
    newETag: resource.etag,
    newLastModified: resource.lastModified
  };
});

module.exports = specialRedirectRouter;