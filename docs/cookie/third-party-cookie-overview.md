# 第三方 Cookie 详解

> 第三方 Cookie 是 Web 隐私与安全领域中的核心话题。随着浏览器逐步淘汰第三方 Cookie，开发者需要深入理解其机制并做好迁移准备。

## 目录

- [基础概念](#基础概念)
  - [什么是第三方 Cookie](#什么是第三方-cookie)
  - [第一方 Cookie vs 第三方 Cookie](#第一方-cookie-vs-第三方-cookie)
  - [Cookie 的基本工作机制](#cookie-的基本工作机制)
- [核心用途](#核心用途)
  - [跨域追踪](#跨域追踪)
  - [广告定向](#广告定向)
  - [会话共享](#会话共享)
- [工作原理](#工作原理)
  - [同源策略与 Cookie 共享](#同源策略与-cookie-共享)
  - [第三方域名的 Cookie 是如何被写入的](#第三方域名的-cookie-是如何被写入的)
  - [附带与非附带的 Cookie](#附带与非附带的-cookie)
- [浏览器策略变化](#浏览器策略变化)
  - [Chrome 淘汰时间线](#chrome-淘汰时间线)
  - [Safari/Firefox 的 ITP/ETP 策略](#safarifirefox-的-itpetp-策略)
  - [各浏览器支持现状](#各浏览器支持现状)
- [替代方案](#替代方案)
  - [First-party Sets](#first-party-sets)
  - [Privacy Sandbox](#privacy-sandbox)
  - [CHIPS](#chips)
  - [Related Website Sets](#related-website-sets)
  - [其他技术方案对比](#其他技术方案对比)
- [开发者应对策略](#开发者应对策略)
  - [如何检测第三方 Cookie 是否可用](#如何检测第三方-cookie-是否可用)
  - [渐进式降级方案](#渐进式降级方案)
  - [迁移到第一方 Cookie 的最佳实践](#迁移到第一方-cookie-的最佳实践)

---

## 基础概念

### 什么是第三方 Cookie

**第三方 Cookie（Third-party Cookie）** 是由当前页面域名以外的第三方域名设置的 Cookie。当用户访问 A 网站时，A 网站的页面嵌入了来自 B 域名的资源（如广告、脚本、图片），B 域名写入的 Cookie 即为第三方 Cookie。

举例：用户访问 `tmall.com` 时，页面中包含来自 `mmstat.com` 或 `facebook.com` 等第三方域名的资源，这些第三方域名写入的 Cookie 就属于第三方 Cookie。

### 第一方 Cookie vs 第三方 Cookie

| 特性 | 第一方 Cookie | 第三方 Cookie |
|------|--------------|----------------|
| **设置域名** | 与用户当前访问的页面同域 | 与当前页面域名不同 |
| **用途** | 维持会话、记住用户偏好 | 跨域追踪、广告定向 |
| **访问权限** | 仅当前域名可读取 | 嵌入的第三方域名可读取 |
| **隐私影响** | 较低，仅限同站 | 较高，可跨站追踪用户 |
| **浏览器限制** | 基本不限制 | 逐步被禁用 |

### Cookie 的基本工作机制

Cookie 通过 HTTP 头在客户端与服务器之间传递：

**服务器设置 Cookie（Set-Cookie 头）：**
```
Set-Cookie: name=value; Path=/; Domain=.example.com; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Secure; HttpOnly; SameSite=Lax
```

**浏览器请求自动携带（Cookie 头）：**
```
Cookie: name=value; another=thing
```

**Cookie 的关键属性：**

| 属性 | 作用 |
|------|------|
| `Domain` | 指定 Cookie 所属域名。不设置则仅限当前域名；设置父域名可实现跨子域名共享 |
| `Path` | 指定 Cookie 的有效路径前缀，只有匹配该路径的请求才会携带 |
| `Expires` | 绝对过期时间（GMT 格式） |
| `Max-Age` | 相对过期时间（秒），优先级高于 Expires |
| `Secure` | 仅在 HTTPS 连接下发送 |
| `HttpOnly` | 无法通过 `document.cookie` 或 JavaScript 访问 |
| `SameSite` | 控制跨站请求是否携带 Cookie（`Strict`/`Lax`/`None`） |

---

## 核心用途

### 跨域追踪

第三方 Cookie 最主要的用途是**跨站用户身份标识**。广告商和数据平台通过在大量网站嵌入自己的脚本，为用户生成唯一的追踪 ID，从而建立用户的行为档案。

典型案例：**阿里妈妈 mmstat**

当你访问百度、优酷、淘宝等阿里系网站时，`mmstat.com` 域下的 Cookie 会在多个站点共享，记录你的搜索、浏览、购买行为，用于构建精准的用户画像。

```javascript
// 第三方脚本写入 Cookie 的典型方式
document.cookie = "uid=xxxxxx; Domain=.mmstat.com; Path=/";

// 后续请求携带该 Cookie
// GET /track?uid=xxxxxx&action=view HTTP/1.1
// Cookie: uid=xxxxxx
```

### 广告定向

广告平台（如 Facebook Pixel、Google Ads）通过第三方 Cookie 追踪用户在不同网站的行为，实现：

- **受众构建**：根据浏览历史划分用户群体
- **转化追踪**：追踪广告点击→访问→购买的完整转化链路
- **频次控制**：避免同一用户看到同一广告过多次数
- **重定向（Remarketing）**：用户访问 A 站点后，在 B 站点展示相关商品广告

**Facebook Pixel 示例：**

```javascript
// 当用户访问商品页面时，触发 Pixel
fbq('track', 'ViewContent', {
  content_name: 'Premium Widget',
  content_category: 'Electronics',
  content_ids: ['widget_123']
});
```

这会向 `facebook.com` 发送请求，携带第三方 Cookie 用于标识用户身份。

### 会话共享

同一企业的多个产品之间，通过第三方 Cookie 实现统一登录态。例如阿里巴巴的淘宝和天猫：

- 登录信息统一存在第三方域名（如 `alibaba.com`）下
- 淘宝、天猫各自嵌入该域名的登录脚本
- 用户在任一平台登录后，访问另一平台无需重新登录

> ⚠️ Safari 禁用第三方 Cookie 后，淘宝和天猫的免登录互通失效，用户需要分别登录。

---

## 工作原理

### 同源策略与 Cookie 共享

**同源策略（Same-Origin Policy）** 是浏览器最核心的安全机制之一，限制了一个源的文档或脚本如何与另一个源的资源交互。

**源的判断：**
```
协议 + 域名 + 端口 三者完全相同 → 同源
```

**Cookie 的跨域共享规则：**

| 场景 | Cookie 是否可共享 |
|------|------------------|
| 同域名下子域名（如 `a.example.com` → `b.example.com`） | ✅ 通过设置 `Domain=.example.com` |
| 不同域名（如 `a.com` → `b.com`） | ❌ 浏览器同源策略禁止 |
| 通过 `<iframe>` 嵌入跨域内容 | ❌ 受 Same-Origin Policy 限制 |

**关键结论：Cookie 本身不支持真正的跨域共享。第三方 Cookie 的实现依赖于跨域资源的嵌入（图片、脚本、iframe），而非绕过同源策略。**

### 第三方域名的 Cookie 是如何被写入的

第三方 Cookie 通过以下方式被写入用户浏览器：

**1. 图片/资源嵌入：**
```html
<!-- 1x1 透明像素，用于追踪 -->
<img src="https://tracker.com/pixel.gif?uid=xxx" width="1" height="1">
```

**2. JavaScript 脚本嵌入：**
```html
<script src="https://analytics.com/analytics.js"></script>
```
```javascript
// analytics.js 内容
document.cookie = "visitor_id=abc123; Domain=.analytics.com; Path=/";
```

**3. iframe 嵌入（已逐渐失效）：**
```html
<iframe src="https://third-party.com/widget.html"></iframe>
```

**请求流程：**

```
用户访问 site.com
    ↓
site.com 返回 HTML（内含第三方资源引用）
    ↓
浏览器向 third-party.com 请求资源
    ↓
third-party.com 返回资源 + Set-Cookie 头
    ↓
浏览器存储第三方 Cookie
    ↓
后续访问任何嵌入 third-party.com 资源的站点时
    ↓
浏览器自动携带 third-party.com 的 Cookie
```

### 附带与非附带的 Cookie

这是理解第三方 Cookie 工作机制的关键概念：

**附带请求（Attributed Request）：**

当用户访问 A 站点时，A 站点引导用户访问或触发对 B 域名的请求，该请求**附带**用户已有的 B 域名 Cookie。

```
用户先访问 facebook.com → facebook.com 设置 Cookie: fr=abc123
用户再访问 myshop.com → myshop.com 页面内有 facebook.com 资源
    → 浏览器请求 facebook.com 时自动携带 Cookie: fr=abc123
    → facebook.com 通过 fr Cookie 识别这是同一用户
```

**非附带请求（Non-attributed Request）：**

用户直接访问 B 域名（如在地址栏输入 `facebook.com`），或通过与 B 域名无关的途径访问，该请求**不附带**用户已有的 B Cookie（取决于 SameSite 设置）。

**SameSite=Lax 的影响：**

- `Strict`：所有跨站请求都不携带 Cookie
- `Lax`：仅 GET 请求在跨站导航时携带 Cookie，POST 等危险方法不携带
- `None`：所有请求都携带，但必须配合 `Secure` 使用

---

## 浏览器策略变化

### Chrome 淘汰时间线

| 时间 | 事件 |
|------|------|
| Chrome 51（2017） | 引入 `SameSite` 属性 |
| Chrome 80（2020） | 默认 `SameSite=Lax`，强制要求 `SameSite=None` 必须 `Secure` |
| Chrome 83（2020） | 隐私窗口模式禁用第三方 Cookie |
| Chrome 94（2021） | 开始对 1% 用户隐藏第三方 Cookie |
| Chrome 115（2023） | Privacy Sandbox API 正式上线 |
| **2024-2025** | 第三方 Cookie 淘汰（分阶段推进） |
| **2025** | 完全禁用第三方 Cookie（计划） |

> ⚠️ 时间线因行业反馈多次推迟。2024 年 12 月 Google 宣布将淘汰时间推迟至 2025 年，并提供更多过渡工具。

**SameSite 默认值变化：**

```
旧版（Chrome 79及之前）：
  无 SameSite → 等同于 None（所有请求都携带）

新版（Chrome 80+）：
  无 SameSite → 等同于 Lax（仅导航GET请求携带）
  SameSite=None → 必须配合 Secure=True
```

### Safari/Firefox 的 ITP/ETP 策略

**Safari（Intelligent Tracking Prevention，ITP）：**

| 版本 | 策略 |
|------|------|
| Safari 13.1+ | 默认完全阻止第三方 Cookie |
| ITP 2.x | 使用 CNAME cloaking 绕过检测的追踪也被阻止 |
| ITP 2.3+ | 第三方上下文中通过 JavaScript 设置的 Cookie 仅保留 7 天 |
| ITP 2.4+ | 跨域资源通过 Link 标签设置 Cookie 的能力受限 |

**Firefox（Enhanced Tracking Protection，ETP）：**

| 版本 | 策略 |
|------|------|
| Firefox 79+ | 默认阻止第三方 Cookie（严格模式） |
| ETP 2.0 | 允许例外（First-party Isolated Context） |

**第三方 Cookie 屏蔽对主要平台的影响：**

| 平台 | 影响 | 临时解决方案 |
|------|------|-------------|
| 淘宝/天猫 | 跨平台免登录失效 | 提示用户手动开启 |
| 阿里妈妈广告 | 追踪能力下降 | 转向第一方数据 |
| Google Ads | 部分功能受限 | Privacy Sandbox |

### 各浏览器支持现状

| 浏览器 | 第三方 Cookie 支持 | SameSite 默认值 |
|--------|------------------|----------------|
| Chrome 120+ | 逐步淘汰中 | `Lax` |
| Safari 17+ | 完全阻止 | N/A |
| Firefox 120+ | 完全阻止 | N/A |
| Edge 120+ | 逐步淘汰 | `Lax` |
| Opera 100+ | 逐步淘汰 | `Lax` |
| Chrome（隐私浏览） | 完全阻止 | N/A |

---

## 替代方案

### First-party Sets

**First-party Sets（第一方集合）** 是 Google 提出的机制，允许同一实体下的多个域名在第三方 Cookie 语境下被视为"第一方"。

**使用场景：**
```json
// Chrome 接受的 First-party Set 定义
{
  "owner": "example.com",
  "members": ["sub1.example.com", "sub2.example.com"]
}
```

设置后，`sub1.example.com` 和 `sub2.example.com` 在 `example.com` 的上下文中可以共享 Cookie，等同于第一方 Cookie。

> ⚠️ 该方案因隐私监管压力被重新设计为 **Related Website Sets（RWS）**，大幅限制了可加入的域名数量。

### Privacy Sandbox

**Privacy Sandbox** 是 Google 主导的隐私保护技术栈，旨在提供广告追踪等功能的替代方案，同时保护用户隐私。

**主要 API：**

| API | 用途 |
|-----|------|
| **Topics API** | 根据用户浏览历史推断兴趣类别，供广告定向使用 |
| **Protected Audience API** | 实现再营销（remarketing）功能，无需跨站追踪用户身份 |
| **Attribution Reporting API** | 测量广告转化，支持聚合报告而非个体追踪 |
| **Shared Storage API** | 提供跨站数据存储的通用机制 |

**工作原理（Topics API 示例）：**
```
1. 浏览器根据用户访问历史推断兴趣主题（如"运动"、"电子产品"）
2. 广告平台请求获取用户主题（浏览器侧完成，不暴露完整历史）
3. 广告平台根据主题投放定向广告
4. 无需追踪用户身份，用户隐私得到保护
```

### CHIPS

**CHIPS（Cookies Having Independent Partitioned State）** 是基于 ** partitioned storage** 概念的 Cookie 机制。

**解决的问题：**
传统 Cookie 不区分上下文——同一个第三方 Cookie 在所有嵌入它的站点共享状态。CHIPS 通过分区机制，使 Cookie 按顶级站点独立。

**工作原理：**
```
未使用 CHIPS：
  用户访问 siteA.com → embed tracker.com 资源 → tracker.com 识别用户
  用户访问 siteB.com → embed tracker.com 资源 → tracker.com 识别为同一用户 ✓

使用 CHIPS：
  用户访问 siteA.com → embed tracker.com 资源 → tracker.com 在 siteA.com 上下文中设置 Cookie
  用户访问 siteB.com → embed tracker.com 资源 → tracker.com 在 siteB.com 上下文中设置独立的 Cookie
  → tracker.com 无法跨站追踪用户 ✓
```

**Cookie 设置示例：**
```http
Set-Cookie: session_id=abc123; Path=/; SameSite=None; Secure; Partitioned
```

**适用场景：**
- 嵌入式小组件（如聊天widget、评论系统）需要在每个站点独立维持会话
- 不需要跨站追踪，只需在各自嵌入上下文中工作

### Related Website Sets

**Related Website Sets（RWS）** 是 First-party Sets 的精简版本，针对 Privacy Sandbox 过渡期设计。

**主要限制：**
- 每个 Set 最多包含 **3 个域名**（1 个主站 + 2 个关联站）
- 必须证明域名之间有真实的技术或业务关联
- 主要用于保持同企业多站点的核心功能（如 SSO）

**申请要求：**
- 站点必须归同一组织所有
- 需提交技术验证和业务关联说明
- 目前仅接受有限数量的申请

### 其他技术方案对比

| 方案 | 成熟度 | 隐私保护 | 跨站追踪能力 | 适用场景 |
|------|--------|---------|------------|---------|
| **第一方 Cookie** | ✅ 成熟 | 高 | ❌ 不可跨站 | 同域名下的用户识别 |
| **CHIPS** | 🟡 部分支持 | 高 | ❌ 不可跨站 | 嵌入式 widget |
| **RWS** | 🟡 有限支持 | 高 | ❌ 不可跨站 | 同企业多站点 SSO |
| **Privacy Sandbox** | 🟡 推进中 | 高 | ⚠️ 受限 | 广告定向（过渡期） |
| **浏览器指纹** | ✅ 成熟 | 低 | ⚠️ 可追踪 | 备选追踪手段 |
| **帆布指纹 / WebGL** | ⚠️ 受限 | 低 | ⚠️ 可追踪 | 深度识别（被阻止中） |

---

## 开发者应对策略

### 如何检测第三方 Cookie 是否可用

**方法一：尝试写入并读取**
```javascript
function isThirdPartyCookieSupported() {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://example-third-party.com/cookie-check';
    iframe.style.display = 'none';
    
    let timeoutId;
    
    iframe.onload = () => {
      // 尝试通过 postMessage 与 iframe 通信
      try {
        iframe.contentWindow.postMessage('check', '*');
      } catch (e) {
        resolve(false);
      }
    };
    
    // 备用：超时则认为不支持
    timeoutId = setTimeout(() => resolve(false), 2000);
    
    window.addEventListener('message', (event) => {
      if (event.data === 'cookieSupported') {
        clearTimeout(timeoutId);
        resolve(true);
      }
    }, { once: true });
    
    document.body.appendChild(iframe);
  });
}
```

**方法二：使用 SameSite 行为检测**
```javascript
function detectCookieBehavior() {
  // 创建测试 Cookie
  const testCookieName = '__cookie_test_' + Date.now();
  document.cookie = `${testCookieName}=1; Path=/`;
  
  const isFirstPartyCookieSupported = document.cookie.includes(testCookieName);
  
  // 清理
  document.cookie = `${testCookieName}=; Max-Age=0; Path=/`;
  
  return {
    firstPartyCookie: isFirstPartyCookieSupported,
    thirdPartyCookie: !isFirstPartyCookieSupported // 简单判断
  };
}
```

**方法三：检测浏览器策略（推荐）**
```javascript
function getBrowserCookiePolicy() {
  const ua = navigator.userAgent;
  
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    return 'ITP'; // Safari - 完全阻止
  }
  if (ua.includes('Firefox')) {
    return 'ETP'; // Firefox - 增强追踪保护
  }
  if (ua.includes('Edg/')) {
    return 'Edge_Gradual'; // Edge - 逐步淘汰
  }
  if (ua.includes('Chrome/')) {
    const version = parseInt(ua.match(/Chrome\/(\d+)/)?.[1] || '0');
    if (version >= 115) return 'Chrome_Sandbox';
    return 'Chrome_Lax'; // SameSite=Lax
  }
  return 'Unknown';
}
```

### 渐进式降级方案

**核心原则：功能降级，但不破坏核心用户体验**

**阶段一：检测与警告（立即执行）**
```javascript
// 检测第三方 Cookie 不可用时记录日志
if (!isThirdPartyCookieSupported()) {
  console.warn('[CookieMigration] 第三方 Cookie 不可用，功能可能受限');
  // 上报到监控系统
  analytics.track('cookie_blocked', { type: 'third_party' });
}
```

**阶段二：降级到第一方 Cookie**
```javascript
// 将第三方追踪 ID 迁移到第一方 Cookie
function setFirstPartyIdentifier(userId) {
  // 优先使用第一方 Cookie
  const expiryDays = 365;
  const expires = new Date();
  expires.setTime(expires.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  
  document.cookie = `__user_id=${userId}; Path=/; Expires=${expires.toUTCString()}; SameSite=Lax`;
}

// 在后续请求中携带
function trackEvent(eventName, data) {
  const userId = getFirstPartyIdentifier(); // 优先读取第一方 Cookie
  sendBeacon('/api/track', {
    event: eventName,
    user: userId,
    data: data,
    timestamp: Date.now()
  });
}
```

**阶段三：使用 CHIPS 保持嵌入组件功能**
```javascript
// 对于嵌入式组件（聊天widget等），使用 CHIPS
function setPartitionedCookie(name, value) {
  const cookieStr = `${name}=${value}; Path=/; SameSite=None; Secure; Partitioned`;
  document.cookie = cookieStr;
}
```

### 迁移到第一方 Cookie 的最佳实践

**1. 建立用户身份映射**

不要依赖第三方平台分配的用户 ID，转而建立自己的用户身份体系：
```javascript
// 生成第一方用户 ID（UUID v4）
function generateUserId() {
  if (localStorage.getItem('user_id')) {
    return localStorage.getItem('user_id');
  }
  const userId = crypto.randomUUID(); // 现代浏览器支持
  localStorage.setItem('user_id', userId);
  return userId;
}
```

**2. 服务端存储用户状态**

将用户状态从 Cookie 迁移到服务端 Session：
```javascript
// 登录时创建服务端 Session
app.post('/login', (req, res) => {
  const user = authenticate(req.body);
  req.session.userId = user.id;
  req.session.firstPartyToken = generateToken(); // 生成第一方 Token
  res.json({ success: true });
});

// 后续请求通过 Session 识别用户
app.get('/api/data', requireSession, (req, res) => {
  const userId = req.session.userId;
  res.json(getUserData(userId));
});
```

**3. 使用 Privacy Sandbox API（当可用时）**

```javascript
// Topics API - 获取用户兴趣
async function getUserInterests() {
  if ('browsingTopics' in document) {
    const topics = await document.browsingTopics();
    return topics.map(t => t.topic);
  }
  return []; // 不支持时返回空
}

// Protected Audience API - 再营销
async function runRemarketingAudience(audienceData) {
  if ('runAdAuction' in navigator) {
    const auctionConfig = {
      seller: 'https://ad-network.example',
      decisionLogicUrl: 'https://seller.example/decision-logic.js'
    };
    // 受保护的环境执行再营销
  }
}
```

**4. 数据层抽象**

构建统一的数据抽象层，对上层屏蔽 Cookie 细节：
```javascript
const DataLayer = {
  getUserId() {
    return localStorage.getItem('user_id') || sessionStorage.getItem('session_id');
  },
  
  setUserId(id) {
    localStorage.setItem('user_id', id);
  },
  
  track(event, data) {
    // 自动选择可用方案
    const payload = { event, userId: this.getUserId(), ...data };
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', JSON.stringify(payload));
    } else {
      fetch('/api/track', { method: 'POST', body: JSON.stringify(payload), keepalive: true });
    }
  }
};
```

---

## 参考资料

- [Google Privacy Sandbox](https://privacysandbox.com/)
- [Chrome 第三方 Cookie 淘汰指南](https://developer.chrome.com/docs/privacy-sandbox/third-party-cookie-guide/)
- [MDN - Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [SameSite Cookie 规范](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis)
- [Chromium - CHIPS](https://developer.chrome.com/docs/privacy-sandbox/chips/)
- [WebKit ITP](https://webkit.org/tracking-prevention/)

