# History API 浏览器路由详解

History API 是 HTML5 引入的浏览器内置 API，允许 JavaScript 操作浏览器的会话历史记录，从而实现无页面刷新的 URL 变更和导航控制。它是现代单页应用（SPA）路由系统的底层基础，几乎所有前端路由库（Vue Router、React Router）都以它为核心实现。

## 目录

- [核心概念](#核心概念)
- [核心方法](#核心方法)
- [popstate 事件](#popstate-事件)
- [状态管理](#状态管理)
- [SPA 路由实战](#spa-路由实战)
- [与 Vue Router / React Router 的关系](#与-vue-router--react-router-的关系)
- [安全注意事项](#安全注意事项)
- [浏览器兼容性与降级](#浏览器兼容性与降级)
- [常见问题与最佳实践](#常见问题与最佳实践)

---

## 核心概念

### 会话历史（Session History）

浏览器维护一个**会话历史栈**，记录用户访问过的页面。每个历史记录（History Entry）包含：

| 属性 | 说明 |
|------|------|
| `url` | 页面的完整 URL |
| `state` | 关联的状态对象（可选） |
| `title` | 历史记录标题（现代浏览器已忽略） |
| `scrollRestoration` | 滚动位置恢复行为 |

### History 对象

`window.history` 是全局对象，提供操作会话历史的接口：

```javascript
console.log(window.history.length);  // 历史栈中的条目数量
console.log(window.history.state);   // 当前历史记录的 state 对象
```

### 关键约束

> **安全限制**：只能操作当前浏览器标签页的历史记录，无法访问其他标签页的历史，也无法修改跨域 URL。

---

## 核心方法

### pushState(state, title, url)

向会话历史栈**添加**一个新记录，但**不刷新页面**。

```javascript
const state = { page: 'home', id: 123 };
const title = ''; // 现代浏览器忽略，可传空字符串
const url = '/home';

// 添加新历史记录，URL 变为 /home
history.pushState(state, title, url);

// 页面不会刷新，但 URL 已变化
console.log(window.location.pathname); // '/home'
console.log(history.state);             // { page: 'home', id: 123 }
```

**参数详解**：

| 参数 | 说明 |
|------|------|
| `state` | 与新历史记录关联的状态对象（可序列化数据，最大 640KB） |
| `title` | 历史记录标题（大多数浏览器完全忽略，传空字符串即可） |
| `url` | 相对或绝对路径（可选，不传则保持当前 URL） |

**特点**：

- 新 URL 必须是同源（Same Origin）的
- 不触发页面刷新
- 新记录在当前记录"之后"，当前记录变成不可通过"后退"到达
- 可用于导航到不同路径，但**不会**向服务器发送请求

### replaceState(state, title, url)

**替换**当前历史记录，而不是添加新记录。

```javascript
history.replaceState({ page: 'settings' }, '', '/settings');
```

**与 pushState 的区别**：

| 行为 | `pushState` | `replaceState` |
|------|------------|----------------|
| 添加新历史记录 | ✅ | ❌ 替换当前 |
| 后退可回到上一条 | ✅ | ❌ 不能 |
| 浏览器"前进"行为 | 多一条记录 | 不变 |

### go(delta)

在历史栈中按相对位置跳转。

```javascript
history.go(-1);   // 后退一页（等同于 history.back()）
history.go(1);    // 前进一步（等同于 history.forward()）
history.go(2);    // 前进两页
history.go(0);    // 刷新当前页（等同于 history.go()）
history.go();     // 刷新当前页
```

### back()

后退一页，等同于 `history.go(-1)`。

```javascript
history.back();
```

### forward()

前进一页，等同于 `history.go(1)`。

```javascript
history.forward();
```

### URL 变化 vs 服务器请求

> **关键点**：`pushState` / `replaceState` 改变的是浏览器的 URL 显示，**不会**触发服务器请求。只有用户手动刷新、点击链接跳转、或 `location.href` 赋值才会触发服务器请求。

这意味着：若 URL 从 `/` 变为 `/about` 后用户刷新页面，浏览器会向服务器请求 `/about`，这正是 SPA 需要服务器配置** fallback**（所有路由都返回 index.html）的原因。

---

## popstate 事件

`popstate` 事件在用户点击浏览器"后退"或"前进"按钮时触发，或手动调用 `history.back()` / `history.forward()` / `history.go()` 时触发。

### 基本用法

```javascript
window.addEventListener('popstate', (event) => {
  console.log('popstate 触发！');
  console.log('当前 state:', event.state);   // 对应 pushState/replaceState 时传入的 state
  console.log('当前 URL:', location.href);

  // 根据当前 URL 重新渲染对应页面内容
  renderPage(location.pathname);
});
```

### 关键注意事项

1. **pushState / replaceState 不会触发 popstate**，只有浏览器的前进/后退才会。
2. **event.state** 是该历史记录关联的 state 对象（若用 `pushState` 添加则为传入的 state，若从服务器加载的新页面则为 `null`）
3. 页面**首次加载**时，某些浏览器会触发一次 popstate（行为不一致，不应依赖）

### 状态恢复示例

```javascript
// 应用启动时初始化路由
function initRouter() {
  // 渲染初始页面（根据当前 URL）
  renderPage(location.pathname);

  // 监听 popstate，处理浏览器前进/后退
  window.addEventListener('popstate', () => {
    renderPage(location.pathname);
  });
}

// 导航函数（使用 pushState）
function navigate(path) {
  history.pushState({ ts: Date.now() }, '', path);
  renderPage(path);
}
```

---

## 状态管理

### state 对象

`pushState(state, title, url)` 中的 `state` 参数是一个**与历史记录关联的可序列化对象**：

```javascript
// ✅ 推荐：普通对象
history.pushState({ userId: 123, tab: 'overview' }, '', '/user/123');

// ✅ JSON 可序列化的数据
history.pushState({ items: [1, 2, 3] }, '', '/list');

// ❌ 不能包含不可序列化的内容（如函数、DOM 节点）
```

### state 有什么用？

`state` 对象让我们在导航时保存上下文数据，popstate 触发时可以读取：

```javascript
// 导航时保存数据
history.pushState({ page: 'product', id: 456 }, '', '/product/456');

// 用户点击后退时，可以通过 event.state 恢复数据
window.addEventListener('popstate', (event) => {
  if (event.state) {
    console.log(event.state.page); // 'product'
    console.log(event.state.id);   // 456
  }
});
```

### URL 是真相的唯一来源

> **最佳实践**：虽然 `state` 可以存储数据，但 URL 才是浏览器历史记录的真实标识。URL 应该能够独立表示应用状态，支持直接访问和分享链接。

好的设计：URL 即状态

```
/user/123/profile    ← 路径本身就表示状态
/product/456/reviews
/search?q=keyword&page=2
```

不好的设计：依赖 state 而非 URL

```javascript
// ❌ 差：状态在 state 里，URL 不变
history.pushState({ view: 'dashboard' }, '', '/app');

// ✅ 好：URL 包含状态
history.pushState({}, '', '/app/dashboard');
```

---

## SPA 路由实战

### 最小化 SPA 路由实现

```javascript
class SimpleRouter {
  constructor() {
    // 初始化
    this.routes = {};
    window.addEventListener('popstate', () => this.handleRoute());
  }

  // 注册路由
  register(path, handler) {
    this.routes[path] = handler;
  }

  // 导航（不刷新页面）
  push(path) {
    history.pushState(null, '', path);
    this.handleRoute();
  }

  // 替换当前（不添加历史记录）
  replace(path) {
    history.replaceState(null, '', path);
    this.handleRoute();
  }

  // 处理路由
  handleRoute() {
    const path = window.location.pathname;
    const handler = this.routes[path] || this.routes['/404'];
    if (handler) handler();
  }

  // 启动
  start() {
    this.handleRoute();
  }
}

// 使用
const router = new SimpleRouter();

router.register('/', () => {
  document.getElementById('app').innerHTML = '<h1>首页</h1>';
});

router.register('/about', () => {
  document.getElementById('app').innerHTML = '<h1>关于我们</h1>';
});

router.register('/user/:id', (params) => {
  document.getElementById('app').innerHTML = `<h1>用户: ${params.id}</h1>`;
});

router.start();

// 页面链接用 router.push() 而非 <a href>
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-link]')) {
    e.preventDefault();
    router.push(e.target.getAttribute('href'));
  }
});
```

### 动态路由匹配

```javascript
// 简单的路径参数匹配
function matchRoute(route, pathname) {
  const routeParts = route.split('/');
  const pathParts = pathname.split('/');
  const params = {};

  if (routeParts.length !== pathParts.length) return null;

  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = pathParts[i];
    } else if (routeParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

const route = matchRoute('/user/:id/post/:postId', '/user/123/post/456');
console.log(route); // { id: '123', postId: '456' }
```

### 服务器配置（重要！）

SPA 使用 History API 时，用户直接访问 `/about` 或刷新页面，浏览器会向服务器请求 `/about`，服务器若无此页面会返回 404。

**所有路由都应 fallback 到 index.html**：

```nginx
# Nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

```apache
# Apache (.htaccess)
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

```javascript
// Express（Node.js）
const express = require('express');
const app = express();

app.use(express.static('public'));

// 所有路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
```

---

## 与 Vue Router / React Router 的关系

### Vue Router

Vue Router 是 Vue.js 的官方路由库，底层基于 History API：

```javascript
// Vue Router History 模式
const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/user/:id', component: User },
  ]
});
```

**Vue Router 的 `push` / `replace` 方法**：

```javascript
// 编程式导航，内部调用 history.pushState / replaceState
router.push('/home');        // 添加历史记录
router.replace('/settings'); // 替换当前记录
router.go(-1);              // 后退
```

**与 History API 的关系**：

| History API | Vue Router |
|------------|-----------|
| `history.pushState()` | `router.push()` |
| `history.replaceState()` | `router.replace()` |
| `history.back()` | `router.back()` |
| `popstate` 事件 | Vue Router 内部监听并更新组件 |

### React Router

React Router v6 也是基于 History API：

```jsx
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

// 编程式导航
function NavButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/about')}>跳转</button>;
}
```

### History API 在路由库中的位置

```
┌─────────────────────────────────────────┐
│           Vue Router / React Router     │
│  （提供声明式路由、嵌套路由、导航守卫等）    │
├─────────────────────────────────────────┤
│              History API                │
│  （pushState / replaceState / popstate） │
├─────────────────────────────────────────┤
│           window.history                 │
│           window.location               │
└─────────────────────────────────────────┘
```

**路由库在 History API 之上封装了**：

- 路由表与路径匹配
- 嵌套路由
- 路由守卫（beforeEach / beforeEnter 等）
- 懒加载组件
- 滚动行为管理

---

## 安全注意事项

### 1. 避免被恶意脚本利用

History API 只能操作**同源**的历史记录，跨域 URL 无法被修改。但这不意味着完全安全：

```javascript
// ✅ 始终验证 URL
function safeNavigate(path) {
  // 验证路径，防止 XSS
  if (!path.startsWith('/') || path.includes('javascript:')) {
    console.warn('非法路径');
    return;
  }
  history.pushState(null, '', path);
}
```

### 2. 不要在 state 中存储敏感信息

`history.state` 可以通过 JavaScript 读取，不要在其中存储密码、Token 等：

```javascript
// ❌ 不安全
history.pushState({ token: 'secret123' }, '', '/dashboard');

// ✅ 安全：敏感数据存在内存或 HttpOnly Cookie 中
```

### 3. 防止恶意脚本触发导航

```javascript
// 检查 navigation 事件来源
window.addEventListener('popstate', (event) => {
  // 通过 state 判断是否来自可信导航
  if (!event.state?.fromApp) {
    // 可能来自恶意脚本，谨慎处理
  }
});
```

---

## 浏览器兼容性与降级

### 兼容性

| 浏览器 | 支持情况 |
|--------|----------|
| Chrome | ✅ 完整支持 |
| Firefox | ✅ 完整支持 |
| Safari | ✅ 完整支持 |
| Edge | ✅ 完整支持 |
| IE 10+ | ✅ 支持（但有 bug） |
| IE 9 及以下 | ❌ 不支持，使用 `location.hash` 降级 |

### IE 10/11 的坑

IE 10/11 的 History API 有以下已知问题：

- **`go(0)` 不等于刷新**：IE 11 中 `history.go(0)` 不会触发页面刷新
- **replaceState 后 URL 显示异常**：某些情况下 URL 显示不正确
- **state 对象共享**：某些情况下 state 会在不同历史记录间共享

### 降级方案（hash 路由）

不支持 History API 时，使用 hash（`#`）路由作为降级：

```javascript
function getPath() {
  if (window.history && window.history.pushState) {
    return window.location.pathname; // History 模式
  }
  return window.location.hash.slice(1) || '/'; // Hash 模式
}
```

```
History 模式: https://example.com/user/123
Hash 模式:    https://example.com/#/user/123
```

Hash 路由不会触发服务器请求（`#` 后面的内容不发送给服务器），天然适合 SPA 降级。

---

## 常见问题与最佳实践

### Q1: pushState 后刷新页面 404？

这是 SPA 最常见的问题。服务器需要配置**所有路由 fallback 到 index.html**。参见上面的服务器配置章节。

### Q2: popstate 事件没有触发？

确认：
1. 事件监听器注册在 `window` 上，不是 `document`
2. `pushState` / `replaceState` 不会触发 popstate，只有浏览器前进/后退按钮才触发
3. Safari 会在页面加载时触发一次 popstate（不可依赖）

### Q3: 如何禁止浏览器前进/后退？

无法禁止，但可以监听并处理：

```javascript
window.addEventListener('popstate', (event) => {
  // 提示用户"表单未保存，确定要离开吗？"
  if (!confirm('确定要离开吗？')) {
    // 重新推进去（视觉上取消后退）
    history.pushState(null, '', location.href);
  }
});
```

### Q4: 多标签页之间的 history 独立吗？

**是的**。每个浏览器标签页有独立的历史栈，History API 操作的是当前标签页的历史。

### Q5: History API 能操作跨域 URL 吗？

**不能**。尝试 pushState 跨域 URL 会抛出异常：

```javascript
history.pushState({}, '', 'https://malicious.com/page');
// 抛出 DOMException: Failed to execute 'pushState' on 'History': ...
```

### 最佳实践总结

| 实践 | 说明 |
|------|------|
| URL 驱动状态 | URL 应能完整表示应用状态，支持直接访问和分享 |
| 始终 fallback | SPA 服务器配置所有路由返回 index.html |
| 状态不过度依赖 | state 对象可辅助恢复，但不要替代 URL |
| 监听 popstate | 在 popstate 中重新渲染，保持 URL 与 UI 一致 |
| hash 降级 | 需要兼容老浏览器时准备 hash 路由降级 |
| 避免 state 存储敏感信息 | state 可被 JS 读取 |

---

## 参考资料

- [MDN: History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [MDN: Manipulating the browser history](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Example)
- [MDN: popstate event](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)
- [Vue Router 文档](https://router.vuejs.org/)
- [React Router 文档](https://reactrouter.com/)
