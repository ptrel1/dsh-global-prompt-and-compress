# dsh-global-prompt

> DeepSeek Harness 全局提示词与人设管理插件：**原生设置面板大文本框可视化编辑 + 磁盘持久化保存 + 0 重启即改即生效（order: -1 置顶底色）**。

一个**独立、非侵入**的 DSH 插件。通过 Cordis 补丁机制将用户自定义的代码规范、常用目录与团队规约注入到 System Prompt 的最前置底色层（`order: -1`）。

---

## 特性亮点

1. **绝对零侵入**：
   - 绝不修改 DSH 任何核心 `packages/` 源码，DSH 从官方 upstream 拉取更新毫无冲突。
2. **Web 原生设置面板无缝集成**：
   - 注入 DSH 设置面板专属分类（`settings.section` 插槽），提供大尺寸代码风格 Markdown 文本框编辑器；
   - 支持快捷键 `Ctrl+S` / `Cmd+S` 一键保存；
   - 完美适配系统浅色 / 暗黑模式。
3. **0 重启，即改即生效**：
   - 点击保存后，宿主端原子更新 `$DSH_HOME/user/global-prompt.md` 磁盘文件，并动态刷新 `ctx.systemPrompt.section`；
   - 所有新建会话及已有会话的后续轮次秒级加载新规约，**完全无需重启 DSH 守护进程**。
4. **与预设（Preset）完美共存**：
   - 注入层级固定在 `order: -1`（Harness 基础身份之后、Preset Persona 之前）；
   - 无论切换至标准模式、PTC 模式、极简模式或自定义预设，全局提示词均作为**基础红线底色**稳定生效。

---

## 目录结构

```
dsh-global-prompt/
├── package.json           # 清单：dsh.bundle.patch 与 dsh.client 注册声明
├── cordis.patch.yml       # 挂载声明（insert global-prompt 行）
├── app.toml               # PostSup 被管应用配置（python-git 增量升级）
├── tools/
│   └── package.sh         # 标准发布打包脚本（生成带 version.json 的 zip）
├── lib/
│   ├── index.js           # 🟢 宿主半侧：文件读写 + systemPrompt Section 动态更新 + REST API
│   └── client.js          # 🔵 浏览器半侧：DSH 原生设置面板 Markdown 编辑器组件
├── skill/
│   └── project.md         # 项目开发与运维规范
└── README.md
```

---

## 安装与挂载

### 1. 挂载到 Web Profile
```bash
cd ~/.dsh/profiles/web
dsh plugin --profile web add link:/main/app/github/dsh-global-prompt
```

### 2. 通过 PostSup 安全更新（推荐）
在项目根目录执行打包：
```bash
./tools/package.sh 0.1.0
```
产物生成在 `update_package/dsh-global-prompt-v0.1.0.zip`。在 PostSup Web 控制台（`http://127.0.0.1:5013`）中上传升级，享受自动快照备份与一键自愈回滚保障。

---

## 环境变量与配置项

| config 字段 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| `filePath` | `DSH_GLOBAL_PROMPT_FILE` | `$DSH_HOME/user/global-prompt.md` | 提示词持久化 Markdown 文件路径 |
| `order` | `DSH_GLOBAL_PROMPT_ORDER` | `-1` | 系统提示词组装权重 |
