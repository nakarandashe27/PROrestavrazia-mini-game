import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { GOALS, METRIKA_ID, dayKey, downloadStats, onStatsChange, readStats, resetStats } from '../analytics';
import './stand.css';

/** Счётчик для ведущего стенда: сколько раз за день запускали игру на этом компьютере. */
export function useTodayStarts() {
 const [value, setValue] = useState(() => readStats().days[dayKey()]?.game_start || 0);
 useEffect(() => onStatsChange(() => setValue(readStats().days[dayKey()]?.game_start || 0)), []);
 return value;
}

export function StandStats({ onClose }: { onClose: () => void }) {
 const [stats, setStats] = useState(readStats);
 const [confirm, setConfirm] = useState(false);
 useEffect(() => onStatsChange(() => setStats(readStats())), []);
 useEffect(() => {
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose(); } };
  document.addEventListener('keydown', key, true);
  return () => document.removeEventListener('keydown', key, true);
 }, [onClose]);
 const days = Object.keys(stats.days).sort().reverse();
 const today = dayKey();
 const total = (id: typeof GOALS[number]['id']) => days.reduce((sum, d) => sum + (stats.days[d][id] || 0), 0);
 return <Modal label="Статистика стенда" wide>
  <div className="modal-heading"><div><span className="eyebrow">СЧЁТЧИК ЭТОГО КОМПЬЮТЕРА</span><h2>Статистика стенда</h2></div><button className="close-button" onClick={onClose} aria-label="Закрыть статистику">×</button></div>
  <p>Каждое нажатие «Начать путешествие» или «Сразу в мастерскую» — один запуск. Данные хранятся только в этом браузере и не содержат имён.</p>
  <div className="stats-table-wrap">
   <table className="stats-table">
    <thead><tr><th scope="col">Дата</th>{GOALS.map(g => <th key={g.id} scope="col">{g.label}</th>)}</tr></thead>
    <tbody>
     {days.length ? days.map(d => <tr key={d} className={d === today ? 'today' : ''}><th scope="row">{d.split('-').reverse().join('.')}{d === today && <small> сегодня</small>}</th>{GOALS.map(g => <td key={g.id}>{stats.days[d][g.id] || 0}</td>)}</tr>)
      : <tr><td colSpan={GOALS.length + 1}>Пока нет запусков на этом компьютере.</td></tr>}
    </tbody>
    {days.length > 1 && <tfoot><tr><th scope="row">Всего</th>{GOALS.map(g => <td key={g.id}>{total(g.id)}</td>)}</tr></tfoot>}
   </table>
  </div>
  <p className="small">{METRIKA_ID > 0 ? `Яндекс Метрика подключена (счётчик ${METRIKA_ID}): те же события приходят в отчёт «Конверсии» как цели.` : 'Яндекс Метрика ещё не подключена: номер счётчика задаётся в src/analytics.ts.'}</p>
  <div className="stats-actions">
   <button className="primary" onClick={downloadStats} disabled={!days.length}>Скачать CSV <span>↓</span></button>
   {confirm ? <button className="secondary" onClick={() => { resetStats(); setConfirm(false); }}>Точно обнулить?</button>
    : <button className="secondary" onClick={() => setConfirm(true)} disabled={!days.length}>Обнулить счётчик</button>}
  </div>
 </Modal>;
}
