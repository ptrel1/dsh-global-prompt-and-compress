# dsh-global-prompt 项目开发规范与维护备忘

> 20260922 更新：修正文件布局与运维流程（原版描述的是 v0.1.0 的 `lib/` 布局与 PostSup 打包流程，均已不适用）。

## 1. 架构与注入机理

- **双半侧组织**（当前布局 = 根目录，非 `lib/`）：
  - `index.js`（Node 宿主）：与 Cordis `systemPrompt` 交互，注册 `/api/desktop-global-prompt`（全局提示词）与 `/api/desktop-project-instructions`（工作区级）；负责 `$DSH_HOME/AGENTS.md` 的**双向同步**（磁盘优先 reconcile + 文件监听）与原子写盘。
  - `client.js`（Web SPA）：通过 `ctx.slots.inject('settings.section', ...)` 挂载到 DSH 设置弹窗，三个 tab（全局 / 项目 / 通知）+ 会话压缩按钮。
  - `lib/core.js`：共享校验逻辑（config schema、PROMPT_KEYS 等）。
- **权重契约 (`order: -1`)**（**不变量，未变**）：
  - Harness 身份为 `-100`；
  - 本插件全局提示词为 `-1`；
  - Preset Persona 为 `0`；
  - 工具使用引导为 `100+`。
  因此无论用户在前端怎么切换预设，全局规范始终注入在最前列。

---

## 2. 运维与热更流程

- 严格禁止在生产环境裸执行 `supervisorctl restart dsh-web`（当前 AI 会话正由该进程托管，会当场切断自己）。
- **部署走 `dsh1-plugins/sync.sh`**：`./sync.sh dsh`（或 `rescue`），顺序永远 **pnpm → sync.sh → 重启**。
  - ⚠️ 原 `tools/package.sh`（PostSup ZIP 打包）已废弃 —— 其 `files_changed` 写死 `lib/` 布局，与现状不兼容；且插件由 `sync.sh` 直接部署到 node_modules，不经 PostSup。
- **改动后两个仓库都要推送**（详见 `ptrelskill cross/dsh-plugin-guide.md` 形态 D）：
  - 大仓库（部署源）：gitea `ptrel1/dsh1-plugins` → `plugins/dsh-global-prompt/`
  - 插件仓库（发布出口）：GitHub `ptrel1/dsh-global-prompt`
  - 方向恒为「大仓库 → 插件仓库」，**缺一个就留一具过期副本**。

---

## 3. 源码位置（唯一事实源）

**开发只改 `/main/app/github/dsh1-plugins/plugins/dsh-global-prompt/`**。
`/main/app/github/dsh-global-prompt/` 是同一份内容的发布副本，不在此改代码。
