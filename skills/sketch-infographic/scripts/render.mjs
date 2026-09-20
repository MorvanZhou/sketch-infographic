#!/usr/bin/env node
/**
 * render.mjs — 把图形定义文件渲染成 SVG（默认）与 PNG（可选）
 *
 * 用法：
 *   node render.mjs <figures.mjs> [--out <dir>] [--png] [--scale 2] [--only id1,id2] [--list]
 *
 * <figures.mjs> 需要导出 FIGURES（或 default），支持两种写法：
 *   export const FIGURES = [['01-my-figure', buildFn], ...]
 *   export const FIGURES = { '01-my-figure': buildFn, ... }
 * buildFn 返回 createSketch() 得到的画布对象。
 *
 * SVG 渲染零依赖；只有加 --png 时才需要一台本机已装的 Chrome/Chromium/Edge/Brave
 * （直接调用浏览器自带的 --screenshot，不安装 puppeteer / playwright）。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const args = { file: null, out: null, png: false, scale: 2, only: [], chrome: null, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--png') args.png = true;
    else if (a === '--list') args.list = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--scale') args.scale = Number(argv[++i]);
    else if (a === '--only') args.only = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--chrome') args.chrome = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('--') && !args.file) args.file = a;
  }
  return args;
}

const HELP = `用法: node render.mjs <figures.mjs> [选项]

选项:
  --out <dir>     输出目录，默认为图形文件同级的 images/
  --png           同时导出 PNG（需要本机 Chrome/Chromium/Edge/Brave）
  --scale <n>     PNG 像素倍率，默认 2
  --only <ids>    只渲染指定的图，逗号分隔
  --chrome <path> 手动指定浏览器可执行文件（也可用环境变量 CHROME_PATH）
  --list          只列出图形文件里有哪些图，不渲染
`;

/** 按常见安装位置找一个可用的 Chromium 系浏览器，覆盖 macOS / Windows / Linux */
function findChrome(explicit) {
  const home = os.homedir();
  const candidates = [
    explicit,
    process.env.CHROME_PATH,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    `${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    // Linux
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge', '/usr/bin/brave-browser',
    '/snap/bin/chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch { /* 路径不可访问就跳过 */ }
  }
  return null;
}

/** 用浏览器自带的 --screenshot 把 SVG 转成 PNG，无需任何 npm 包 */
function svgToPng(chrome, svgPath, pngPath, width, height, scale) {
  execFileSync(chrome, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-sandbox',
    '--default-background-color=00000000',
    `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`,
    `--screenshot=${pngPath}`,
    pathToFileURL(svgPath).href,
  ], { stdio: 'pipe' });
}

/** 兼容数组与对象两种导出写法 */
function normalizeFigures(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return Object.entries(raw);
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file) {
    console.log(HELP);
    process.exit(args.file ? 0 : 1);
  }

  const figFile = path.resolve(args.file);
  if (!fs.existsSync(figFile)) {
    console.error(`找不到图形文件: ${figFile}`);
    process.exit(1);
  }

  const mod = await import(pathToFileURL(figFile).href);
  const figures = normalizeFigures(mod.FIGURES ?? mod.default);
  if (!figures || !figures.length) {
    console.error('图形文件需要导出 FIGURES（数组 [[id, fn]] 或对象 { id: fn }）');
    process.exit(1);
  }

  if (args.list) {
    for (const [id] of figures) console.log(id);
    return;
  }

  const outDir = path.resolve(args.out ?? path.join(path.dirname(figFile), 'images'));
  fs.mkdirSync(outDir, { recursive: true });

  let chrome = null;
  if (args.png) {
    chrome = findChrome(args.chrome);
    if (!chrome) {
      console.error('未找到 Chrome/Chromium/Edge/Brave。可用 --chrome <path> 或环境变量 CHROME_PATH 指定；'
        + '若只需要 SVG，去掉 --png 即可。');
      process.exit(1);
    }
  }

  let count = 0;
  for (const [id, build] of figures) {
    if (args.only.length && !args.only.includes(id)) continue;
    const sketch = build();
    const svgPath = path.join(outDir, `${id}.svg`);
    fs.writeFileSync(svgPath, sketch.toSvg(), 'utf8');
    console.log('✓', path.relative(process.cwd(), svgPath));
    count += 1;

    if (chrome) {
      const pngPath = path.join(outDir, `${id}.png`);
      try {
        svgToPng(chrome, svgPath, pngPath, sketch.width, sketch.height, args.scale);
        console.log('✓', path.relative(process.cwd(), pngPath));
      } catch (err) {
        console.error(`  PNG 导出失败（SVG 已生成）: ${err.message.split('\n')[0]}`);
      }
    }
  }

  if (!count) {
    console.error(`--only 没有匹配到任何图。可用 --list 查看全部 id。`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
