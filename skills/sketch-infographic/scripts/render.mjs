#!/usr/bin/env node
/**
 * render.mjs — 把图形定义文件渲染成 SVG（默认）与 PNG（可选）
 *
 * 用法：
 *   node render.mjs <figures.mjs> [--out <dir>] [--png] [--lint] [--only id1,id2] [--list]
 *
 * <figures.mjs> 需要导出 FIGURES（或 default），支持两种写法：
 *   export const FIGURES = [['01-my-figure', buildFn], ...]
 *   export const FIGURES = { '01-my-figure': buildFn, ... }
 * buildFn 返回 createSketch() 得到的画布对象。
 *
 * SVG 渲染无 npm 运行时依赖；只有加 --png 时才需要一台本机已装的 Chrome/Chromium/Edge/Brave
 * （通过临时 profile + DevTools 协议截图，不安装 puppeteer / playwright）。
 * 截图后用 Browser.close 正常退出，避免 macOS 把信号杀进程当成 Chrome 崩溃。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { lintSvg } from './svg-lint.mjs';

function parseArgs(argv) {
  const args = {
    file: null, out: null, png: false, scale: 2, only: [], chrome: null,
    list: false, lint: false, lintStrict: false, chromeNoSandbox: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--png') args.png = true;
    else if (a === '--list') args.list = true;
    else if (a === '--lint') args.lint = true;
    else if (a === '--lint-strict') {
      args.lint = true;
      args.lintStrict = true;
    }
    else if (a === '--chrome-no-sandbox') args.chromeNoSandbox = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--scale') args.scale = Number(argv[++i]);
    else if (a === '--only') args.only = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--chrome') args.chrome = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('--') && !args.file) args.file = a;
  }
  return args;
}

/** 图 id 只能是安全文件名，避免输出路径逃逸 */
function assertSafeId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(id)) {
    throw new Error(`非法图 id: ${id}（仅允许字母、数字、点、下划线和连字符）`);
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

const HELP = `用法: node render.mjs <figures.mjs> [选项]

选项:
  --out <dir>     输出目录，默认为图形文件同级的 images/
  --png           同时导出 PNG（需要本机 Chrome/Chromium/Edge/Brave）
  --scale <n>     PNG 像素倍率，默认 2
  --only <ids>    只渲染指定的图，逗号分隔
  --chrome <path> 手动指定浏览器可执行文件（也可用环境变量 CHROME_PATH）
  --list          只列出图形文件里有哪些图，不渲染
  --lint          检查区域重叠、线穿节点、线线交叉与越界（error 时退出码 1）
  --lint-strict   与 --lint 相同，但 warning 也令退出码为 1
  --chrome-no-sandbox  仅在受限 CI 环境需要时给浏览器追加 --no-sandbox
`;

/** 按常见安装位置找一个可用的 Chromium 系浏览器，覆盖 macOS / Windows / Linux */
function findChrome(explicit) {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA;
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
    // Windows system installs
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    // Windows per-user installs
    localAppData && `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
    localAppData && `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`,
    localAppData && `${localAppData}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch { /* 路径不可访问就跳过 */ }
  }
  return null;
}

/**
 * Chrome 的 --remote-debugging-pipe：fd 3 收命令，fd 4 发消息，JSON 以 NUL 分隔。
 * 只用于本次截图进程，不占用调试端口。
 */
function createCdp(pipeRead, pipeWrite) {
  let nextId = 1;
  let pending = Buffer.alloc(0);
  const waiters = new Map();
  const listeners = new Set();

  function handleMessage(text) {
    let msg;
    try { msg = JSON.parse(text); } catch { return; }
    if (msg.id != null && waiters.has(msg.id)) {
      const { resolve, reject } = waiters.get(msg.id);
      waiters.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || 'DevTools 调用失败'));
      else resolve(msg.result ?? {});
      return;
    }
    for (const fn of listeners) fn(msg);
  }

  function failAll(err) {
    for (const { reject } of waiters.values()) reject(err);
    waiters.clear();
  }
  pipeRead.on('data', (buf) => {
    pending = Buffer.concat([pending, buf]);
    let idx = pending.indexOf(0);
    while (idx !== -1) {
      const text = pending.subarray(0, idx).toString('utf8');
      pending = pending.subarray(idx + 1);
      if (text) handleMessage(text);
      idx = pending.indexOf(0);
    }
  });
  pipeRead.on('error', () => {});
  pipeRead.on('close', () => failAll(new Error('浏览器管道已关闭')));
  pipeWrite.on('error', () => {});

  function send(method, params = {}, sessionId) {
    const id = nextId;
    nextId += 1;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    pipeWrite.write(`${JSON.stringify(payload)}\0`);
    return new Promise((resolve, reject) => {
      waiters.set(id, { resolve, reject });
    });
  }

  function waitLoadOrCrash(sessionId, timeoutMs) {
    let cancel = () => {};
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        listeners.delete(onEvent);
        reject(new Error('等待 Page.loadEventFired 超时'));
      }, timeoutMs);
      cancel = () => {
        clearTimeout(timer);
        listeners.delete(onEvent);
      };
      function onEvent(msg) {
        if (sessionId && msg.sessionId !== sessionId) return;
        if (msg.method === 'Page.loadEventFired') {
          cancel();
          resolve();
        } else if (msg.method === 'Inspector.detached') {
          cancel();
          reject(new Error(`渲染进程退出：${msg.params?.reason || '未知原因'}`));
        }
      }
      listeners.add(onEvent);
    });
    promise.cancel = cancel;
    return promise;
  }

  return { send, waitLoadOrCrash };
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 超时（${timeoutMs}ms）`)), timeoutMs);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** 用临时 profile + DevTools 截图。正常 Browser.close，不向 Chrome 发信号。 */
async function svgToPng(chrome, svgPath, pngPath, width, height, scale, noSandbox = false) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sketch-infographic-chrome-'));
  const args = [
    '--headless=new',
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-pipe',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-breakpad',
    '--hide-scrollbars',
    `--window-size=${Math.round(width)},${Math.round(height)}`,
    'about:blank',
  ];
  if (noSandbox || process.env.CHROME_NO_SANDBOX === '1') {
    args.splice(2, 0, '--no-sandbox');
  }
  const child = spawn(chrome, args, {
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
  });
  child.stderr?.on('data', () => {});
  const pipeWrite = child.stdio[3];
  const pipeRead = child.stdio[4];
  if (!pipeWrite || !pipeRead) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
    throw new Error('无法建立浏览器 DevTools 管道');
  }
  const exited = new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  const cdp = createCdp(pipeRead, pipeWrite);
  let loaded = null;
  try {
    const created = await withTimeout(
      cdp.send('Target.createTarget', { url: 'about:blank' }),
      20_000,
      '启动浏览器',
    );
    const attached = await withTimeout(
      cdp.send('Target.attachToTarget', { targetId: created.targetId, flatten: true }),
      10_000,
      '连接页面',
    );
    const sessionId = attached.sessionId;
    await withTimeout(cdp.send('Page.enable', {}, sessionId), 10_000, '启用页面');
    await withTimeout(cdp.send('Emulation.setDeviceMetricsOverride', {
      width: Math.round(width),
      height: Math.round(height),
      deviceScaleFactor: scale,
      mobile: false,
    }, sessionId), 10_000, '设置画布');
    const loadedWait = cdp.waitLoadOrCrash(sessionId, 10_000);
    loaded = loadedWait;
    const nav = await withTimeout(
      cdp.send('Page.navigate', { url: pathToFileURL(svgPath).href }, sessionId),
      10_000,
      '打开 SVG',
    );
    if (nav.errorText) throw new Error(nav.errorText);
    await loadedWait;
    const shot = await withTimeout(
      cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId),
      15_000,
      '截图',
    );
    if (!shot.data) throw new Error('浏览器没有返回 PNG 数据');
    fs.writeFileSync(pngPath, Buffer.from(shot.data, 'base64'));
    await withTimeout(cdp.send('Browser.close'), 5_000, '关闭浏览器').catch(() => {});
    const result = await withTimeout(exited, 10_000, '等待浏览器退出');
    if (result.signal) {
      throw new Error(`浏览器被信号 ${result.signal} 终止`);
    }
  } finally {
    loaded?.cancel?.();
    if (child.exitCode === null && child.signalCode == null) {
      await withTimeout(cdp.send('Browser.close'), 3_000, '关闭浏览器').catch(() => {});
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2000))]);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch { /* 进程尚未松开文件时保留临时目录 */ }
  }
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

  const seen = new Set();
  try {
    for (const [id] of figures) {
      assertSafeId(id);
      if (seen.has(id)) throw new Error(`图 id 重复: ${id}`);
      seen.add(id);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  let count = 0;
  let lintFailed = false;
  let pngFailed = false;
  for (const [id, build] of figures) {
    if (args.only.length && !args.only.includes(id)) continue;
    const sketch = build();
    const svg = sketch.toSvg();
    const svgPath = assertInside(outDir, path.join(outDir, `${id}.svg`), `图 ${id} 的 SVG 输出`);
    fs.writeFileSync(svgPath, svg, 'utf8');
    console.log('✓', path.relative(process.cwd(), svgPath));
    count += 1;

    if (args.lint) {
      if (typeof sketch.lint !== 'function') {
        console.error(`✗ ${id} 不支持几何 lint，请更新 sketch.mjs`);
        lintFailed = true;
      } else {
        const issues = [
          ...sketch.lint().map((issue) => ({ ...issue, layer: 'semantic' })),
          ...lintSvg(svg, {
            width: sketch.width,
            height: sketch.height,
          }).map((issue) => ({ ...issue, layer: 'svg' })),
        ];
        if (!issues.length) console.log(`✓ ${id} semantic + SVG lint 通过`);
        for (const issue of issues) {
          const mark = issue.severity === 'error' ? '✗' : '!';
          const where = issue.at
            ? ` @ (${Math.round(issue.at[0])}, ${Math.round(issue.at[1])})`
            : '';
          console.error(`${mark} ${id} [${issue.layer}:${issue.code}] ${issue.message}${where}`);
          if (issue.severity === 'error' || args.lintStrict) lintFailed = true;
        }
      }
    }

    if (chrome) {
      const pngPath = assertInside(outDir, path.join(outDir, `${id}.png`), `图 ${id} 的 PNG 输出`);
      try {
        await svgToPng(
          chrome, svgPath, pngPath, sketch.width, sketch.height, args.scale, args.chromeNoSandbox,
        );
        console.log('✓', path.relative(process.cwd(), pngPath));
      } catch (err) {
        console.error(`  PNG 导出失败（SVG 已生成）: ${err.message.split('\n')[0]}`);
        pngFailed = true;
      }
    }
  }

  if (!count) {
    console.error(`--only 没有匹配到任何图。可用 --list 查看全部 id。`);
    process.exit(1);
  }
  if (lintFailed || pngFailed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
