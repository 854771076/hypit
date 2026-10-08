import assert from 'node:assert/strict'
import test from 'node:test'

import { createHypitBuildOutputValidator } from './validate-project.mjs'

test('同一 Build 的多个 Output 只检查一次', () => {
  let calls = 0
  const valid = createHypitBuildOutputValidator((buildId) => {
    calls += 1
    return { format: 'hypit.cli-inspect@1', build: { id: buildId, outcome: 'complete', outputs: [
      { name: 'shot-001.video', target: true, kind: 'resource' },
      { name: 'shot-002.video', target: true, kind: 'resource' },
    ] } }
  })
  assert.equal(valid('build-1', 'shot-001.video'), true)
  assert.equal(valid('build-1', 'shot-002.video'), true)
  assert.equal(valid('build-1', 'missing.video'), false)
  assert.equal(calls, 1)
})
