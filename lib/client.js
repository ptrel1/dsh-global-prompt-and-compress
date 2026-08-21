/**
 * ============================================================================
 * dsh-global-prompt 浏览器半侧（Web client bundle）
 * ============================================================================
 *
 * 将「全局提示词」以原生大文本框编辑器的形式无缝注入 DSH 设置面板（settings.section 插槽）。
 * 支持快捷键 Ctrl+S 保存、字数统计、浅色/暗黑模式自适应。
 */

window.__ModuleLoader__.load({
	id: 'dsh-global-prompt',
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		const React = require('react');
		const { useEffect, useState, useCallback, useRef, createElement: e } = React;

		// ============================================================================
		// 内联 CSS 样式注入（自适应 DSH 浅色与暗黑模式）
		// ============================================================================
		const css = `
			.dgp-root { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; font-family: system-ui, -apple-system, sans-serif; }
			.dgp-card { background: var(--dsw-card-bg, #ffffff); border: 1px solid var(--dsw-border, #e5e7eb); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
			.dgp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
			.dgp-title { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; color: var(--dsw-text-main, #111827); }
			.dgp-desc { font-size: 13px; color: var(--dsw-text-sub, #6b7280); margin: 0; line-height: 1.5; }
			
			.dgp-meta-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; background: var(--dsw-badge-bg, #f3f4f6); color: var(--dsw-text-sub, #4b5563); }
			
			.dgp-editor-wrap { position: relative; width: 100%; border: 1px solid var(--dsw-border, #d1d5db); border-radius: 8px; overflow: hidden; background: var(--dsw-editor-bg, #fafafa); transition: border-color 0.2s; }
			.dgp-editor-wrap:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
			
			.dgp-textarea { width: 100%; min-height: 380px; max-height: 600px; padding: 14px 16px; box-sizing: border-box; border: 0; outline: none; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; background: transparent; color: var(--dsw-text-main, #111827); }
			
			.dgp-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
			.dgp-stat { font-size: 12px; color: var(--dsw-text-sub, #6b7280); display: flex; gap: 12px; align-items: center; }
			
			.dgp-btn-group { display: flex; gap: 8px; align-items: center; }
			.dgp-btn { padding: 8px 16px; border: 0; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s, transform 0.05s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
			.dgp-btn:active { transform: scale(0.98); }
			.dgp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
			.dgp-btn-primary { background: #2563eb; color: #ffffff; }
			.dgp-btn-primary:hover { background: #1d4ed8; }
			.dgp-btn-outline { background: transparent; border: 1px solid var(--dsw-border, #d1d5db); color: var(--dsw-text-main, #374151); }
			.dgp-btn-outline:hover { background: var(--dsw-hover-bg, #f3f4f6); }
			
			.dgp-msg { padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-top: 10px; }
			.dgp-msg-ok { background: #dcfce7; color: #166534; }
			.dgp-msg-err { background: #fee2e2; color: #991b1b; }
			
			/* 暗黑模式适配 */
			body[data-ds-dark-theme] .dgp-card { --dsw-card-bg: #1e1e20; --dsw-border: #333336; }
			body[data-ds-dark-theme] .dgp-title { --dsw-text-main: #f3f4f6; }
			body[data-ds-dark-theme] .dgp-desc { --dsw-text-sub: #9ca3af; }
			body[data-ds-dark-theme] .dgp-meta-badge { --dsw-badge-bg: #27272a; --dsw-text-sub: #a1a1aa; }
			body[data-ds-dark-theme] .dgp-editor-wrap { --dsw-editor-bg: #141416; --dsw-border: #444448; }
			body[data-ds-dark-theme] .dgp-textarea { --dsw-text-main: #f9fafb; }
			body[data-ds-dark-theme] .dgp-btn-outline { --dsw-border: #444448; --dsw-text-main: #d1d5db; }
			body[data-ds-dark-theme] .dgp-btn-outline:hover { --dsw-hover-bg: #2d2d30; }
		`;

		const cssTag = 'dsh-global-prompt/client.css';
		if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css="' + cssTag + '"]')) {
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-global-prompt';
			tag.dataset.pluginCss = cssTag;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		// ============================================================================
		// React 全局提示词设置面板核心组件
		// ============================================================================
		function GlobalPromptSection() {
			const [text, setText] = useState('');
			const [initialText, setInitialText] = useState('');
			const [filePath, setFilePath] = useState('');
			const [loading, setLoading] = useState(true);
			const [saving, setSaving] = useState(false);
			const [notice, setNotice] = useState(null);
			const textareaRef = useRef(null);

			const showNotice = (msg, isErr = false) => {
				setNotice({ text: msg, isErr: isErr });
				setTimeout(() => setNotice(null), 4000);
			};

			const loadData = useCallback(async () => {
				try {
					setLoading(true);
					const res = await fetch('/api/global-prompt');
					if (!res.ok) throw new Error('读取全局提示词失败 (' + res.status + ')');
					const data = await res.json();
					setText(data.text || '');
					setInitialText(data.text || '');
					setFilePath(data.path || '');
				} catch (err) {
					showNotice(err.message, true);
				} finally {
					setLoading(false);
				}
			}, []);

			useEffect(() => {
				loadData();
			}, [loadData]);

			const handleSave = async () => {
				try {
					setSaving(true);
					const res = await fetch('/api/global-prompt', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ text: text }),
					});
					const data = await res.json();
					if (!res.ok || !data.ok) throw new Error(data.error || '保存失败');
					setInitialText(text);
					showNotice('✅ 全局提示词已保存并即时生效（当前 ' + (text.length) + ' 字符）');
				} catch (err) {
					showNotice('❌ ' + err.message, true);
				} finally {
					setSaving(false);
				}
			};

			// 快捷键 Ctrl+S / Cmd+S 支持
			const handleKeyDown = (ev) => {
				if ((ev.ctrlKey || ev.metaKey) && ev.key === 's') {
					ev.preventDefault();
					handleSave();
				}
			};

			const hasChanged = text !== initialText;

			return e('div', { className: 'dgp-root' },
				e('div', { className: 'dgp-card' },
					e('div', { className: 'dgp-header' },
						e('div', null,
							e('h3', { className: 'dgp-title' }, '全局系统提示词 (Global Prompt)'),
							e('p', { className: 'dgp-desc' },
								'在此设置的代码专家规范、常用路径与团队约定，会在每个 Agent 会话开始时自动注入（权重 order: -1，置顶底色），切换任意预设均稳定生效。'
							)
						),
						e('div', { className: 'dgp-meta-badge' }, '生效层级: order -1 (底色置顶)')
					),

					loading
						? e('div', { style: { padding: '40px', textAlign: 'center', color: '#6b7280' } }, '正在读取提示词文件...')
						: e('div', { className: 'dgp-editor-wrap' },
							e('textarea', {
								ref: textareaRef,
								className: 'dgp-textarea',
								value: text,
								onChange: (e) => setText(e.target.value),
								onKeyDown: handleKeyDown,
								placeholder: '在此输入或粘贴 Markdown 格式的全局系统提示词规范（支持 Ctrl+S 快捷保存）...',
								spellCheck: false,
							})
						),

					e('div', { className: 'dgp-footer' },
						e('div', { className: 'dgp-stat' },
							e('span', null, '字数: ' + text.length + ' 字符'),
							filePath && e('span', { style: { color: 'var(--dsw-text-sub, #9ca3af)' } }, '持久化路径: ' + filePath),
							hasChanged && e('span', { style: { color: '#eab308', fontWeight: 500 } }, '● 有未保存修改')
						),
						e('div', { className: 'dgp-btn-group' },
							e('button', {
								type: 'button',
								className: 'dgp-btn dgp-btn-outline',
								onClick: () => {
									if (hasChanged && !window.confirm('放弃当前未保存的修改并重新读取文件吗？')) return;
									loadData();
								},
								disabled: loading || saving,
							}, '重新加载'),
							e('button', {
								type: 'button',
								className: 'dgp-btn dgp-btn-primary',
								onClick: handleSave,
								disabled: loading || saving || !hasChanged,
							}, saving ? '正在保存...' : '保存并即时生效 (Ctrl+S)')
						)
					),

					notice && e('div', { className: 'dgp-msg ' + (notice.isErr ? 'dgp-msg-err' : 'dgp-msg-ok') }, notice.text)
				)
			);
		}

		// ============================================================================
		// Cordis 客户端插件生命周期注册
		// ============================================================================
		const name = 'global-prompt';
		const inject = ['slots'];

		function apply(ctx, config) {
			// 将「全局提示词」作为独立的分类大页面注入至 DSH 主设置面板（settings.section）
			ctx.slots.inject('settings.section', function* () {
				yield ctx.slots.register({
					name: 'settings.section',
					id: 'global-prompt',
					order: 25, // 排在「模型」之后、「插件」之前
					label: () => '全局提示词',
				}, (ownerProps) => e(GlobalPromptSection, Object.assign({ config: config }, ownerProps)));
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	},
});
