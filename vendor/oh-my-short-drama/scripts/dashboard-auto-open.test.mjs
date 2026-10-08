import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'

import { autoOpenProjectDashboard, findProjectRoot } from './dashboard-auto-open.mjs'

test('已有项目恢复时从任意子目录打开项目 Dashboard 精确路由', async (context) => {
  const workspace = await mkdtemp(resolve(tmpdir(), 'short-drama-dashboard-resume-'))
  context.after(async () => rm(workspace, { recursive: true, force: true }))
  const project = resolve(workspace, 'custom-project')
  const nested = resolve(project, 'episodes/ep-001')
  await mkdir(resolve(project, '.short-drama'), { recursive: true })
  await mkdir(nested, { recursive: true })
  await writeFile(resolve(project, '.short-drama/project.json'), `${JSON.stringify({ key: 'custom-project', workflow: { type: 'viral-recreation' } })}\n`)

  assert.equal(await findProjectRoot(nested), project)
  const calls = []
  const result = await autoOpenProjectDashboard(nested, {
    openProjectStudioFn: async (root) => { calls.push(root); return { url: 'http://127.0.0.1:4173/#/projects/custom-project/overview' } },
  })
  assert.deepEqual(calls, [project])
  assert.equal(result.url, 'http://127.0.0.1:4173/#/projects/custom-project/overview')
})

test('非短剧目录不会启动 Dashboard', async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), 'short-drama-dashboard-none-'))
  context.after(async () => rm(directory, { recursive: true, force: true }))
  let opened = false
  assert.equal(await autoOpenProjectDashboard(directory, { openProjectStudioFn: async () => { opened = true } }), null)
  assert.equal(opened, false)
})

test('SessionStart 只在启动或恢复时自动开窗，compact 只恢复上下文', async () => {
  const hooks = JSON.parse(await readFile(resolve(import.meta.dirname, '../hooks/hooks.json'), 'utf8')).hooks.SessionStart
  const dashboard = hooks.find((entry) => entry.hooks?.some((hook) => hook.command.includes('dashboard-auto-open.mjs')))
  assert.equal(dashboard.matcher, 'startup|resume')
  assert.equal(dashboard.hooks.length, 1)
  const context = hooks.find((entry) => entry.hooks?.some((hook) => hook.command.includes('session-context.mjs')))
  assert.equal(context.matcher, 'startup|resume|compact')
})

test('项目初始化统一调用自动打开入口且 Dashboard 内部创建不会重复开窗', async () => {
  const source = await readFile(resolve(import.meta.dirname, 'project-store.mjs'), 'utf8')
  assert.match(source, /autoOpenProjectDashboard\(root\)/u)
  assert.match(source, /SHORT_DRAMA_STUDIO_ACTIVE !== '1'/u)
  assert.doesNotMatch(source, /dirname\(root\) === DEFAULT_WORKSPACE_ROOT/u)
})
