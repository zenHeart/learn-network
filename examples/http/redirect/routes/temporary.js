const Router = require('koa-router');

const temporaryRedirectRouter = new Router({ prefix: '/redirect' });

// 302 Found - GET 不变，其他方法变为 GET，常用于 OAuth2.0
temporaryRedirectRouter.get('/302/get', async (ctx) => {
  console.log(`302 重定向: ${ctx.method} ${ctx.url}`);
  ctx.status = 302;
  ctx.set('Location', '/target');
  ctx.body = '302 Found - GET 请求';
});

temporaryRedirectRouter.post('/302/post', async (ctx) => {
  console.log(`302 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  ctx.status = 302;
  ctx.set('Location', '/target');
  ctx.body = '302 Found - POST 请求会变为 GET';
});

// OAuth2.0 授权码模式模拟
temporaryRedirectRouter.get('/302/oauth', async (ctx) => {
  console.log('OAuth2.0 授权重定向模拟');
  const authCode = 'mock_auth_code_' + Date.now();
  const redirectUri = ctx.query.redirect_uri || '/target';
  const state = ctx.query.state || 'default_state';
  
  ctx.status = 302;
  ctx.set('Location', `${redirectUri}?code=${authCode}&state=${state}`);
  ctx.body = 'OAuth2.0 授权重定向';
});

// 303 See Other - 所有方法都变为 GET，用于 POST/PUT 完成后重定向
temporaryRedirectRouter.get('/303/get', async (ctx) => {
  console.log(`303 重定向: ${ctx.method} ${ctx.url}`);
  ctx.status = 303;
  ctx.set('Location', '/target');
  ctx.body = '303 See Other - GET 请求';
});

temporaryRedirectRouter.post('/303/post', async (ctx) => {
  console.log(`303 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  // 模拟数据处理
  console.log('处理 POST 数据完成，重定向到结果页面');
  ctx.status = 303;
  ctx.set('Location', '/target');
  ctx.body = '303 See Other - POST 处理完成，重定向查看结果';
});

temporaryRedirectRouter.put('/303/put', async (ctx) => {
  console.log(`303 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  // 模拟数据更新
  console.log('处理 PUT 数据完成，重定向到结果页面');
  ctx.status = 303;
  ctx.set('Location', '/target');
  ctx.body = '303 See Other - PUT 处理完成，重定向查看结果';
});

// 307 Temporary Redirect - 方法和请求体都不变，优先级高于 302
temporaryRedirectRouter.get('/307/get', async (ctx) => {
  console.log(`307 重定向: ${ctx.method} ${ctx.url}`);
  ctx.status = 307;
  ctx.set('Location', '/target');
  ctx.body = '307 Temporary Redirect - GET 请求';
});

temporaryRedirectRouter.post('/307/post', async (ctx) => {
  console.log(`307 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  ctx.status = 307;
  ctx.set('Location', '/target');
  ctx.body = '307 Temporary Redirect - POST 请求方法和请求体保持不变';
});

temporaryRedirectRouter.put('/307/put', async (ctx) => {
  console.log(`307 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  ctx.status = 307;
  ctx.set('Location', '/target');
  ctx.body = '307 Temporary Redirect - PUT 请求方法和请求体保持不变';
});

// 302 vs 307 优先级比较
temporaryRedirectRouter.get('/priority/302-vs-307', async (ctx) => {
  const useCode = ctx.query.code || '307';
  console.log(`优先级测试: 使用 ${useCode}`);
  
  if (useCode === '302') {
    ctx.status = 302;
    ctx.body = '使用 302 Found';
  } else {
    ctx.status = 307;
    ctx.body = '使用 307 Temporary Redirect (推荐)';
  }
  
  ctx.set('Location', '/target');
});

module.exports = temporaryRedirectRouter;