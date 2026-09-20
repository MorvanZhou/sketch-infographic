#!/usr/bin/env node
/**
 * init.mjs — 在目标项目里初始化一套可独立运行的绘图脚本
 *
 * 用法：
 *   node <skill>/scripts/init.mjs <target-dir> [--name figures] [--force]
 *
 * 做的事：把 sketch.mjs、render.mjs 和一个图形模板复制到 <target-dir>。
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

function copy(src, dest, force) {
  if (fs.existsSync(dest) && !force) {
    console.log('·', path.relative(process.cwd(), dest), '已存在，跳过（--force 可覆盖）');
    return;
  }
  fs.copyFileSync(src, dest);
  console.log('✓', path.relative(process.cwd(), dest));
}

const args = parseArgs(process.argv.slice(2));
if (!args.target) {
  console.error('用法: node init.mjs <target-dir> [--name figures] [--force]');
  process.exit(1);
}

const target = path.resolve(args.target);
fs.mkdirSync(target, { recursive: true });

copy(path.join(SKILL_DIR, 'scripts/sketch.mjs'), path.join(target, 'sketch.mjs'), args.force);
copy(path.join(SKILL_DIR, 'scripts/render.mjs'), path.join(target, 'render.mjs'), args.force);

const figPath = path.join(target, `${args.name}.mjs`);
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
  2. 渲染：node ${path.relative(process.cwd(), path.join(target, 'render.mjs'))} ${path.relative(process.cwd(), figPath)} --png
  3. 打开生成的 PNG 检查排版，再回去调坐标
`);
