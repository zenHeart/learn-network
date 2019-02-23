const Router = require('koa-router');
const views = require('koa-views');
const router = new Router();
var bodyParser = require('koa-bodyparser');

//使用 bodyparser
router.use(bodyParser());

//此处为存储逻辑
const jsonfile = require('jsonfile')
const path = require('path');
const commentsFile = path.join(__dirname, 'comments.json');
//每次启动重置文件内容
jsonfile.writeFile(commentsFile, {
    comments:[]
}, function (err) {
    if (err) console.error(err)
});




//视图路由
router.get('/view', views(__dirname + '/views', {
    map: {
        html: 'swig'
    },
    options: {
        autoescape: false //关闭模板转义
    }
})).get('/view', ctx => {

    ctx.state.comments = jsonfile.readFileSync(commentsFile).comments || [];
    return ctx.render('demo')
});

//处理提交的路由
router.post('/comment', ctx => {
    let comments = jsonfile.readFileSync(commentsFile).comments || [];
    comments.push(ctx.request.body)
    jsonfile.writeFile(commentsFile, {
        comments
    }, function (err) {
        if (err) console.error(err)
    });
    ctx.redirect('/view');

});

module.exports = router;
