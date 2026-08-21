/**
 * @module dsh-global-prompt
 * @description DeepSeek Harness 全局提示词与人设管理插件（宿主端）。
 *
 * 核心能力：
 * 1. 自动从持久化文件 ($DSH_HOME/user/global-prompt.md) 读取系统人设与代码规范；
 * 2. 通过 ctx.systemPrompt.section({ order: -1 }) 注册为全局基础提示词，无论选择何种 Preset 均稳定生效；
 * 3. 注册 REST API (/api/global-prompt)，供 DSH 原生设置面板进行可视化大文本框在线编辑与保存；
 * 4. 保存时原子写入磁盘并即时更新系统提示词 Section，实现「0 重启、秒级生效」。
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

export const name = 'global-prompt'

/** 必须注入 systemPrompt 与 webServer 服务 */
export const inject = ['systemPrompt', 'webServer']

const DEFAULT_SECTION_NAME = 'user:global-prompt'
const DEFAULT_ORDER = -1
const API_PATH = '/api/global-prompt'

/** 获取默认持久化存储路径 */
export function defaultPromptPath() {
  return join(resolveDshHome(), 'user', 'global-prompt.md')
}

/** 读取请求体 JSON */
async function readJson(req, maxBytes = 1048576) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > maxBytes) throw new Error('请求体过大（上限 1MB）')
    chunks.push(buf)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** 发送 JSON 响应 */
function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data ?? {}))
}

/** 从磁盘读取提示词 */
function loadPromptFromDisk(filePath) {
  if (!existsSync(filePath)) return ''
  try {
    return readFileSync(filePath, 'utf8')
  } catch (err) {
    console.error('dsh-global-prompt: 读取提示词文件失败:', err)
    return ''
  }
}

/** 原子保存提示词到磁盘 */
function savePromptToDisk(filePath, content) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmp = `${filePath}.tmp.${Date.now()}`
  writeFileSync(tmp, content, 'utf8')
  renameSync(tmp, filePath)
}

export function apply(ctx, config) {
  config = config ?? {}
  const filePath = config.filePath || defaultPromptPath()
  const sectionName = config.sectionName || DEFAULT_SECTION_NAME
  const order = typeof config.order === 'number' ? config.order : DEFAULT_ORDER

  let currentText = loadPromptFromDisk(filePath)
  let sectionDisposer = null

  // 重新注册/更新全局 systemPrompt Section
  const applySection = () => {
    if (sectionDisposer) {
      sectionDisposer()
      sectionDisposer = null
    }
    const trimmed = (currentText || '').trim()
    if (trimmed.length === 0) return

    sectionDisposer = ctx.systemPrompt.section({
      name: sectionName,
      order: order,
      text: currentText,
    })
  }

  // 绑定生命周期：激活时加载，停止时释放
  ctx.effect(() => {
    applySection()
    return () => {
      if (sectionDisposer) sectionDisposer()
    }
  }, 'dsh-global-prompt: section')

  // ============================================================================
  // 注册 REST API 路由（供 Web 前端原生设置面板在线读取与保存）
  // ============================================================================
  const handleApi = async (req, res) => {
    if (req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        text: currentText,
        path: filePath,
        length: currentText.length,
        order: order,
      })
      return
    }

    if (req.method === 'POST') {
      try {
        const body = await readJson(req)
        const newText = typeof body.text === 'string' ? body.text : ''

        // 1. 原子写入磁盘持久化
        savePromptToDisk(filePath, newText)

        // 2. 更新内存并重新应用 Section，即时对所有后续会话生效
        currentText = newText
        applySection()

        sendJson(res, 200, {
          ok: true,
          message: '全局提示词已保存并即时生效',
          length: currentText.length,
        })
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
      return
    }

    sendJson(res, 405, { ok: false, error: 'Method Not Allowed' })
  }

  ctx.effect(() => {
    return ctx.webServer.register({
      kind: 'exact',
      path: API_PATH,
      handler: handleApi,
    })
  }, 'dsh-global-prompt: api')
}
