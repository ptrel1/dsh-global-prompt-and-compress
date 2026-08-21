# dsh-global-prompt 项目开发规范与维护备忘

## 1. 架构与注入机理

- **双半侧组织**：
  - `lib/index.js`（Node 宿主）：负责与 Cordis `systemPrompt` 注册交互，提供 `/api/global-prompt` REST API；
  - `lib/client.js`（Web SPA）：通过 `ctx.slots.inject('settings.section', ...)` 挂载到 DSH 设置弹窗，提供纯前端无刷新保存体验。
- **权重契约 (`order: -1`)**：
  - Harness 身份为 `-100`；
  - 本插件全局提示词为 `-1`；
  - Preset Persona 为 `0`；
  - 工具使用引导为 `100+`。
  因此无论用户在前端怎么切换预设，全局规范始终注入在最前列。

---

## 2. PostSup 运维与热更流程

- 严格禁止在生产环境裸执行 `supervisorctl restart dsh-web`；
- 所有代码迭代统一通过 `./tools/package.sh <version>` 打包为标准 ZIP 增量包，由 PostSup 执行前置快照备份与受控升级。
