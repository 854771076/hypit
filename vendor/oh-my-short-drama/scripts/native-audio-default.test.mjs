import assert from 'node:assert/strict'
import test from 'node:test'

import { usesNativeAudio } from './audio-prompt-policy.mjs'

test('镜头音频默认原生，仅显式后配时关闭', () => {
  assert.equal(usesNativeAudio(undefined), true)
  assert.equal(usesNativeAudio({}), true)
  assert.equal(usesNativeAudio({ mode: 'native' }), true)
  assert.equal(usesNativeAudio({ mode: 'post-dub' }), false)
  assert.equal(usesNativeAudio({ lines: [{ delivery_mode: 'native' }] }), true)
  assert.equal(usesNativeAudio({ lines: [{ delivery_mode: 'post_dub' }] }), false)
})
