# 🧭 dsh-global-prompt

> 给 DeepSeek Harness 的提示词管理装上图形界面：全局 `AGENTS.md`、各工作区 `AGENTS.md` 可视化编辑，改完即生效，不用再手动翻文件。

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

## ⚠️ 项目沿革与来源（必读）

**本仓库是「发布出口」，不是唯一事实源；且现版代码主体来自上游，不是从零原创。**

### 三代架构的演变

| 阶段 | 时间 | 架构 | 状态 |
| --- | --- | --- | --- |
| **初代（原创）** | 2026-08-21 | 自建方案：`ctx.systemPrompt.section({order:-1})` 直接注册；提示词存 `$DSH_HOME/user/global-prompt.md`；API `/api/global-prompt`。仅覆盖**全局**提示词 | 已被替换（代码见 `git show eed45e2:lib/index.js`，设计文档留档 `doc/plan.md`） |
| **现版（主体来自上游）** | 2026-08-25 起 | 复用官方机制：bundle patch 重新启用 `dsh-agent-instructions`，编辑 `AGENTS.md` 并双向同步；覆盖全局 + 各工作区 + 身份 + 人设 + 通知 | **当前主线** |
| **本地增量** | 2026-09-03 起 | 在上游基础上适配 DSH 0.1.5（`settingsNamespace` 内部化）、新增会话压缩按钮、修复设置面板卡死 bug | 已合并进现版 |

### 来源说明

- **代码主体来自上游 [`sryimnoob123/dsh-global-prompt`](https://github.com/sryimnoob123/dsh-global-prompt)**
  （npm 包 `dsh-global-prompt@0.1.2` 由其发布）。核心逻辑 `lib/core.js`、`cordis.patch.yml`
  与本仓库逐字节一致，`index.js` 仅 3 处改动。
  > ⚠️ 两地**无共同 git 祖先**（非 fork），是各自实现的同名项目；本仓库在其基础上做了本地增量。
- **本仓库相对上游的增量**：
  1. 适配 DSH 0.1.5 —— `settingsNamespace` 已内部化，改用字符串字面量
  2. 新增「会话压缩按钮」配置项与 UI
  3. 修复设置面板永久卡在「正在读取设置...」的 bug（`api.workspace.list` 永不 resolve）
- **授权**：上游为 MIT，允许修改与再分发；本仓库保留其 LICENSE。

### 三个仓库的关系

| 仓库 | 角色 |
| --- | --- |
| `sryimnoob123/dsh-global-prompt` | **上游原创**（npm 发布源，0.1.2） |
| `ptrel1/dsh-global-prompt`（本仓库） | **发布出口 / 二次开发**（0.2.0） |
| `ptrel1/dsh1-plugins` → `plugins/dsh-global-prompt/` | **实际部署源**（改代码以这里为准，再同步两侧） |

> 本仓库不做独立开发。改代码请改 gitea monorepo，然后同步到这里（见 `package.json` 的 `source` 字段）。

## 这是什么

DSH 的指令注入机制（`dsh-agent-instructions`）是**读文件**的：`$DSH_HOME/AGENTS.md` 就是全局提示词，写进去就生效。但没有面板，你得自己去翻安装目录改文件。

本插件在设置面板里开了三个 tab，把这件事变成点一点：

| Tab | 干什么 |
| --- | --- |
| 全局 | 编辑 `$DSH_HOME/AGENTS.md`，下一条消息就生效，不用重启、不用开新会话 |
| 项目 | 按工作区管理各自的 `AGENTS.md`，只对那个工作区生效 |
| 通知 | 任务完成/失败弹系统通知，点一下回到对应会话 |

## 特性

- **双向同步**：插件外直接改 `AGENTS.md`，面板能读到（150ms 内自动回写设置）；面板保存，文件被重写。两个方向都有内容守卫，不会互刷。
- **不丢数据**：你手动维护过 `AGENTS.md` 的话，插件启动时以磁盘为准回填设置，绝不会被默认空值覆盖；关闭「启用」也不会清空你的文件。
- **身份注入**：可选在每次对话开头加一句「我是 DeepSeek Harness」。
- **人设注入**：写一段人设，一直拼在对话里。支持 `{{model}}`、`{{cwd}}` 占位符。
- **运行时上下文开关**：不需要时抑制 DSH 自带的会话信息快照。
- **结果通知**：桌面壳用系统通知，纯 Web 用浏览器通知。

## 安装

### 独立安装

```bash
dsh plugin --profile <你的profile> add dsh-global-prompt
```

### 随壳内置

dsh-desktop 安装器已捆绑本插件（默认启用，可在插件管理里关掉）。

> 原理：本插件的 bundle patch 会重新启用 `dsh-agent-instructions`（web-app bundle 默认禁用它），面板里写的 AGENTS.md 由官方机制注入——所见即所注入。

## 开发

纯 ESM，无构建步骤。结构：

- `index.js` — 服务端：settings 注册、AGENTS.md 双向同步（目录监听 + 防抖）、两个 HTTP API、身份/人设注入、运行时上下文抑制
- `client.js` — 设置面板 UI（全局/项目/通知三 tab）
- `lib/core.js` — 校验与工具函数（persona ≤ 20000 字符、指令 ≤ 1MiB）
- `test/global-prompt-sync.mjs` — 双向同步防环自测（mock dsh-settings 语义）

跑测试：

```bash
node test/global-prompt-sync.mjs
```

## 兼容性

- 官方 dsh `>= 0.1.1-rc.1`（npm latest 为 0.1.1-rc.2）
- Node >= 20
- DSH Web 与 dsh-desktop Electron 壳均可

## License

MIT


---

## 附带小工具

核心提示词注入之外，本插件顺带收纳常用的会话级小优化（依附本插件部署，不单独成包）：

- **会话压缩按钮**：输入区右侧一键触发内置 `/compact` 压缩历史；提交中/压缩中自动禁用，成功变绿、失败变红（tooltip 提示）。
  - 真实失败原因只写会话日志 `compaction/end` 事件（如 provider 401 余额不足），UI 不回显。

### 收纳标准

- 会话级、client 逻辑 <100 行、无需独立配置面板
- 有 host 服务或独立配置的功能请独立成插件
- 提示词主功能改动优先级永远高于附带工具
