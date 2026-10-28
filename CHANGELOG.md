# 更新日志

本项目所有值得记录的变更都会写在这里。

## [0.2.2] - 2026-10-27

### 修复
- 宿主 0.2.x 下设置面板保存报错 `Plugin entry "desktop-global-prompt" has no volatile fields`：
  `dsh-settings` 的 `write()` 只放行 Config 上标了 `volatile` 的字段（schemastery `.volatile()`
  ⇒ `meta.volatile`）。本插件 20260923 的适配只声明了 Config 而未标 volatile，导致所有
  `settings.update` 被拒 —— 保存不生效，启动回填 `AGENTS.md` 同样失败。
- 9 个可写字段改标 `.volatile()`（`migrated` 是内部迁移标记，保持普通字段）。
- 标了 volatile 的字段在 `apply` 第二参里会变成 cosmokit 引用对象（`{ get() }`），统一经
  `snapshot()` 折回普通对象，下游读法不变；写入后从引用重新取权威值。

## [0.1.2] - 2026-08-25

### 新增
- `AGENTS.md` 与设置面板**双向同步**：插件外改文件，面板能读到；面板保存，文件被重写。两个方向都有内容守卫，不会互相触发写入循环。

### 修复
- 关闭「启用」不再清空你手动维护过的 `AGENTS.md`；禁用状态改由提示词组装层过滤承担。
- 启动时若磁盘上已有 `AGENTS.md`，以磁盘内容为准回填设置，不会被默认空值覆盖。
- 文件监听忽略插件自身的写入，UI 保存不会回写回设置。
- 兼容 Windows 上小写或 `null` 文件名的事件（rename 原子写）。
- 超过 1MiB 的 `AGENTS.md` 不回写进设置（与 PUT 校验一致）。

## [0.1.1] - 2026-08-21

- 独立发布：全局/项目 `AGENTS.md` 编辑器、身份与人设注入、运行时上下文抑制、结果通知、通过 bundle patch 重新启用 `agent-instructions`。
