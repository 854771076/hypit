import assert from 'node:assert/strict'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { hasCommand } from './preflight.mjs'

test('命令探测支持 Windows PATH 与 PATHEXT，不依赖 POSIX shell', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'short-drama-preflight-'))
  context.after(async () => rm(root, { recursive: true, force: true }))
  const executable = join(root, 'ffmpeg.CMD')
  await writeFile(executable, '')
  await chmod(executable, 0o755)
  assert.equal(await hasCommand('ffmpeg', { Path: root, PATHEXT: '.EXE;.CMD' }, 'win32'), true)
  assert.equal(await hasCommand('missing', { Path: root, PATHEXT: '.EXE;.CMD' }, 'win32'), false)
})
