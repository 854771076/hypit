#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rawArgs = process.argv.slice(2)
const args = new Set(rawArgs)
const mode = rawArgs[0] || 'check'
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const distributionPath = resolve(repositoryRoot, 'package.json')
const distribution = existsSync(distributionPath) ? JSON.parse(await readFile(distributionPath, 'utf8')) : null
const installedVersion = spawnSync('hypit', ['version'], { encoding: 'utf8' }).stdout?.match(/\d+\.\d+\.\d+/)?.[0] || null
const hypitVersion = process.env.SHORT_DRAMA_HYPIT_VERSION || distribution?.version || installedVersion
const hypitSkillSource = process.env.SHORT_DRAMA_HYPIT_SKILL_SOURCE || (distribution ? repositoryRoot : null)
const projectIndex = rawArgs.indexOf('--project-root')
const projectArg = projectIndex >= 0 ? rawArgs[projectIndex + 1] : null
const projectRoot = projectArg ? resolve(projectArg) : null
if (!['check', 'ensure', '--self-check'].includes(mode)) throw new Error('用法：ensure-hypit.mjs check|ensure')
if (projectIndex >= 0 && !projectRoot) throw new Error('--project-root 必须提供路径')

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return { ok: result.status === 0, stdout: result.stdout?.trim() || '', stderr: result.stderr?.trim() || '' }
}

function executableStatus() {
  const result = run('hypit', ['version'])
  const paths = result.ok ? run('hypit', ['paths']) : { ok: false, stdout: '', stderr: '' }
  const version = result.ok ? result.stdout : null
  const matches = Boolean(version && new RegExp(`(^|\\D)v?${hypitVersion.replaceAll('.', '\\.')}(?=$|\\D)`).test(version))
  return { installed: result.ok && paths.ok && matches, expected_version: hypitVersion, version, paths: paths.ok ? paths.stdout : null, error: result.ok && paths.ok && matches ? null : result.stderr || paths.stderr || `Hypit 版本不匹配，期望 ${hypitVersion}` }
}

function hasHypitSkill(output) {
  try { return JSON.parse(output).some((item) => item?.name === 'hypit') } catch { return false }
}

function skillStatus() {
  const direct = run('skills', ['list', '-g', '--json'])
  const result = direct.ok ? direct : run('npx', ['--no-install', 'skills', 'list', '-g', '--json'])
  const installed = result.ok && hasHypitSkill(result.stdout)
  return { installed, output: result.stdout, error: result.ok ? null : result.stderr || '找不到 skills CLI；ensure 模式会通过 npx 安装本地 Skill' }
}

function installSkill() {
  if (!hypitSkillSource) throw new Error('独立插件无法定位 Hypit Skill 源码；请设置 SHORT_DRAMA_HYPIT_SKILL_SOURCE')
  const result = run('npx', ['--yes', 'skills', 'add', hypitSkillSource, '--skill', 'hypit', '--global', '--yes', '--copy'])
  if (!result.ok) throw new Error(`安装 Hypit Skill 失败：${result.stderr || result.stdout}`)
}

function installExecutable() {
  if (!distribution) throw new Error('独立插件无法定位 Hypit 安装包；请先安装 hypit 或从 Hypit 集成仓库执行')
  const result = run('npm', ['install', '--global', repositoryRoot, '--ignore-scripts'])
  if (!result.ok) throw new Error(`安装 Hypit 可执行程序失败：${result.stderr || result.stdout}`)
}

if (mode === '--self-check') {
  if (!/^\d+\.\d+\.\d+/.test(hypitVersion || '') || distribution && hypitSkillSource !== repositoryRoot || !hasHypitSkill('[{"name":"hypit"}]') || hasHypitSkill('\u001b[36mhypit')) throw new Error('Hypit 本地安装合同自检失败')
  console.log('ok')
  process.exit(0)
}

let executable = executableStatus()
let skill = skillStatus()
if (mode === 'ensure') {
  if (!skill.installed) {
    installSkill()
    skill = skillStatus()
  }
  if (!executable.installed) {
    installExecutable()
    executable = executableStatus()
  }
  if (!skill.installed || !executable.installed) throw new Error('Hypit 安装后仍未通过环境检查')
}

const report = { schema_version: 1, executable, skill: { ...skill, expected_source: hypitSkillSource }, next: executable.installed && skill.installed ? 'ready' : 'run ensure to install missing components' }
if (projectRoot && mode === 'ensure') {
  const reportPath = resolve(projectRoot, '.short-drama/hypit/ready.json')
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  report.project_report = '.short-drama/hypit/ready.json'
}
console.log(JSON.stringify(report, null, 2))
