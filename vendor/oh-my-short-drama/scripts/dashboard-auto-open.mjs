#!/usr/bin/env node
import { access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { openProjectStudio } from './studio.mjs'

export async function findProjectRoot(start) {
  let current = resolve(start)
  while (true) {
    try {
      await access(resolve(current, '.short-drama/project.json'))
      return current
    } catch {}
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

export async function autoOpenProjectDashboard(start = process.cwd(), options = {}) {
  const root = await findProjectRoot(start)
  if (!root) return null
  return await (options.openProjectStudioFn || openProjectStudio)(root)
}

async function main() {
  const result = await autoOpenProjectDashboard(process.argv[2] || process.cwd())
  if (result) console.log(JSON.stringify(result, null, 2))
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch((error) => {
  console.error(`Dashboard 自动打开失败：${error.message}`)
  process.exitCode = 1
})
