#!/usr/bin/env node
import { mkdir, readFile, rename, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'

const wait = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds))

async function owner(lock) {
  try { return JSON.parse(await readFile(resolve(lock, 'owner.json'), 'utf8')) }
  catch (error) { if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null; throw error }
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try { process.kill(pid, 0); return true }
  catch (error) { return error?.code === 'EPERM' }
}

async function refresh(lock, token) {
  if ((await owner(lock))?.token !== token) return false
  const now = new Date()
  await utimes(lock, now, now)
  return true
}

async function reclaim(lock, staleMs) {
  let age
  try { age = Date.now() - (await stat(lock)).mtimeMs }
  catch (error) { if (error?.code === 'ENOENT') return true; throw error }
  if (age <= staleMs || processAlive((await owner(lock))?.pid)) return false
  const recovery = `${lock}.reclaim-${randomUUID()}`
  try { await rename(lock, recovery) }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error }
  await rm(recovery, { recursive: true, force: true })
  return true
}

export async function withFileLock(target, action, { timeoutMs = 10_000, staleMs = 60_000 } = {}) {
  const lock = `${target}.lock`
  const token = randomUUID()
  const deadline = Date.now() + timeoutMs
  await mkdir(dirname(target), { recursive: true })
  while (true) {
    try {
      await mkdir(lock)
      try { await writeFile(resolve(lock, 'owner.json'), JSON.stringify({ token, pid: process.pid }), { flag: 'wx' }) }
      catch (error) { await rm(lock, { recursive: true, force: true }); throw error }
      break
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      let age
      try { age = Date.now() - (await stat(lock)).mtimeMs } catch (statError) { if (statError?.code === 'ENOENT') continue; throw statError }
      if (age > staleMs && await reclaim(lock, staleMs)) continue
      else if (Date.now() >= deadline) throw new Error(`等待文件锁超时：${target}`)
      else await wait(25)
    }
  }
  const heartbeat = setInterval(() => { refresh(lock, token).catch(() => {}) }, Math.max(10, Math.floor(staleMs / 3)))
  heartbeat.unref()
  try { return await action() } finally {
    clearInterval(heartbeat)
    if ((await owner(lock))?.token === token) await rm(lock, { recursive: true, force: true })
  }
}

async function selfCheck() {
  const target = resolve(tmpdir(), `short-drama-lock-${randomUUID()}`)
  let active = 0
  let maximum = 0
  await Promise.all([1, 2, 3].map(() => withFileLock(target, async () => {
    active += 1
    maximum = Math.max(maximum, active)
    await wait(10)
    active -= 1
  })))
  if (maximum !== 1) throw new Error('文件锁自检失败')
  await Promise.all([
    withFileLock(target, async () => { active += 1; maximum = Math.max(maximum, active); await wait(80); active -= 1 }, { staleMs: 30 }),
    (async () => { await wait(40); return withFileLock(target, async () => { active += 1; maximum = Math.max(maximum, active); active -= 1 }, { timeoutMs: 250, staleMs: 30 }) })(),
  ])
  if (maximum !== 1) throw new Error('陈旧锁回收破坏了仍存活持有者的互斥')
  await mkdir(`${target}.lock`)
  const old = new Date(Date.now() - 1000)
  await utimes(`${target}.lock`, old, old)
  await Promise.all([1, 2, 3].map(() => withFileLock(target, async () => {
    active += 1
    maximum = Math.max(maximum, active)
    await wait(10)
    active -= 1
  }, { timeoutMs: 250, staleMs: 30 })))
  if (maximum !== 1) throw new Error('并发陈旧锁回收破坏了互斥')
  console.log('ok')
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes('--self-check')) selfCheck().catch((error) => { console.error(error.message); process.exitCode = 1 })
