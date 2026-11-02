#!/usr/bin/env node
/**
 * 抓取热榜数据，写入 data/hot.json（GitHub Pages 同源读取，避免浏览器跨域限制）。
 *
 * 数据源：热榜 API（今日热榜数据聚合，https://hot.baiwumm.com/api/<平台>）
 * 可用环境变量覆盖：HOT_API_BASE（默认 https://hot.baiwumm.com/api）
 *
 * 行为：
 * - 只保留每个榜单前 20 条；
 * - 某个平台抓取失败时保留 data/hot.json 里的旧数据，整体不失败；
 * - 内容没有变化时不写文件，避免定时任务产生无意义提交。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const API = (process.env.HOT_API_BASE || 'https://hot.baiwumm.com/api').replace(/\/$/, '');
const OUT = new URL('../data/hot.json', import.meta.url);
const LIMIT = 20;

const SOURCES = [
  { id: 'zhihu', name: '知乎热榜', path: 'zhihu' },
  { id: 'hupu', name: '虎扑热榜', path: 'hupu' },
  { id: 'weibo', name: '微博热搜', path: 'weibo' },
  { id: 'toutiao', name: '今日头条', path: 'toutiao' },
];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchSource(source) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(`${API}/${source.path}`, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json, text/plain, */*',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const payload = await res.json();
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const items = rows
        .map((row) => ({
          title: String(row.title || '').trim(),
          url: row.mobileUrl || row.url || '',
          hot: toNumber(row.hot),
          label: row.label || row.tip || '',
        }))
        .filter((item) => item.title && item.url)
        .slice(0, LIMIT);

      if (!items.length) throw new Error('empty result');
      return { name: source.name, updatedAt: new Date().toISOString(), items };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1_500 * attempt);
    }
  }
  throw lastError;
}

async function loadExisting() {
  if (!existsSync(OUT)) return null;
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

function stripTimes(payload) {
  const copy = JSON.parse(JSON.stringify(payload));
  const strip = (value) => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === 'object') {
      delete value.updatedAt;
      for (const key of Object.keys(value)) value[key] = strip(value[key]);
    }
    return value;
  };
  return strip(copy);
}

async function main() {
  const existing = await loadExisting();
  const sources = {};

  for (const source of SOURCES) {
    try {
      sources[source.id] = await fetchSource(source);
      console.log(`✓ ${source.id}: ${sources[source.id].items.length} 条`);
    } catch (error) {
      const fallback = existing?.sources?.[source.id];
      if (fallback) {
        sources[source.id] = fallback;
        console.warn(`! ${source.id}: ${error.message}，保留旧数据`);
      } else {
        console.warn(`! ${source.id}: ${error.message}，跳过`);
      }
    }
  }

  if (!Object.keys(sources).length) {
    console.error('没有任何数据源可用，退出（保持线上文件不变）');
    process.exit(1);
  }

  const next = { updatedAt: new Date().toISOString(), sources };
  if (existing && JSON.stringify(stripTimes(existing)) === JSON.stringify(stripTimes(next))) {
    console.log('内容无变化，不写文件');
    return;
  }

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(OUT, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`已写入 ${OUT.pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
