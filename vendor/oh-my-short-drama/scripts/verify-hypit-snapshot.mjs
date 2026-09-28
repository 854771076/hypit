#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function entries(directory) {
  const result = []
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name)
    const name = relative(root, path)
    if (entry.isDirectory()) {
      if (!['.github', '.claude-plugin'].includes(entry.name)) result.push(...await entries(path))
    } else if (name !== 'HYPIT-SNAPSHOT.json' && entry.name !== '.gitignore' && !name.endsWith('.test.mjs')) result.push(path)
  }
  return result
}

export async function snapshotHash() {
  const hash = createHash('sha256')
  for (const path of await entries(root)) {
    hash.update(relative(root, path)).update('\0').update(createHash('sha256').update(await readFile(path)).digest('hex')).update('\0')
  }
  return hash.digest('hex')
}

const snapshot = JSON.parse(await readFile(resolve(root, 'HYPIT-SNAPSHOT.json'), 'utf8'))
const actual = await snapshotHash()
if (!process.argv.includes('--print') && actual !== snapshot.contentTreeSha256) throw new Error(`内置短剧快照哈希不匹配：${actual}`)
if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) console.log(actual)
