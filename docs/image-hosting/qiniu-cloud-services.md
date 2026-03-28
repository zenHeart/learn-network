---
title: 七牛云服务详解
category: 图床与 CDN
description: 全面介绍七牛云的各项服务，包括对象存储、Kodo、融合 CDN、图片处理等
keywords: 七牛云, Qiniu, CDN, 对象存储, Kodo, 图床
---

# 七牛云服务详解

## 1. 七牛云概述

七牛云是国内领先的云服务商，主要提供：

- **CDN/融合 CDN**：全球内容分发网络
- **对象存储 (Kodo)**：海量非结构化数据存储
- **多媒体服务**：图片处理、音视频处理
- **数据处理**：实时音视频、直播、点播

### 1.1 核心优势

| 优势 | 说明 |
|------|------|
| 国内 CDN 节点 | 覆盖全国主要运营商 |
| 图片处理 | 上传即处理，无需服务端 |
| SDK 完善 | 提供各语言 SDK |
| 费用低廉 | 按量付费，免费额度大 |

### 1.2 适用场景

- 图片/音视频托管
- 静态资源加速
- 移动端直传
- 音视频点播/直播

## 2. 对象存储 (Kodo)

### 2.1 基本概念

```
Bucket（存储桶）
    │
    ├── 空间名称（唯一标识）
    ├── 存储区域（华东/华北/华南/北美）
    └── 访问控制（公开/私有）
```

### 2.2 上传文件

**上传流程：**

```
1. 客户端向业务服务器请求上传凭证
2. 服务器使用 SecretKey 生成上传凭证
3. 客户端使用凭证直接上传到七牛云
4. 上传成功后返回文件 Key
```

**服务端生成凭证（Node.js）：**

```javascript
const qiniu = require('qiniu')

// 配置
const accessKey = 'your_access_key'
const secretKey = 'your_secret_key'
const bucket = 'your_bucket_name'

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
const options = {
  scope: bucket,
  expires: 3600  // 1小时有效期
}
const putPolicy = new qiniu.rs.PutPolicy(options)
const uploadToken = putPolicy.uploadToken(mac)

console.log(uploadToken)
```

**客户端上传（JavaScript）：**

```javascript
const formData = new FormData()
formData.append('token', uploadToken)
formData.append('file', fileObject)
formData.append('key', 'my-image.png')

fetch('https://upload.qiniup.com', {
  method: 'POST',
  body: formData
})
  .then(res => res.json())
  .then(data => {
    console.log('文件 Key:', data.key)
    console.log('访问URL:', `https://your-domain.com/${data.key}`)
  })
```

### 2.3 下载文件

**公开空间：**

```javascript
// 直接通过 URL 访问
const fileUrl = `https://your-domain.com/${fileKey}`
```

**私有空间：**

```javascript
// 生成私有下载链接（带签名）
const config = new qiniu.conf.Config()
const bucketManager = new qiniu.rs.BucketManager(mac, config)

bucketManager.privateDownloadUrl(domain, fileKey, expires, (err, respBody, respInfo) => {
  if (err) {
    console.error(err)
    return
  }
  console.log('私有下载链接:', respBody)
})
```

### 2.4 Bucket 访问策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| 公开 | 直接通过 URL 访问 | 静态资源、图床 |
| 私有 | 需要签名验证 | 私有文件、付费内容 |

## 3. 融合 CDN

### 3.1 CDN 工作原理

```
用户请求
    │
    ▼
┌─────────┐     未命中     ┌─────────┐
│   CDN   │ ─────────────▶│  源站   │
│  节点   │               │ (OSS)   │
└─────────┘     命中      └─────────┘
    │                     ▲
    │      缓存           │
    └─────────────────────┘
         返回内容
```

### 3.2 缓存策略配置

**缓存过期规则：**

```javascript
// 七牛云缓存配置
const cacheConfig = {
  // 静态资源缓存 30 天
  'Cache-Control': 'public, max-age=2592000',
  
  // HTML 缓存 1 小时
  'Cache-Control': 'public, max-age=3600',
  
  // 不缓存
  'Cache-Control': 'no-cache, no-store'
}
```

### 3.3 CDN 刷新与预取

```javascript
// 刷新 CDN 缓存
const cdnManager = new qiniu.cdn.CdnManager(mac)

// 刷新单个 URL
const urlsToRefresh = ['https://your-cdn.com/image.png']
cdnManager.refreshUrls(urlsToRefresh, (err, respBody, respInfo) => {
  console.log('刷新结果:', respBody)
})

// 预取资源
const urlsToPrefetch = ['https://your-cdn.com/big-file.zip']
cdnManager.prefetchUrls(urlsToPrefetch, (err, respBody, respInfo) => {
  console.log('预取结果:', respBody)
})
```

## 4. 图片处理

### 4.1 七牛云图片处理 API

**基础处理（URL 参数）：**

```javascript
// 图片 URL + 处理参数
const originalUrl = 'https://your-domain.com/photo.jpg'

// 缩放
const resizedUrl = `${originalUrl}?imageMogr2/thumbnail/!200x200`

// 裁剪
const croppedUrl = `${originalUrl}?imageMogr2/crop/300x300`

// 格式转换
const webpUrl = `${originalUrl}?format=webp`

// 质量调整
const qualityUrl = `${originalUrl}?imageslim`
// 或
const qualityUrl = `${originalUrl}?imageMogr2/quality/85`
```

### 4.2 常用图片处理参数

| 参数 | 功能 | 示例 |
|------|------|------|
| `imageMogr2/thumbnail` | 缩放 | `!200x200`（等比缩放） |
| `imageMogr2/crop` | 裁剪 | `300x300a10a10` |
| `imageMogr2/auto-orient` | 自动旋转 | - |
| `format` | 格式转换 | `webp`, `png`, `jpeg` |
| `imageslim` | 压缩 | - |
| `watermark` | 水印 | - |

### 4.3 样式（Pipeline）

```javascript
// 创建图片样式
const pipelineName = 'my_style'

// 样式内容：缩放 + 质量优化 + WebP
const style = 'imageMogr2/thumbnail/800x600/smooth/50/format/webp'

// 应用样式
const styledUrl = `${originalUrl}?${style}`

// 或使用七牛云样式分隔符
// 先在后台配置样式别名，如 "small"、"medium"、"large"
const smallUrl = `${originalUrl}!small`
```

### 4.4 持久化处理

```javascript
// 大图处理后持久化存储
const pfop = new qiniu.fop.Pfop(mac, bucket, fileKey, [
  'imageMogr2/thumbnail/400x400',
  'imageslim'
])

pfop.persist(saveBucket, saveKey, (err, respBody, respInfo) => {
  if (err) {
    throw err
  }
  
  if (respInfo.statusCode === 200) {
    console.log('持久化成功，ID:', respBody.persistentId)
  }
})
```

## 5. 前端直传七牛云

### 5.1 安全策略

**不要在前端暴露 AccessKey/SecretKey！**

```
❌ 错误做法：
前端直接使用 SecretKey 生成上传凭证

✅ 正确做法：
1. 前端向业务服务器请求上传凭证
2. 业务服务器使用 SecretKey 生成凭证
3. 前端使用凭证上传
```

### 5.2 完整上传示例

**服务端（Express）：**

```javascript
const express = require('express')
const qiniu = require('qiniu')
const app = express()

app.get('/api/upload-token', (req, res) => {
  const accessKey = process.env.QINIU_ACCESS_KEY
  const secretKey = process.env.QINIU_SECRET_KEY
  const bucket = 'my-bucket'
  
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: bucket,
    // 上传成功后回调业务服务器（可选）
    callbackUrl: 'https://your-server.com/api/qiniu-callback',
    callbackBody: '{"key":"$(key)","hash":"$(hash)","fsize":"$(fsize)"}'
  })
  
  const token = putPolicy.uploadToken(mac)
  res.json({ token })
})

app.listen(3000)
```

**前端（Vue/React）：**

```javascript
// 获取上传凭证
async function getUploadToken() {
  const res = await fetch('/api/upload-token')
  return res.json().then(data => data.token)
}

// 上传文件
async function uploadToQiniu(file) {
  const token = await getUploadToken()
  
  const formData = new FormData()
  formData.append('token', token)
  formData.append('file', file)
  formData.append('key', `${Date.now()}-${file.name}`)
  
  const res = await fetch('https://upload.qiniup.com', {
    method: 'POST',
    body: formData
  })
  
  return res.json()
}

// 使用
const input = document.querySelector('input[type="file"]')
input.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  const result = await uploadToQiniu(file)
  console.log('上传成功:', result.key)
})
```

## 6. 防盗链

### 6.1 Referer 防盗链

```javascript
// 配置 Referer 白名单
const config = new qiniu.conf.Config()
const cdnManager = new qiniu.cdn.CdnManager(mac)

// 设置 Referer 防盗链
const options = {
  domain: 'your-domain.com',
  query: {
    refererList: ['example.com', 'www.example.com'],
    refererType: 'white'  // whitelist
  }
}

cdnManager.setRefererWhiteList(options, (err, body, info) => {
  console.log('设置结果:', body)
})
```

### 6.2 URL 签名（时间戳防盗链）

```javascript
// 生成带签名的 URL
function generateSignedUrl(originalUrl, secretKey, expires = 3600) {
  const deadline = Math.floor(Date.now() / 1000) + expires
  const path = new URL(originalUrl).pathname
  
  // 签名算法
  const strToSign = `${path}${deadline}`
  const signature = crypto
    .createHmac('sha1', secretKey)
    .update(strToSign)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  
  return `${originalUrl}?v=${deadline}&token=${signature}`
}
```

## 7. SDK 推荐版本

| SDK | 推荐版本 | 说明 |
|-----|---------|------|
| Node.js | qiniu@7.x | 支持 ES Module |
| Python | qiniu@7.x | - |
| Go | qiniu-go-sdk | - |
| Java | qiniu-java-sdk | - |

```bash
# Node.js 安装
npm install qiniu

# Python 安装
pip install qiniu
```

## 8. 常见问题

### Q1: 七牛云需要域名备案吗？

- 使用七牛云 CDN 加速：需要域名备案
- 仅使用七牛云存储：通过七牛云分配的临时域名访问，不需要备案

### Q2: 上传文件大小限制？

- 默认：1GB（通过服务端凭证）
- 前端直传：受浏览器限制，通常建议小于 100MB

### Q3: 如何迁移到七牛云？

```javascript
// 从其他云存储迁移到七牛云
const fetch = require('node-fetch')

async function migrateFile(srcUrl, destBucket, destKey) {
  // 1. 从源站下载
  const response = await fetch(srcUrl)
  const buffer = await response.buffer()
  
  // 2. 上传到七牛云
  const formData = new FormData()
  formData.append('token', uploadToken)
  formData.append('file', buffer, destKey)
  formData.append('key', destKey)
  
  await fetch('https://upload.qiniup.com', {
    method: 'POST',
    body: formData
  })
}
```

### Q4: 如何监控七牛云使用情况？

```javascript
// 获取流量使用统计
const accountManager = new qiniu.account.AccountManager(mac)

accountManager.getBucketDomains(bucket, (err, data) => {
  console.log('域名列表:', data)
})
```

## 9. 最佳实践

### 9.1 存储策略

```
├── 公开资源（CDN 加速）
│   └── 图片、CSS、JS、视频
│
├── 私有资源（签名访问）
│   └── 用户上传的私有文件
│
└── 临时资源（设置过期）
    └── 一次性分享的文件
```

### 9.2 成本优化

| 优化策略 | 说明 |
|---------|------|
| 合理设置缓存 | 减少回源次数 |
| 使用图片处理 | 压缩/格式转换节省流量 |
| 预取热点资源 | 提前缓存避免突发流量 |
| 选择合适区域 | 存储区域靠近用户 |

### 9.3 故障排查

| 问题 | 排查方法 |
|------|---------|
| 上传失败 | 检查 token 有效期和权限 |
| 访问 403 | 检查防盗链和 Bucket 权限 |
| CDN 不生效 | 检查缓存是否命中 |
| 图片处理失败 | 检查参数是否正确 |

## 10. 参考资源

- [七牛云开发者文档](https://developer.qiniu.com/)
- [七牛云 SDK](https://developer.qiniu.com/sdk)
- [七牛云价格计算器](https://www.qiniu.com/pricing)

---

*文档创建时间：2026-03-28*
