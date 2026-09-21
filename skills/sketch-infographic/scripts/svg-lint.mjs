/**
 * 对最终 SVG 字符串做第二层检查。
 * 这层不替代语义 lint：它负责发现序列化异常、最终笔触/文字越界和尺寸不一致。
 */

const NUMBER_RE = /[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/g;

function attrsOf(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[match[1]] = match[2];
  return attrs;
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function outside(x, y, width, height, tolerance) {
  return x < -tolerance || y < -tolerance
    || x > width + tolerance || y > height + tolerance;
}

export function lintSvg(svg, config = {}) {
  const issues = [];
  const add = (severity, code, message, at = null) => {
    issues.push({ severity, code, message, at, ids: [] });
  };

  if (typeof svg !== 'string' || !svg.trim()) {
    add('error', 'SVG_EMPTY', 'SVG 产物为空');
    return issues;
  }
  if (/\b(?:NaN|Infinity|undefined|null)\b/.test(svg)) {
    add('error', 'SVG_INVALID_NUMBER', 'SVG 中出现 NaN、Infinity 或未定义值');
  }

  const rootTag = svg.match(/<svg\b[^>]*>/)?.[0];
  if (!rootTag) {
    add('error', 'SVG_ROOT_MISSING', '缺少 <svg> 根元素');
    return issues;
  }
  if (!/<\/svg>\s*$/.test(svg)) add('error', 'SVG_ROOT_UNCLOSED', 'SVG 根元素未闭合');

  const root = attrsOf(rootTag);
  const width = number(root.width);
  const height = number(root.height);
  const viewBox = (root.viewBox ?? '').match(NUMBER_RE)?.map(Number) ?? [];
  if (!(width > 0) || !(height > 0)) {
    add('error', 'SVG_SIZE_INVALID', 'SVG width/height 必须是正数');
    return issues;
  }
  if (viewBox.length !== 4) {
    add('error', 'SVG_VIEWBOX_INVALID', 'SVG viewBox 必须包含四个数字');
  } else if (
    Math.abs(viewBox[0]) > 1e-6
    || Math.abs(viewBox[1]) > 1e-6
    || Math.abs(viewBox[2] - width) > 1e-6
    || Math.abs(viewBox[3] - height) > 1e-6
  ) {
    add('error', 'SVG_VIEWBOX_MISMATCH', 'viewBox 与 width/height 不一致');
  }
  if (config.width != null && Math.abs(width - config.width) > 1e-6) {
    add('error', 'SVG_WIDTH_MISMATCH', `SVG width=${width}，画布 width=${config.width}`);
  }
  if (config.height != null && Math.abs(height - config.height) > 1e-6) {
    add('error', 'SVG_HEIGHT_MISMATCH', `SVG height=${height}，画布 height=${config.height}`);
  }

  const tolerance = config.tolerance ?? 4;
  let pathIndex = 0;
  for (const match of svg.matchAll(/<path\b[^>]*>/g)) {
    pathIndex += 1;
    const attrs = attrsOf(match[0]);
    const nums = (attrs.d ?? '').match(NUMBER_RE)?.map(Number) ?? [];
    if (!attrs.d || nums.length < 2) {
      add('error', 'SVG_PATH_INVALID', `第 ${pathIndex} 条 path 缺少有效 d`);
      continue;
    }
    for (let i = 0; i + 1 < nums.length; i += 2) {
      if (outside(nums[i], nums[i + 1], width, height, tolerance)) {
        add(
          'warning',
          'SVG_PATH_OUT_OF_BOUNDS',
          `第 ${pathIndex} 条最终笔触超出 viewBox`,
          [nums[i], nums[i + 1]],
        );
        break;
      }
    }
  }

  let textIndex = 0;
  for (const match of svg.matchAll(/<text\b[^>]*>[\s\S]*?<\/text>/g)) {
    textIndex += 1;
    const textAttrs = attrsOf(match[0].match(/<text\b[^>]*>/)?.[0] ?? '');
    const size = number(textAttrs['font-size']) ?? 16;
    for (const tspan of match[0].matchAll(/<tspan\b[^>]*>/g)) {
      const attrs = attrsOf(tspan[0]);
      const x = number(attrs.x);
      const y = number(attrs.y);
      if (x == null || y == null) {
        add('error', 'SVG_TEXT_POSITION_INVALID', `第 ${textIndex} 段文字缺少有效坐标`);
        break;
      }
      if (x < -tolerance || x > width + tolerance || y - size < -tolerance || y > height + tolerance) {
        add('error', 'SVG_TEXT_OUT_OF_BOUNDS', `第 ${textIndex} 段文字超出 viewBox`, [x, y]);
        break;
      }
    }
  }

  if (pathIndex === 0 && textIndex === 0) {
    add('warning', 'SVG_NO_CONTENT', 'SVG 中没有 path 或 text 内容');
  }
  return issues;
}
