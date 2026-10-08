import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('媒体快照保留尚未选版的生成候选', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'short-drama-evidence-'))
  try {
    await mkdir(resolve(root, '.short-drama'), { recursive: true })
    await writeFile(resolve(root, '.short-drama/assets.json'), JSON.stringify({ version: 1, assets: {
      'shot-ep001-001': { type: 'video', selectedVersionId: null, staleVersionIds: [], versions: [{ id: 'v001', localPath: 'assets/videos/shot-ep001-001/v001.mp4' }] },
    } }))
    await writeFile(resolve(root, '.short-drama/shot-reviews.json'), JSON.stringify({ version: 1, reviews: {} }))
    const result = spawnSync(process.execPath, [resolve(import.meta.dirname, 'snapshot-stage-evidence.mjs'), root, 'media-production'], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    const evidence = JSON.parse(await readFile(resolve(root, result.stdout.trim()), 'utf8'))
    assert.equal(evidence.assets['shot-ep001-001'].candidates[0].id, 'v001')
  } finally { await rm(root, { recursive: true, force: true }) }
})
