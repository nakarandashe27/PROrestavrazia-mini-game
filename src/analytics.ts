/**
 * Подсчёт игроков.
 *
 * На выставке играют в основном с одного компьютера стенда, поэтому «посетители»
 * Метрики там почти всегда равны единице в день. Считаем события самой игры:
 *   game_start           — нажали «Начать путешествие» или «Сразу в мастерскую»;
 *   game_finish          — дошли до финала экспедиции;
 *   certificate_open     — открыли именной сертификат;
 *   certificate_download — сохранили PDF.
 *
 * Два независимых канала:
 * 1. Яндекс Метрика — цели (JavaScript-события) с этими идентификаторами.
 *    Работает только на сайте (https) и при наличии интернета.
 * 2. Локальный журнал по дням в localStorage этого браузера — работает и без сети,
 *    и в офлайн-копии. Смотреть: кнопка «Статистика стенда» внизу заставки или адрес с ?stats.
 *
 * Имя игрока, образ и результаты никуда не отправляются.
 */

/** Номер счётчика из metrika.yandex.ru (например, 104123456). 0 — Метрика выключена. */
export const METRIKA_ID: number = 0;

export type Goal = 'game_start' | 'game_finish' | 'certificate_open' | 'certificate_download';
export const GOALS: { id: Goal; label: string }[] = [
 { id: 'game_start', label: 'Запуски игры' },
 { id: 'game_finish', label: 'Прошли до финала' },
 { id: 'certificate_open', label: 'Открыли сертификат' },
 { id: 'certificate_download', label: 'Скачали PDF' },
];

type DayStats = Partial<Record<Goal, number>>;
type Stats = { v: 1; days: Record<string, DayStats> };
const KEY = 'prorestavraciyu.stand-stats.v1';

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[]; l?: number };
declare global { interface Window { ym?: Ym } }

let started = false;

function metrikaAllowed() {
 return METRIKA_ID > 0 && /^https?:$/.test(location.protocol) && !import.meta.env.DEV && !/^(localhost|127\.)/.test(location.hostname);
}

/** Официальный код счётчика; ym() копит вызовы в очереди, пока tag.js грузится или если сети нет. */
export function initAnalytics(mode: 'web' | 'telegram') {
 if (started || !metrikaAllowed()) return;
 started = true;
 try {
  const w = window;
  w.ym = w.ym || (function (...args: unknown[]) { (w.ym!.a = w.ym!.a || []).push(args); } as Ym);
  w.ym.l = Date.now();
  const src = 'https://mc.yandex.ru/metrika/tag.js';
  if (![...document.scripts].some(s => s.src === src)) {
   const script = document.createElement('script');
   script.async = true; script.src = src;
   script.onerror = () => { /* Нет сети — локальный журнал продолжает считать. */ };
   document.head.append(script);
  }
  w.ym(METRIKA_ID, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false, params: { mode } });
 } catch { /* Счётчик никогда не мешает игре. */ }
}

export function dayKey(date = new Date()) {
 const pad = (n: number) => String(n).padStart(2, '0');
 return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function readStats(): Stats {
 try {
  const data = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (data && data.v === 1 && data.days && typeof data.days === 'object') return data as Stats;
 } catch { /* Хранилище недоступно или повреждено. */ }
 return { v: 1, days: {} };
}

const listeners = new Set<() => void>();
export function onStatsChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function track(goal: Goal, params?: Record<string, string | number>) {
 try {
  const stats = readStats();
  const day = stats.days[dayKey()] ||= {};
  day[goal] = (day[goal] || 0) + 1;
  localStorage.setItem(KEY, JSON.stringify(stats));
 } catch { /* Приватный режим: считаем только в Метрике. */ }
 try { if (started && window.ym) window.ym(METRIKA_ID, 'reachGoal', goal, params); } catch { /* ignore */ }
 listeners.forEach(fn => fn());
}

export function resetStats() {
 try { localStorage.removeItem(KEY); } catch { /* ignore */ }
 listeners.forEach(fn => fn());
}

export function statsCsv(stats = readStats()) {
 const rows = [['Дата', ...GOALS.map(g => g.label)]];
 for (const day of Object.keys(stats.days).sort()) rows.push([day, ...GOALS.map(g => String(stats.days[day][g.id] || 0))]);
 return '﻿' + rows.map(r => r.join(';')).join('\r\n');
}

export function downloadStats() {
 const blob = new Blob([statsCsv()], { type: 'text/csv;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url; link.download = `Игра про реставрацию — статистика стенда ${dayKey()}.csv`;
 document.body.append(link); link.click(); link.remove();
 setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
