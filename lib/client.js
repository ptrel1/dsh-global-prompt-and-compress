window.__ModuleLoader__.load({ id: 'dsh-global-prompt', factory: (require) => {
  const module = { exports: {} };
  const React = require('react');
  const NS = 'desktop.globalPrompt';
  const dictionaries = {
    zh: { nav:'全局提示词', loading:'正在读取设置...', global:'全局', project:'项目', notify:'通知', enabled:'启用全局提示词功能', identity:'身份注入', identityHint:'勾上后，每次对话开头会加一句「我是 DeepSeek Harness」。默认不勾。', personaEnabled:'人设注入', personaHint:'勾上后，你写的人设会一直拼在对话里。支持 {{model}} 和 {{cwd}} 两个占位符。不勾 = 不注入。', oneClick:'一键填默认提示词', globalHint:'写在这里的内容，每次对话都会自动带上。改完点保存，马上生效。', globalPlaceholder:'在这里写全局规则，例如：\n\n- 用中文回答\n- 先想清楚再动手', includeRuntimeContext:'附带会话信息', includeRuntimeContextHint:'勾上后，每次对话会额外带上当前会话的信息（工作目录、状态等）。默认不勾。', projectDir:'项目工作区', projectHint:'只对某个工作区生效的规则，存在那个工作区的 AGENTS.md 里。', read:'读取', saveProject:'保存到该工作区', resultNotify:'任务结果桌面通知', notifyHelp:'任务做完或失败时，弹个通知提醒你，点它能回到对应会话。桌面客户端用系统通知；用浏览器打开时走网页通知。', allowNotify:'允许浏览器通知', notifyAllowed:'浏览器通知已允许', notifyDenied:'浏览器通知未允许', save:'保存', saving:'保存中...', saved:'已保存，马上生效。', failed:'保存失败', projectSaved:'已保存。', refresh:'刷新', refreshed:'已刷新。' },
    en: { nav:'Global prompt', loading:'Loading settings...', global:'Global', project:'Project', notify:'Notifications', enabled:'Enable global prompt', identity:'Identity injection', identityHint:'When on, each conversation starts with a line saying "I am DeepSeek Harness". Off by default.', personaEnabled:'Persona injection', personaHint:'When on, the persona you write is always included in conversations. Supports {{model}} and {{cwd}} placeholders. Off = not injected.', oneClick:'Fill default prompt with one click', globalHint:'Whatever you write here is added to every conversation. Save applies it right away.', globalPlaceholder:'Write global rules here, e.g.:\n\n- Answer in Chinese\n- Think before acting', includeRuntimeContext:'Include session info', includeRuntimeContextHint:'When on, each conversation carries extra info about the current session (working directory, state). Off by default.', projectDir:'Project workspace', projectHint:'Rules for one workspace only, stored in that workspace\'s AGENTS.md.', read:'Load', saveProject:'Save to workspace', resultNotify:'Job result notifications', notifyHelp:'Get a notification when a task finishes or fails; clicking it returns to that conversation. Desktop uses system notifications; plain Web uses browser notifications.', allowNotify:'Allow browser notifications', notifyAllowed:'Browser notifications allowed', notifyDenied:'Browser notifications not allowed', save:'Save', saving:'Saving...', saved:'Saved, applied right away.', failed:'Save failed', projectSaved:'Saved.', refresh:'Reload', refreshed:'Reloaded.' },
  };
  const css = `.ddp{color:var(--dsw-alias-label-primary);max-width:760px}.ddp-tabs{display:flex;gap:6px;margin-bottom:18px}.ddp button,.ddp input,.ddp textarea,.ddp select{font:inherit}.ddp-tab,.ddp-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:inherit;border-radius:8px;padding:7px 12px;cursor:pointer}.ddp-tab[aria-selected=true],.ddp-btn.primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-layer-1)}.ddp-field{display:flex;flex-direction:column;gap:6px;margin:14px 0}.ddp textarea,.ddp input[type=text],.ddp select{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:inherit;border-radius:8px;padding:9px}.ddp textarea{min-height:150px;resize:vertical}.ddp-row{display:flex;gap:9px;align-items:center;margin:12px 0}.ddp-muted{color:var(--dsw-alias-label-tertiary);font-size:12px}.ddp-actions{display:flex;gap:8px;align-items:center;margin-top:14px}`;
  if (!document.querySelector('style[data-plugin-css="ddp"]')) { const style=document.createElement('style'); style.dataset.pluginCss='ddp'; style.textContent=css; document.head.appendChild(style); }

  function apply(ctx) {
    const api = ctx.get('connection').api;
    ctx.effect(() => ctx.locale.register(NS, dictionaries), 'desktop-global-prompt: locale');
    const t = ctx.locale.bind(NS);
    function Page() {
      const [, rerender] = React.useReducer((x) => x + 1, 0);
      const [tab, setTab] = React.useState('global');
      const [state, setState] = React.useState(null);
      const [status, setStatus] = React.useState('');
      const [project, setProject] = React.useState({ workspaceId:'', text:'', workspaces:[] });
      React.useEffect(() => ctx.locale.subscribe(rerender), []);
      // 重读配置与工作区列表:挂载时调用一次,刷新按钮也走这里。失败置 null 显示 loading 态。
      const load = React.useCallback(async () => {
        try {
          const [globalRes, listRes] = await Promise.all([
            fetch('/api/desktop-global-prompt'),
            api.workspace.list({}),
          ]);
          setState(await globalRes.json());
          const rows = listRes.result?.value?.items || [];
          setProject((p) => ({ ...p, workspaces:rows, workspaceId:p.workspaceId || rows[0]?.workspaceId || '' }));
        } catch { setState(null); }
      }, []);
      React.useEffect(() => { load(); }, [load]);
      if (!state) return React.createElement('p', null, t('loading'));
      const set = (key, value) => setState({ ...state, [key]:value });
      const save = async () => { setStatus(t('saving')); try { const r=await fetch('/api/desktop-global-prompt',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state)}); setStatus(r.ok?t('saved'):(await r.json().catch(()=>({}))).error||t('failed')); } catch { setStatus(t('failed')); } };
      // 从服务端重读(外部改过 AGENTS.md 时,服务端已回写 settings,这里拉到最新)
      const refresh = async () => { setStatus(t('saving')); await load(); setStatus(t('refreshed')); };
      const projectLoad = async () => { try { const r=await fetch('/api/desktop-project-instructions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({workspaceId:project.workspaceId})}); if(r.ok){const value=await r.json();setProject({...project,text:value.text});}else setStatus(t('failed')); } catch { setStatus(t('failed')); } };
      const projectSave = async () => { try { const r=await fetch('/api/desktop-project-instructions',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({workspaceId:project.workspaceId,text:project.text})}); setStatus(r.ok?t('projectSaved'):(await r.json().catch(()=>({}))).error||t('failed')); } catch { setStatus(t('failed')); } };
      let content;
      if (tab === 'global') content=React.createElement(React.Fragment,null,
        React.createElement('label',{className:'ddp-row'},React.createElement('input',{type:'checkbox',checked:state.enabled,onChange:(e)=>set('enabled',e.target.checked)}),t('enabled')),
        React.createElement('label',{className:'ddp-field'},'AGENTS.md',React.createElement('textarea',{value:state.globalPrompt,onChange:(e)=>set('globalPrompt',e.target.value),placeholder:t('globalPlaceholder')}),React.createElement('span',{className:'ddp-muted'},t('globalHint')),React.createElement('span',{className:'ddp-muted'},state.agentsPath)),
        React.createElement('div',{className:'ddp-field'},
          React.createElement('label',{className:'ddp-row'},React.createElement('input',{type:'checkbox',checked:state.includeHarnessIdentity,onChange:(e)=>set('includeHarnessIdentity',e.target.checked),disabled:!state.enabled}),t('identity')),
          React.createElement('span',{className:'ddp-muted'},t('identityHint'))),
        React.createElement('div',{className:'ddp-field'},
          React.createElement('label',{className:'ddp-row'},React.createElement('input',{type:'checkbox',checked:state.personaEnabled,onChange:(e)=>set('personaEnabled',e.target.checked),disabled:!state.enabled}),t('personaEnabled')),
          React.createElement('span',{className:'ddp-muted'},t('personaHint'))),
        React.createElement('label',{className:'ddp-field'},'Persona',React.createElement('textarea',{value:state.persona,onChange:(e)=>set('persona',e.target.value),disabled:!state.enabled||!state.personaEnabled})),
        React.createElement('div',{className:'ddp-field'},
          React.createElement('label',{className:'ddp-row'},React.createElement('input',{type:'checkbox',checked:state.includeRuntimeContext,onChange:(e)=>set('includeRuntimeContext',e.target.checked),disabled:!state.enabled}),t('includeRuntimeContext')),
          React.createElement('span',{className:'ddp-muted'},t('includeRuntimeContextHint'))),
        React.createElement('button',{className:'ddp-btn',disabled:!state.enabled,onClick:()=>setState({...state,includeHarnessIdentity:true,personaEnabled:true,persona:'You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.'})},t('oneClick')));
      else if (tab === 'project') content=React.createElement(React.Fragment,null,
        React.createElement('label',{className:'ddp-field'},t('projectDir'),
          React.createElement('select',{value:project.workspaceId,onChange:(e)=>setProject({...project,workspaceId:e.target.value})},
            ...project.workspaces.map((w)=>React.createElement('option',{key:w.workspaceId,value:w.workspaceId},w.title||w.path))),
          React.createElement('span',{className:'ddp-muted'},t('projectHint'))),
        React.createElement('button',{className:'ddp-btn',onClick:projectLoad,disabled:!project.workspaceId},t('read')),
        React.createElement('label',{className:'ddp-field'},'AGENTS.md',
          React.createElement('textarea',{value:project.text,onChange:(e)=>setProject({...project,text:e.target.value})})),
        React.createElement('button',{className:'ddp-btn primary',onClick:projectSave,disabled:!project.workspaceId},t('saveProject')));
      else content=React.createElement(React.Fragment,null,
        React.createElement('label',{className:'ddp-row'},React.createElement('input',{type:'checkbox',checked:state.notifyResult,onChange:(e)=>set('notifyResult',e.target.checked),disabled:!state.enabled}),t('resultNotify')),
        React.createElement('p',{className:'ddp-muted'},t('notifyHelp')),
        !window.dshShell&&globalThis.Notification&&Notification.permission!=='granted'?React.createElement('button',{className:'ddp-btn',onClick:async()=>setStatus((await Notification.requestPermission())==='granted'?t('notifyAllowed'):t('notifyDenied'))},t('allowNotify')):null);
      const labels={global:t('global'),project:t('project'),notify:t('notify')};
      return React.createElement('div',{className:'ddp'},React.createElement('div',{className:'ddp-tabs'},...Object.keys(labels).map((id)=>React.createElement('button',{key:id,className:'ddp-tab','aria-selected':tab===id,onClick:()=>setTab(id)},labels[id]))),content,React.createElement('div',{className:'ddp-actions'},tab==='project'?null:React.createElement('button',{className:'ddp-btn primary',onClick:save},t('save')),React.createElement('button',{className:'ddp-btn',onClick:refresh},t('refresh')),React.createElement('span',{className:'ddp-muted'},status)));
    }
    ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'desktop-global-prompt',order:8,label:()=>t('nav')},Page));
    if(!window.dshShell&&globalThis.Notification){let previous=new Map();const seed=ctx.sessions.list.getSnapshot();for(const id of seed.ids)previous.set(id,seed.byId[id]?.running===true);ctx.effect(()=>ctx.sessions.list.subscribe(async()=>{const snapshot=ctx.sessions.list.getSnapshot();for(const id of snapshot.ids){const row=snapshot.byId[id];const was=previous.get(id)===true;previous.set(id,row?.running===true);if(!was||row?.running!==false)continue;try{const config=await fetch('/api/desktop-global-prompt').then(r=>r.json());if(!config.enabled||!config.notifyResult||Notification.permission!=='granted')continue;const n=new Notification('DeepSeek Harness',{body:row.displayTitle||t('resultNotify')});n.onclick=()=>{window.focus();ctx.sessions.open(id);n.close()}}catch{}}}),'desktop-global-prompt: browser notifications')}
    registerCompactButton(ctx);
  }

  // ---- 附带小工具:会话压缩按钮 ----
  // (原 dsh-manual-compact 收纳进本插件,20260903;逻辑 1:1 等价迁移)
  // 输入区右侧一键转发内置 /compact;提交中/压缩中禁用;成功绿/失败红。
  // 注意:真实失败原因(如 provider 余额不足)只写会话日志 compaction/end 事件,UI 不回显。
  function registerCompactButton(ctx) {
    const UIPrim = require('@deepseek-ai/dsh-client-ui-primitives');
    const h = React.createElement;
    if (!document.querySelector('style[data-plugin-css="dgp-compact"]')) {
      const s = document.createElement('style'); s.dataset.pluginCss = 'dgp-compact';
      s.textContent = '.dgpC_root{display:inline-flex;position:relative}.dgpC_trigger{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:999px;flex:none;place-items:center;display:grid}.dgpC_trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dgpC_trigger:disabled{cursor:default;opacity:.4}.dgpC_trigger.dgpC_done{color:var(--dsw-static-green-500,var(--dsw-static-neutral-bluish-400))}.dgpC_trigger.dgpC_failed{color:var(--dsw-static-red-500,var(--dsw-alias-danger,var(--dsw-alias-label-secondary)))}';
      document.head.appendChild(s);
    }
    const Icon = () => h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true },
      h('path', { d: 'M5 5.5 2.5 8 5 10.5M11 5.5 13.5 8 11 10.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      h('path', { d: 'M2 13.5h12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }));
    const makeCompact = (ctx, target) => async () => {
      const session = ctx.sessions?.binding?.(target)?.session;
      if (session === undefined) return false;
      const r = await session.command('/compact');
      return !!(r && r.ok && r.value && r.value.matched);
    };
    function CompactButton({ sessionId, compact, useInput }) {
      const input = useInput((e) => e);
      const [busy, setBusy] = React.useState(false);
      const [done, setDone] = React.useState(false);
      const [failed, setFailed] = React.useState(false);
      React.useEffect(() => { setDone(false); setFailed(false); }, [sessionId, input && input.phase]);
      if (input === undefined) return null;
      const running = input.phase === 'adjudicating' || input.phase === 'claimed' || input.phase === 'submitting';
      const disabled = busy || running;
      const onClick = () => {
        if (disabled) return; setBusy(true); setFailed(false);
        compact().then((ok) => { setBusy(false); ok ? setDone(true) : setFailed(true); })
          .catch(() => { setBusy(false); setFailed(true); });
      };
      const label = done ? '已压缩' : failed ? '压缩失败，请稍后重试' : '压缩上下文';
      return h('span', { className: 'dgpC_root' },
        h(UIPrim.Tooltip, { label, side: 'top', delayMs: 200 },
          h('button', { type: 'button', className: 'dgpC_trigger' + (done ? ' dgpC_done' : '') + (failed ? ' dgpC_failed' : ''), 'aria-label': label, disabled, onClick },
            h(Icon, null))));
    }
    ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
      name: 'conversation.input.right', id: 'global-prompt-compact', order: 95,
      inject: (target) => ({ sessionId: String(target), compact: makeCompact(ctx, target) })
    }, CompactButton));
  }
  module.exports={apply,inject:['slots','locale','sessions','connection']};
  return module.exports;
}});
