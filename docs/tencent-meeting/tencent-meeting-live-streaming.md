# 腾讯会议直播技术详解

> 本文介绍腾讯会议直播功能的技术实现，包括 SDK 架构、API 接口、直播技术方案及开发实践。

## 目录

1. [产品体系概述](#1-产品体系概述)
2. [核心技术架构](#2-核心技术架构)
3. [SDK 与 API](#3-sdk-与-api)
4. [直播技术方案](#4-直播技术方案)
5. [开发实践指南](#5-开发实践指南)
6. [常见问题](#6-常见问题)

---

## 1. 产品体系概述

### 1.1 腾讯会议产品线

| 产品 | 说明 | 定位 |
|------|------|------|
| 腾讯会议 | 视频会议 SaaS | 企业内外部会议 |
| 腾讯会议 Rooms | 会议室解决方案 | 硬件设备集成 |
| 腾讯会议 API | 开放接口 | 企业定制开发 |
| TRTC | 实时音视频通信 | 低延时互动场景 |
| CSS | 云直播服务 | 大规模直播分发 |

### 1.2 腾讯会议开放能力

腾讯会议提供以下开放能力：

- **会议管理**：创建/加入/结束会议
- **用户管理**：企业用户同步、SSO 登录
- **设备管理**：会议室设备控制
- **直播推流**：会议直播到第三方平台
- **录制管理**：会议录制与回放
- **数据统计**：会议数据分析

---

## 2. 核心技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ Web SDK │  │Android SDK│  │ iOS SDK │  │ Windows SDK│    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘      │
└───────┼────────────┼────────────┼────────────┼────────────┘
        │            │            │            │
        └────────────┴─────┬──────┴────────────┘
                           │
                    ┌──────▼──────┐
                    │   TRTC 网关   │
                    │  (实时通信)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
 ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
 │  会议服务    │   │   录制服务   │   │   直播服务   │
 │ (MCU/SFU)  │   │             │   │  (RTMP/HLS) │
 └─────────────┘   └─────────────┘   └─────────────┘
```

### 2.2 音视频传输架构

腾讯会议使用多种传输协议：

| 场景 | 协议 | 延时 | 说明 |
|------|------|------|------|
| 实时通话 | UDP (QUIC) | <200ms | TRTC 私有协议 |
| 直播观看 | RTMP/HLS | 2-10s | CDN 分发 |
| 屏幕共享 | UDP | <100ms | 优化编码 |

### 2.3 SFU vs MCU 架构

**SFU (Selective Forwarding Unit)**：

```
┌──────────────────────────────────────────────────┐
│                      SFU                          │
│   ┌────────┐                                      │
│   │ Participant A                                 │
│   │ ◄────────────────────►│                     │
│   └────────┘               │                     │
│                            │                     │
│   ┌────────┐               ▼                     │
│   │ Participant B        ┌───┐                   │
│   │ ◄────────────────────►│   │                   │
│   └────────┘            │SFU│                   │
│                          │   │                   │
│   ┌────────┐            │   │                   │
│   │ Participant C        │ ◄─►│                   │
│   │ ◄───────────────────►└───┘                   │
│   └────────┘                                      │
└──────────────────────────────────────────────────┘
```

**特点**：
- 每个参与者直接发送一路流到 SFU
- SFU 转发而非混合，转发效率高
- 支持 simulcast（多路分层流）
- WebRTC 标准的 SFU 实现

---

## 3. SDK 与 API

### 3.1 SDK 类型

| SDK | 场景 | 协议 | 包大小 |
|-----|------|------|--------|
| TRTC SDK | 实时互动 | UDP/QUIC | ~3MB |
| 腾讯会议 SDK | 会议集成 | WebRTC | ~1MB |
| 直播 SDK | 推流播放 | RTMP/HLS | ~2MB |

### 3.2 TRTC SDK 核心接口

```javascript
// 1. 初始化
import TRTC from 'trtc-sdk-js';

const trtc = TRTC.create({
  sdkAppId: 1400000000,
  userId: 'user_001',
  userSig: 'xxxxx' // 后端生成
});

// 2. 加入房间
await trtc.enterRoom({ roomId: 123456 });

// 3. 开启本地音视频
await trtc.startLocalAudio();
await trtc.startLocalVideo();

// 4. 远端用户事件
trtc.on(TRTC.EVENT.REMOTE_USER_ENTER, (userId) => {
  console.log('用户加入:', userId);
});

trtc.on(TRTC.EVENT.REMOTE_USER_LEAVE, (userId) => {
  console.log('用户离开:', userId);
});

// 5. 订阅远端音视频
trtc.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, (userId) => {
  // 远端用户有视频可用
  const view = document.getElementById('remote-' + userId);
  trtc.startRemoteVideo({ userId, view });
});

// 6. 离开房间
await trtc.exitRoom();
```

### 3.3 会议直播 API

```javascript
// 腾讯会议 OAuth2 获取 access_token
const response = await fetch('https://api.meeting.qq.com/v1/oauth2/access_token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'client_credentials',
    client_id: 'your_client_id',
    client_secret: 'your_client_secret'
  })
});

// 创建会议直播
const meeting = await fetch('https://api.meeting.qq.com/v1/meetings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subject: '产品发布会',
    start_time: '2026-03-27 10:00:00',
    duration: 7200, // 2小时
    meeting_type: 0,
    live_config: {
      live_addr: 'rtmp://push.example.com/live/xxx',
      live_stream_type: 'rtmp'
    }
  })
});
```

### 3.4 直播推流接口

| 接口 | 说明 | 场景 |
|------|------|------|
| CreateMeeting | 创建会议 | 会议开始 |
| StartLive | 开始直播 | 直播推流 |
| StopLive | 停止直播 | 直播结束 |
| GetMeeting | 获取会议信息 | 状态查询 |

---

## 4. 直播技术方案

### 4.1 直播架构

```
┌─────────────────────────────────────────────────────────────┐
│                     腾讯会议服务端                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐      │
│  │  TRTC 录制 │───►│  转码服务   │───►│  CDN 分发  │      │
│  │ (源站录制) │    │ (HLS/RTMP) │    │ (全球加速) │      │
│  └────────────┘    └────────────┘    └────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      观众端                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ Web HLS │  │App HLS  │  │小程序直播│                 │
│  └─────────┘  └─────────┘  └─────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 推流协议对比

| 协议 | 延时 | 场景 | 兼容性 |
|------|------|------|--------|
| RTMP | 2-5s | 直播推流 | 好 |
| HTTP-FLV | 2-5s | 直播观看 | 需要 FFmpeg |
| HLS | 5-10s | 移动端 | 最佳 |
| DASH | 5-10s | 国际 | 一般 |

### 4.3 WebRTC 直播方案

```javascript
// 使用 TRTC 实现直播
class LiveStreaming {
  constructor(options) {
    this.roomId = options.roomId;
    this.userId = options.userId;
    this.sdkAppId = options.sdkAppId;
  }

  // 主播开始直播
  async startLive() {
    // 1. 加入 TRTC 房间
    this.trtc = TRTC.create({
      sdkAppId: this.sdkAppId,
      userId: this.userId
    });

    await this.trtc.enterRoom({ roomId: this.roomId });

    // 2. 开启本地预览
    await this.trtc.startLocalVideo();
    await this.trtc.startLocalAudio();

    // 3. 设置直播模式
    await this.trtc.startLocalAudio({
      audioQuality: 'speech' // 语音优先
    });

    console.log('直播已开始');
  }

  // 主播结束直播
  async stopLive() {
    await this.trtc.stopLocalVideo();
    await this.trtc.stopLocalAudio();
    await this.trtc.exitRoom();
    console.log('直播已结束');
  }

  // 观众观看直播
  async watchLive() {
    this.trtc = TRTC.create({
      sdkAppId: this.sdkAppId,
      userId: 'viewer_' + Date.now()
    });

    // 进入房间但不发送自己的流
    await this.trtc.enterRoom({ roomId: this.roomId });

    // 订阅主播的流
    this.trtc.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId }) => {
      const view = document.getElementById('remote-view');
      this.trtc.startRemoteVideo({ userId, view });
    });
  }
}
```

### 4.4 CDN 直播分发

```
主播端                    CDN                          观众端
  │                        │                            │
  │◄── QUIC/RTMP ────────►│                            │
  │                        │                            │
  │   实时录制转码          │                            │
  │◄───►│                 │                            │
  │      │                 │                            │
  │      ▼                 │                            │
  │   ┌──────┐            │                            │
  │   │ HLS  │            │                            │
  │   │ RTMP │            │                            │
  │   └──────┘            │                            │
  │                        │◄─── HLS/DASH ────────────►│
  │                        │                            │
```

---

## 5. 开发实践指南

### 5.1 SDK 接入步骤

```bash
# 1. 安装 SDK
npm install trtc-sdk-js

# 2. 获取 SDKAppId 和密钥
# 在腾讯云控制台创建应用获取

# 3. 后端生成 UserSig
# 必须在后端生成，前端暴露会被盗用
```

```javascript
// 后端 Node.js 生成 UserSig
const tls = require(' tls');
const fs = require('fs');

function genUserSig(options) {
  const { sdkAppId, userId, expireTime = 604800 } = options;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const expire = currentTime + expireTime;
  
  const payload = {
    sdkAppId,
    userId,
    time: currentTime,
    expire
  };
  
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  // 简化示例，实际使用腾讯云提供的签名库
  return base64Payload + '.' + 'signature';
}
```

### 5.2 常见配置

| 配置项 | 说明 | 推荐值 |
|--------|------|--------|
| videoResolution | 视频分辨率 | 1280x720 |
| videoFrameRate | 帧率 | 15fps |
| audioSampleRate | 音频采样率 | 48000 |
| audioChannel | 音频通道 | mono |
| minVideoBitrate | 最小码率 | 200kbps |
| maxVideoBitrate | 最大码率 | 1000kbps |

### 5.3 质量监控

```javascript
// 监听网络质量
trtc.on(TRTC.EVENT.NETWORK_QUALITY, (networkQuality) => {
  // networkQuality.level: 0-6，0最好，6最差
  console.log('网络质量:', networkQuality);
  
  if (networkQuality.level > 4) {
    // 网络质量差，提示用户
    showQualityWarning('您的网络质量较差');
  }
});

// 监听音频质量
trtc.on(TRTC.EVENT.AUDIO_VOLUME, ({ userId, volume }) => {
  // userId 为空表示本地音量
  // volume: 0-100
  console.log(`用户 ${userId} 音量: ${volume}`);
});
```

---

## 6. 常见问题

### Q1: TRTC 和腾讯会议 SDK 如何选择？

| 场景 | 推荐 SDK | 理由 |
|------|----------|------|
| 直接集成会议功能 | 腾讯会议 SDK | 开箱即用 |
| 高度定制会议 UI | TRTC SDK | 灵活性高 |
| 纯直播场景 | CSS 直播 SDK | 成本更低 |
| 多人互动+直播 | TRTC + CSS | 混合方案 |

### Q2: 直播延时如何优化？

1. **选择合适协议**：UDP > HTTP-FLV > HLS
2. **启用 CDN 加速**：就近接入
3. **码率自适应**：网络自适应编码
4. **关键帧间隔**：降低 GOP

### Q3: 如何实现万人直播？

```
架构设计：
┌─────────────────────────────────────────────────┐
│                   TRTC SFU                       │
│  ┌─────────────────────────────────────────┐    │
│  │  主播 ◄───── 核心转发 ─────► 观众      │    │
│  │                                          │    │
│  │  [连麦用户1]  │  [连麦用户2]  │          │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│              CSS CDN (直播分发)                   │
│  万人观众通过 RTMP/HLS 观看                      │
└─────────────────────────────────────────────────┘
```

方案：
1. 核心用户使用 TRTC 实时互动
2. 大量观众通过 CSS CDN 观看直播流
3. 使用旁路直播功能

### Q4: 如何处理网络切换？

```javascript
// 监听网络变化
window.addEventListener('online', () => {
  console.log('网络恢复');
  // 自动重连
  this.reconnect();
});

window.addEventListener('offline', () => {
  console.log('网络断开');
  // 提示用户
  showOfflineWarning();
});

// TRTC 自动处理网络切换
// 设置自动重连
trtc.enterRoom({
  roomId: this.roomId,
  autoSetAudio: true,
  autoSetVideo: true
});
```

---

## 参考资料

- [TRTC SDK 文档](https://cloud.tencent.com/document/product/647)
- [腾讯会议 API 文档](https://cloud.tencent.com/document/product/1095)
- [WebRTC 标准](https://webrtc.org/)
- [MDN WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

## 更新历史

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-03-26 | 1.0.0 | 初始版本 |

