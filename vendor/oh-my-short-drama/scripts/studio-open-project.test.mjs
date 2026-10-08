import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { openProjectStudio } from './studio.mjs'

test('Dashboard 按 project.key 打开目录名不同的现有项目', async (context) => {
  const workspace = await mkdtemp(join(tmpdir(), 'short-drama-studio-'))
  context.after(async () => rm(workspace, { recursive: true, force: true }))
  const project = join(workspace, 'workspace-name')
  await mkdir(join(project, '.short-drama'), { recursive: true })
  await writeFile(join(project, '.short-drama/project.json'), JSON.stringify({ key: 'different-id', workflow: { type: 'standard' } }))
  const result = await openProjectStudio(project, {
    openStudioFn: async (root, route) => {
      assert.equal(root, dirname(project))
      return `http://127.0.0.1:4173${route}`
    },
  })
  assert.match(result.url, /#\/projects\/different-id\/overview$/u)
})
