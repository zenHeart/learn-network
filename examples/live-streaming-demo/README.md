# 直播流程演示

交互式 HTML 演示页面，展示直播技术的完整流程。

## 功能

- 📊 **技术架构图** - 可视化展示直播系统的整体架构
- 🔄 **协议对比** - RTMP、HLS、WebRTC、DASH 四大协议详细对比
- 📝 **完整流程** - 从采集到播放的 7 步详细说明
- 🎮 **流程模拟器** - 实时模拟直播流程，观察各阶段状态变化

## 使用方法

直接在浏览器中打开 `index.html` 文件即可。

## 技术栈

- 纯 HTML + CSS + JavaScript
- 无外部依赖
- SVG 绘制架构图
- 响应式设计

## 直播技术概览

### 直播延迟对比

| 协议 | 延迟 | 适用场景 |
|------|------|----------|
| HLS | 5-10s | 大规模分发、移动端 |
| RTMP | 2-3s | 秀场直播、游戏直播 |
| WebRTC | <300ms | 视频通话、连麦互动 |

### 完整流程

1. 📹 音视频采集 (MediaDevices API)
2. 🔧 音视频编码 (H.264/AAC)
3. 📤 推流协议封装 (RTMP/WebRTC)
4. 🖥️ 服务器处理 (转码、录制、分发)
5. 🌐 CDN 分发 (边缘节点)
6. 📥 观众拉流
7. 🎬 解码播放

## 参考资料

- [MDN Media APIs](https://developer.mozilla.org/en-US/docs/Web/Media)
- [WebRTC 规范](https://www.w3.org/TR/webrtc/)
- [HLS 协议规范](https://developer.apple.com/documentation/http_live_streamting)
- [RTMP 规范](https://www.adobe.com/devnet/rtmp.html)

## 相关文档

- [腾讯会议直播技术详解](../../docs/tencent-meeting/tencent-meeting-live-streaming.md)
