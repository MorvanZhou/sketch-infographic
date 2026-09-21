#!/usr/bin/env node
/**
 * init.mjs — 在目标项目里初始化一套可独立运行的绘图脚本
 *
 * 用法：
 *   node <skill>/scripts/init.mjs <target-dir> [--name figures] [--force]
 *
 * 做的事：把绘图库、完整 Lucide 图标数据、SVG lint、渲染器和单图种子复制到 <target-dir>。
 * 复制之后，目标项目不再依赖本 skill 的路径，`node render.mjs figures.mjs --png`
 * 就能出图，也可以直接提交进那个项目的仓库。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, '..');

function parseArgs(argv) {
  const args = { target: null, name: 'figures', force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--name') args.name = argv[++i];
    else if (a === '--force') args.force = true;
    else if (!a.startsWith('--') && !args.target) args.target = a;
  }
  return args;
}

/** 仅允许安全文件名，防止 --name 通过 ../ 写出目标目录 */
function assertSafeSlug(value, label) {
  if (!value || typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) {
    throw new Error(`${label} 只能包含字母、数字、点、下划线和连字符，收到: ${value}`);
  }
  if (value === '.' || value === '..') {
    throw new Error(`${label} 非法: ${value}`);
  }
}

function assertInside(base, candidate, label) {
  const root = path.resolve(base);
  const resolved = path.resolve(candidate);
  const rel = path.relative(root, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`${label} 必须位于 ${root} 内: ${resolved}`);
  }
  return resolved;
}

function copy(src, dest, force) {
  if (fs.existsSync(dest) && !force) {
    console.log('·', path.relative(process.cwd(), dest), '已存在，跳过（--force 可覆盖）');
    return false;
  }
  fs.copyFileSync(src, dest);
  console.log('✓', path.relative(process.cwd(), dest));
  return true;
}

const args = parseArgs(process.argv.slice(2));
if (!args.target) {
  console.error('用法: node init.mjs <target-dir> [--name figures] [--force]');
  process.exit(1);
}

try {
  assertSafeSlug(args.name, '--name');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const target = path.resolve(args.target);
fs.mkdirSync(target, { recursive: true });

const files = [
  ['scripts/sketch.mjs', 'sketch.mjs'],
  ['scripts/render.mjs', 'render.mjs'],
  ['scripts/svg-lint.mjs', 'svg-lint.mjs'],
  ['scripts/lucide-icons.mjs', 'lucide-icons.mjs'],
];
for (const [srcRel, destName] of files) {
  const dest = assertInside(target, path.join(target, destName), destName);
  copy(path.join(SKILL_DIR, srcRel), dest, args.force);
}

const figPath = assertInside(target, path.join(target, `${args.name}.mjs`), '--name 输出文件');
if (fs.existsSync(figPath) && !args.force) {
  console.log('·', path.relative(process.cwd(), figPath), '已存在，跳过（--force 可覆盖）');
} else {
  const template = fs.readFileSync(path.join(SKILL_DIR, 'assets/template-figures.mjs'), 'utf8')
    .replace("from '../scripts/sketch.mjs'", "from './sketch.mjs'");
  fs.writeFileSync(figPath, template, 'utf8');
  console.log('✓', path.relative(process.cwd(), figPath));
}

console.log(`
下一步：
  1. 编辑 ${path.relative(process.cwd(), figPath)}，按需要改图
  2. 检查：node ${path.relative(process.cwd(), path.join(target, 'render.mjs'))} ${path.relative(process.cwd(), figPath)} --lint-strict
  3. 渲染：node ${path.relative(process.cwd(), path.join(target, 'render.mjs'))} ${path.relative(process.cwd(), figPath)} --png
  4. 打开生成的 SVG/PNG 检查排版，再回去调坐标
`);
