const Router = require('koa-router');

const permanentRedirectRouter = new Router({ prefix: '/redirect' });

// 301 Moved Permanently - GET 方法不变，其他方法变为 GET
permanentRedirectRouter.get('/301/get', async (ctx) => {
  console.log(`301 重定向: ${ctx.method} ${ctx.url}`);
  ctx.status = 301;
  ctx.set('Location', '/target');
  ctx.body = '301 Moved Permanently - GET 请求';
});

permanentRedirectRouter.post('/301/post', async (ctx) => {
  console.log(`301 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  ctx.status = 301;
  ctx.set('Location', '/target');
  ctx.body = '301 Moved Permanently - POST 请求会变为 GET';
});

permanentRedirectRouter.put('/301/put', async (ctx) => {
  console.log(`301 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  ctx.status = 301;
  ctx.set('Location', '/target');
  ctx.body = '301 Moved Permanently - PUT 请求会变为 GET';
});

// 308 Permanent Redirect - 方法和请求体都不变
permanentRedirectRouter.get('/308/get', async (ctx) => {
  console.log(`308 重定向: ${ctx.method} ${ctx.url}`);
  ctx.status = 308;
  ctx.set('Location', '/target');
  ctx.body = '308 Permanent Redirect - GET 请求';
});

permanentRedirectRouter.post('/308/post', async (ctx) => {
  console.log(`308 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  ctx.status = 308;
  ctx.set('Location', '/target');
  ctx.body = '308 Permanent Redirect - POST 请求方法和请求体保持不变';
});

permanentRedirectRouter.put('/308/put', async (ctx) => {
  console.log(`308 重定向: ${ctx.method} ${ctx.url}`);
  console.log('请求体:', ctx.request.body);
  ctx.status = 308;
  ctx.set('Location', '/target');
  ctx.body = '308 Permanent Redirect - PUT 请求方法和请求体保持不变';
});

module.exports = permanentRedirectRouter;