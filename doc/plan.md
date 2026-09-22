# dsh-global-prompt 架构设计与实施计划 (RFC Plan)

> ⚠️ **本文档描述 v0.1.0 时代的设计，部分内容已过时**（20260922 从 GitHub 仓库回灌并标注）。
> **仍成立**：核心决策（`order: -1` 权重契约、100% 零侵入、原子写盘、1MB 上限）。
> **已过时**：
> - 持久化对象 `$DSH_HOME/user/global-prompt.md` → 现为 `$DSH_HOME/AGENTS.md`（插件改用 AGENTS.md 双向同步）
> - API 路径 `/api/global-prompt` → 现为 `/api/desktop-global-prompt`
> - 文件布局 `lib/index.js` + `lib/client.js` → 现为根目录 `index.js` + `client.js`
> - 另新增：工作区级 `AGENTS.md` 编辑（`/api/desktop-project-instructions`）、会话压缩按钮、结果通知
>
> **现状以 `index.js` / `package.json` 为准。**

- **项目名称**：`dsh-global-prompt`
- **定位**：DeepSeek Harness (DSH) 独立全局提示词与人设可视化管理插件
- **状态**：已完成基础搭建与验证，准备远端发布
- **远端仓库**：`git@github.com:ptrel1/dsh-global-prompt.git`

---

## 一、背景与问题定位 (Problem Statement)

### 1.1 现状与痛点
在原版 DeepSeek Harness 中，系统提示词（System Prompt）的配置存在以下局限：
1. **全局 Persona 固化在 Bundle 配置中**：
   - 官方默认提示词（`You are a coding agent powered by...`）硬编码在 `dsh-web-app` 的 `cordis.patch.yml` 中；
   - 用户如需修改，必须直接改动底层 Profile 补丁文件，且修改后**必须重启 DSH 守护进程**才能生效。
2. **Preset 预设切换易丢失全局团队规约**：
   - 当用户在前端切换不同的 Agent Preset（如极简模式、创造模式）时，Preset 自身的 `persona` 会直接完全遮蔽默认的全局人设；
   - 导致团队通用的代码规范、常用文件夹约定、日志排查准则等“全局红线底色”无法稳定贯穿所有会话。
3. **缺乏 Web 原生大尺寸可视化编辑器**：
   - 面对 20KB+ 的长文本规范（如代码专家人设 v3.0.2），缺乏便捷的原生富文本/Markdown 编辑与即时调试入口。

---

## 二、架构设计与核心决策 (Architecture & Decisions)

### 2.1 整体架构（双半侧标准 Cordis 插件模型）

```
                     ┌────────────────────────────────────────────────────────┐
                     │            浏览器端 (Web SPA / Client.js)              │
                     │  1. 监听 settings.section 插槽                         │
                     │  2. 渲染全尺寸 Markdown 编辑器 (支持 Ctrl+S 与暗黑模式) │
                     └──────────────────────────┬─────────────────────────────┘
                                                │ REST API (GET/POST /api/global-prompt)
                                                ▼
                     ┌────────────────────────────────────────────────────────┐
                     │              宿主端 (Node.js / Index.js)               │
                     │  1. 维护磁盘持久化存储 ($DSH_HOME/user/global-prompt.md)│
                     │  2. 提供原子写盘与即时刷新管道                          │
                     │  3. 挂载 ctx.systemPrompt.section({ order: -1 })       │
                     └──────────────────────────┬─────────────────────────────┘
                                                │ 动态拼接 (Assemble Pipeline)
                                                ▼
                     ┌────────────────────────────────────────────────────────┐
                     │              DSH 核心模型组装流水线 (System Prompt)     │
                     │  [-100] DSH 基础身份 (DeepSeek Harness Identity)       │
                     │  [-1]   🟢 本插件全局提示词 (user:global-prompt 置顶底色) │
                     │  [0]    Preset Persona (标准/PTC/极简等预设人设)       │
                     │  [100+] 各 Tool 引导与上下文快照                       │
                     └────────────────────────────────────────────────────────┘
```

### 2.2 核心决策与技术契约

| 决策点 | 选择方案 | 决策依据 |
|---|---|---|
| **源码侵入度** | **100% 零侵入独立插件** | 严禁修改 DSH 官方 `packages/` 源码，确保 upstream 代码更新无任何 Git 冲突。 |
| **生效权重** | **`order: -1`** | 排在 Harness 身份（`-100`）之后、Preset Persona（`0`）之前，形成不可被预设覆盖的全局团队红线底色。 |
| **生效时机** | **即改即生效（0 重启）** | 前端保存时调用 REST API 原子写盘，并在内存中调用 `applySection()` 重载，后续所有模型调用秒级生效。 |
| **前端交互** | **`settings.section` 大面板** | 注入 DSH 设置弹窗左侧独立分类（「全局提示词」），提供全尺寸代码风格大文本框，支持快捷键 `Ctrl+S`。 |
| **持久化格式** | **单文件 Markdown (`.md`)** | 兼容 Git 追踪、手动编辑器编辑（如 VS Code）与 API 在线读写。 |

---

## 三、安全与异常防御 (Security & Robustness)

1. **原子写盘防损坏**：
   保存提示词时写入临时文件 `global-prompt.md.tmp.<timestamp>`，写入完成通过 `renameSync` 替换，防止断电或进程中断导致文件截断变空。
2. **请求体硬上限防护**：
   REST API 入参设置 `1MB` 硬上限防护，防止恶意大报文导致 Node 堆内存溢出。
3. **优雅降级（Graceful Degradation）**：
   若磁盘文件不存在或内容为空，插件自动静默注销 Section，不产生多余的空提示词消耗模型 Token。

---

## 四、PostSup 自动化运维与回滚体系 (DevOps)

项目深度接入 PostSup 平台化管理：
1. **清单配置 (`app.toml`)**：
   声明 `deploy_type = "python-git"`，关联守护服务 `dsh-web`。
2. **标准打包工具 (`tools/package.sh`)**：
   一键自动生成包含 `version.json` 元数据与完整性清单的升级 ZIP 包：
   ```bash
   ./tools/package.sh 0.1.0
   ```
3. **全自动快照与秒级自愈回滚**：
   在 PostSup 界面上传升级包时，自动触发前置全量快照备份；若升级后异常，支持在 Web 控制台一键秒级恢复，严禁在生产环境终端裸执行重启。

---

## 五、项目实施路线图 (Milestones)

- [x] **Phase 1：骨架与宿主端开发**（`package.json`, `cordis.patch.yml`, `lib/index.js` 动态注册与 REST API）；
- [x] **Phase 2：浏览器半侧开发**（`lib/client.js` React 18 大文本框与 `settings.section` 插槽对接）；
- [x] **Phase 3：PostSup 运维接入**（`app.toml`, `tools/package.sh`, `skill/project.md`）；
- [x] **Phase 4：工程规范沉淀与实施计划编制**（`doc/plan.md`）；
- [ ] **Phase 5：远端仓库绑定与全量推送**（推送至 `git@github.com:ptrel1/dsh-global-prompt.git`）。
