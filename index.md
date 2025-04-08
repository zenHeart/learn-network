---
layout: home

hero:
  name: "前端网络手册"
  text: "一站式解决前端网络知识难题的综合指南"
  tagline: "从理论到实践，帮助你从「知道」到「会用」再到「精通」"
  actions:
    - theme: brand
      text: 开始学习
      link: /README
    - theme: alt
      text: 代码示例
      link: /examples
---

<div class="vp-doc">

# 告别网络知识碎片化

本项目旨在彻底解决前端开发者面临的网络知识困境。我们提供系统化的学习资源，将抽象概念具象化，降低理解难度，帮助前端工程师构建完整的网络知识体系。

</div>

<div class="container">
  <div class="features">
    <div class="feature">
      <h3>🌐 系统化学习</h3>
      <p>从互联网基础到 HTTP 协议，再到浏览器网络机制，系统整合碎片化知识，形成完整知识体系</p>
    </div>
    <div class="feature">
      <h3>🔍 实战应用</h3>
      <p>API 通信技术、缓存策略、跨源资源共享等实战知识，通过丰富示例和交互演示，让抽象概念具象化</p>
    </div>
    <div class="feature">
      <h3>🛡️ 安全与优化</h3>
      <p>前端网络安全防御、性能优化技巧、现代网络特性，详解网络调试工具的使用方法和实战技巧</p>
    </div>
  </div>
</div>

<div class="learning-path">
  <h2>为不同阶段开发者定制的学习路径</h2>
  <div class="path-container">
    <div class="path">
      <h3>入门级开发者</h3>
      <p>按章节顺序学习，每个概念配合示例进行实践</p>
    </div>
    <div class="path">
      <h3>中级开发者</h3>
      <p>重点关注实践中的核心网络概念，针对性解决项目中遇到的问题</p>
    </div>
    <div class="path">
      <h3>高级开发者</h3>
      <p>深入研究现代网络特性和各章节的高级主题，优化现有项目</p>
    </div>
  </div>
</div>

<style>
.container {
  margin-top: 2rem;
}
.features {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -12px;
}
.feature {
  flex: 1 1 30%;
  margin: 12px;
  padding: 20px;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: background-color 0.5s;
}
.feature h3 {
  margin-top: 0;
  font-size: 1.4rem;
}
.learning-path {
  margin-top: 3rem;
  text-align: center;
}
.path-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-top: 1.5rem;
}
.path {
  flex: 1 1 30%;
  max-width: 300px;
  padding: 20px;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: background-color 0.5s;
}
.path h3 {
  margin-top: 0;
  font-size: 1.2rem;
}
</style>
