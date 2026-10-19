# 图床过期处理策略

> 本文探讨图片 CDN/图床 URL 失效后的检测机制与替换策略。

## 背景问题

图床服务（GitHub、Imgur、七牛云等）可能导致 Markdown 中的图片 URL 失效：

- 图床服务突然关闭或收费
- GitHub 仓库迁移或删除
- 临时 URL 过期（带有签名）
- 域名变更但文档未更新

## 一、图床过期检测策略

### 1.1 主动检测机制

```javascript
/**
 * 检测图片 URL 是否有效
 * @param {string} url - 图片 URL
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function checkImageUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD', // 只获取头部，不下载图片
      mode: 'cors'
    });
    
    if (response.ok) {
      return { valid: true };
    }
    
    return { 
      valid: false, 
      error: `HTTP ${response.status}: ${response.statusText}` 
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
```

### 1.2 批量检测脚本

```javascript
/**
 * 批量检测 Markdown 文件中的图片 URL
 * @param {string[]} urls - 图片 URL 数组
 * @param {number} concurrency - 并发数
 */
async function batchCheckUrls(urls, concurrency = 5) {
  const results = [];
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (url) => ({
        url,
        ...await checkImageUrl(url)
      }))
    );
    results.push(...batchResults);
  }
  
  return results.filter(r => !r.valid);
}
```

### 1.3 检测触发时机

| 场景 | 触发时机 |
|------|----------|
| CI/CD 集成 | 每次 PR 合并前 |
| 本地写作 | 保存 Markdown 时 |
| 定时巡检 | 每日/每周增量检测 |
| 监控告警 | URL 返回非 200 时 |

## 二、URL 自动替换方案

### 2.1 多级降级策略

```javascript
/**
 * 图片 URL 多级降级替换
 * 优先级：CDN A → CDN B → GitHub Raw → Local fallback
 */
class ImageFallback {
  constructor(options = {}) {
    this.cdns = options.cdns || [
      { name: 'primary', baseUrl: 'https://cdn.example.com' },
      { name: 'secondary', baseUrl: 'https://backup.example.com' },
      { name: 'github', baseUrl: 'https://raw.githubusercontent.com/user/repo/main' }
    ];
    this.cache = new Map(); // 缓存检测结果
    this.cacheTTL = options.cacheTTL || 24 * 60 * 60 * 1000; // 24小时
  }
  
  /**
   * 构建图片 URL（带多 CDN 支持）
   */
  buildUrl(path, cdnIndex = 0) {
    const cdn = this.cdns[cdnIndex] || this.cdns[0];
    return `${cdn.baseUrl}/${path}`;
  }
  
  /**
   * 尝试获取有效图片（自动降级）
   */
  async getValidImageUrl(path) {
    for (let i = 0; i < this.cdns.length; i++) {
      const url = this.buildUrl(path, i);
      const cached = this.cache.get(url);
      
      // 使用缓存结果
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        if (cached.valid) return url;
        continue;
      }
      
      // 检测 URL
      const result = await checkImageUrl(url);
      this.cache.set(url, { valid: result.valid, timestamp: Date.now() });
      
      if (result.valid) return url;
    }
    
    return null; // 所有 CDN 都失败
  }
}
```

### 2.2 Markdown URL 批量替换

```javascript
/**
 * 替换 Markdown 中的图片 URL
 * @param {string} markdown - 原始 Markdown
 * @param {Map<string, string>} replacements - URL 映射表
 */
function replaceImageUrls(markdown, replacements) {
  let result = markdown;
  
  for (const [oldUrl, newUrl] of replacements) {
    // 处理完整 URL 和相对路径
    const patterns = [
      oldUrl,
      oldUrl.replace(/^https?:\/\//, ''),
      path.basename(oldUrl)
    ];
    
    for (const pattern of patterns) {
      const regex = new RegExp(`!\\[.*?\\]\\(${escapeRegex(pattern)}\\)`, 'g');
      result = result.replace(regex, `![${pattern}](${newUrl})`);
    }
  }
  
  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

## 三、工具与脚本

### 3.1 本地检测工具

```javascript
// scripts/check-images.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter'); // 解析 Markdown frontmatter

class ImageChecker {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.failedUrls = [];
  }
  
  async checkAllMarkdownFiles() {
    const files = this.findMarkdownFiles();
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const urls = this.extractImageUrls(content);
      
      for (const url of urls) {
        const result = await checkImageUrl(url);
        if (!result.valid) {
          this.failedUrls.push({ file, url, error: result.error });
        }
      }
    }
    
    return this.failedUrls;
  }
  
  findMarkdownFiles() {
    // 递归查找 .md 文件
  }
  
  extractImageUrls(content) {
    const regex = /!\[.*?\]\((.*?)\)/g;
    const urls = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      urls.push(match[1]);
    }
    
    return urls;
  }
}
```

### 3.2 GitHub Actions 自动检测

```yaml
# .github/workflows/check-images.yml
name: Check Image URLs

on:
  schedule:
    - cron: '0 2 * * *' # 每天凌晨 2 点
  push:
    branches: [main]

jobs:
  check-images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install axios glob gray-matter
        
      - name: Run image checker
        run: node scripts/check-images.js
        
      - name: Report failures
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Broken Image URLs Detected',
              body: 'Some image URLs in the repository are no longer accessible.'
            })
```

## 四、预防措施

### 4.1 URL 规范最佳实践

| 实践 | 说明 |
|------|------|
| 使用相对路径 | `./images/logo.png` 优于完整 URL |
| GitHub Raw 直链 | 使用 `raw.githubusercontent.com` 而非 `cdn.jsdelivr.net` |
| 自建图床 | 减少第三方依赖 |
| 定期巡检 | CI/CD 或定时任务检测 |
| 本地备份 | 重要图片保留本地副本 |

### 4.2 图床服务选择

| 服务 | 优点 | 缺点 |
|------|------|------|
| GitHub Raw | 免费、稳定、CDN 加速 | 仓库公开、变更需更新 URL |
| Cloudflare R2 | S3 兼容、无带宽费用 | 需要配置 |
| Imgur | 匿名上传、无需账号 | 可能删除、CDN 费用 |
| 七牛云 | 国内 CDN | 需要备案 |
| 自建 MinIO | 完全可控 | 需要维护 |

### 4.3 图片资源管理策略

```javascript
// 图片存储结构建议
docs/
├── assets/
│   ├── images/          # 原始图片
│   │   ├── diagrams/
│   │   └── screenshots/
│   └── processed/       # 优化后图片
└── uploads/             # 用户上传
```

## 五、常见问题

### Q1: 如何检测带签名 URL 是否过期？

```javascript
// 检查 URL 参数中的过期时间
function isSignedUrlExpired(url) {
  const params = new URLSearchParams(url.split('?')[1]);
  const exp = params.get('X-Goog-Algorithm');
  
  if (params.has('Expires')) {
    const expires = parseInt(params.get('Expires')) * 1000;
    return Date.now() > expires;
  }
  
  return false;
}
```

### Q2: 如何处理 `data:image/` Base64 内联图片？

Base64 图片不会过期，但会增加文档体积。建议：

```javascript
// 提取 Base64 图片并转为文件
function extractBase64Images(markdown) {
  const regex = /!\[.*?\]\(data:image\/\w+;base64,(.*?)\)/g;
  
  return markdown.replace(regex, (match, base64) => {
    // 解码并保存为文件
    const buffer = Buffer.from(base64, 'base64');
    const filename = `image-${Date.now()}.png`;
    fs.writeFileSync(`./images/${filename}`, buffer);
    return `![](../images/${filename})`;
  });
}
```

### Q3: 图床迁移如何批量更新 URL？

```javascript
// URL 映射表批量替换
const urlMapping = new Map([
  ['https://old-cdn.com/images/', 'https://new-cdn.com/assets/'],
  ['https://sm.ms/api/v2/', 'https://i.imgur.com/'] // 旧 Imgur → 新 Imgur
]);

function migrateUrls(markdown) {
  let result = markdown;
  
  for (const [oldPrefix, newPrefix] of urlMapping) {
    result = result.replace(
      new RegExp(escapeRegex(oldPrefix), 'g'),
      newPrefix
    );
  }
  
  return result;
}
```

## 六、总结

| 策略 | 适用场景 | 实现成本 |
|------|----------|----------|
| HEAD 请求检测 | 实时检测、CI/CD | 低 |
| 多级 CDN 降级 | 高可用场景 | 中 |
| 定时巡检 | 长期维护 | 低 |
| 本地备份 | 重要资源 | 中 |
| 自建图床 | 企业级应用 | 高 |

推荐组合：**多级 CDN 降级** + **CI/CD 定时检测** + **本地备份**
