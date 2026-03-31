# SPEC: 跨域策略梳理

## 目标
在 zenHeart/learn-network 仓库创建跨域策略技术文档和交互演示。

## 验收标准
1. 创建 `docs/security/cross-origin-strategies/index.md`
   - 覆盖 7 种跨域策略：CORS、JSONP、postMessage、WebSocket、iframe 技巧、代理、其他
   - 每种策略说明原理、优缺点、适用场景
   - 代码示例
2. 创建 `examples/security/cross-origin-strategies/index.html`
   - 交互式演示（≥6 Tab）
   - 概念总览 / CORS / JSONP / postMessage / WebSocket / 代理 / 对比总结
3. 提交 PR 到 zenHeart/learn-network
4. 更新飞书通讯表格状态为「已完成」

## 约束
- PR 提交到 zenHeart/learn-network
- 代码精简，说明概念而非冗余
