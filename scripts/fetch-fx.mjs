#!/usr/bin/env node
/**
 * 抓取美元/人民币汇率，写入 data/fx.json（GitHub Pages 同源读取，避免浏览器跨域限制）。
 *
 * 数据源：
 *   1. 新浪财经实时外汇行情（fx_susdcny，GBK 编码）—— 盘中实时更新
 *   2. open.er-api.com（每日参考汇率，无需 Key）—— 只在没有历史数据时兜底
 *
 * 行为：
 * - 新浪抓取失败时保留 data/fx.json 里的旧数据，整体不失败；
 * - 汇率没有变化时不写文件，避免定时任务产生无意义提交。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = new URL('../data/fx.json', import.meta.url);

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const round = (value, digits) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

async function loadExisting() {
  if (!existsSync(OUT)) return null;
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

/** 新浪外汇实时行情：hq_str_fx_susdcny="时间,买价,卖价,昨收,量,今开,最高,最低,最新价,名称,涨跌幅,涨跌额,...,日期" */
async function fetchSina() {
  const res = await fetch('https://hq.sinajs.cn/list=fx_susdcny', {
    headers: {
      'User-Agent': UA,
      Referer: 'https://finance.sina.com.cn/money/forex/hq/USDCNY.shtml',
      Accept: '*/*',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = new TextDecoder('gbk').decode(await res.arrayBuffer());
  const match = text.match(/"([^"]*)"/);
  if (!match) throw new Error('unexpected payload');

  const fields = match[1].split(',');
  const rate = Number(fields[8]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('invalid rate');

  const prevClose = Number(fields[3]);
  const change = Number(fields[11]);
  const changePct = Number(fields[10]);
  const date = (fields[fields.length - 1] || '').trim();
  const time = (fields[0] || '').trim();

  return {
    rate: round(rate, 4),
    prevClose: Number.isFinite(prevClose) && prevClose > 0 ? round(prevClose, 4) : null,
    change: Number.isFinite(change) ? round(change, 4) : null,
    changePct: Number.isFinite(changePct) ? round(changePct, 3) : null,
    quoteTime: date && time ? `${date} ${time}` : '',
    source: '新浪财经',
    sourceUrl: 'https://finance.sina.com.cn/money/forex/hq/USDCNY.shtml',
  };
}

/** 备用：ExchangeRate-API 免费接口（每日更新，无 Key） */
async function fetchFallback() {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const payload = await res.json();
  const rate = Number(payload?.rates?.CNY);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('invalid rate');

  return {
    rate: round(rate, 4),
    prevClose: null,
    change: null,
    changePct: null,
    quoteTime: payload?.time_last_update_utc || '',
    source: 'ExchangeRate-API（参考汇率）',
    sourceUrl: 'https://www.exchangerate-api.com/docs/free',
  };
}

async function main() {
  const existing = await loadExisting();
  let quote;

  try {
    quote = await fetchSina();
    console.log(`✓ 新浪财经：1 USD = ${quote.rate} CNY（${quote.quoteTime}）`);
  } catch (error) {
    console.warn(`! 新浪财经抓取失败：${error.message}`);
    if (existing?.rate) {
      console.log('保留 data/fx.json 里的旧数据，退出');
      return;
    }
    quote = await fetchFallback();
    console.log(`✓ 备用数据源：1 USD = ${quote.rate} CNY`);
  }

  const next = {
    pair: 'USD/CNY',
    base: 'USD',
    quote: 'CNY',
    updatedAt: new Date().toISOString(),
    ...quote,
  };

  const same =
    existing &&
    existing.rate === next.rate &&
    existing.prevClose === next.prevClose &&
    existing.source === next.source;
  if (same) {
    console.log('汇率无变化，不写文件');
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
