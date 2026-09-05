import { useEffect, useRef, useState } from 'react';
import { certificateName, downloadCertificate, renderCertificate } from '../game/certificate';
import './certificate.css';

export type CertificateProps = { name: string; terms: number; details: number; onClose: () => void };

export function Certificate({ name, terms, details, onClose }: CertificateProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    renderCertificate(canvas.current!, name, terms, details).then(() => { if (active) setReady(true); }).catch(() => { if (active) setError('Не удалось подготовить сертификат. Попробуй открыть его ещё раз.'); });
    return () => { active = false; };
  }, [name, terms, details]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); if (photo) setPhoto(false); else onClose(); }
      if (event.key === 'Tab') {
        const nodes = [...(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]') || [])].filter(el => el.getClientRects().length);
        if (!nodes.length) return;
        if (event.shiftKey && (document.activeElement === nodes[0] || document.activeElement === root.current)) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
        else if (!event.shiftKey && (document.activeElement === nodes[nodes.length - 1] || document.activeElement === root.current)) { event.preventDefault(); nodes[0].focus(); }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('keydown', key, true); previous?.focus(); };
  }, [photo, onClose]);
  async function save() {
    setBusy(true); setError('');
    try { await downloadCertificate(name, terms, details); }
    catch { setError('PDF не сохранился. Попробуй ещё раз или сфотографируй сертификат.'); }
    finally { setBusy(false); }
  }
  return <div ref={root} className={`certificate-screen${photo ? ' certificate-photo' : ''}`} role="dialog" aria-modal="true" aria-label="Именной сертификат хранителя наследия" tabIndex={-1}>
    <div className="certificate-toolbar">
      <div><strong>Твой сертификат</strong><span>Сохрани на память или сфотографируй экран.</span><span className="certificate-rotate-hint">Поверни телефон, чтобы рассмотреть крупнее.</span></div>
      <div className="certificate-actions">
        <button className="secondary certificate-photo-button" onClick={() => setPhoto(true)}>Для фотографии</button>
        <button className="primary" onClick={save} disabled={!ready || busy}>{busy ? 'Готовим PDF…' : 'Скачать PDF'}</button>
        <button className="certificate-close" onClick={onClose} aria-label="Закрыть сертификат">×</button>
      </div>
    </div>
    {error && <p role="alert" className="certificate-error">{error}</p>}
    <div className="certificate-paper">
      <canvas ref={canvas} role="img" aria-label={`Памятный сертификат «Хранитель наследия». ${certificateName(name)}. Слов изучено: ${terms}. Деталей восстановлено: ${details}. Спасибо за заботу об архитектурном наследии!`} />
      {!ready && !error && <span className="certificate-loading" role="status">Готовим твой сертификат…</span>}
    </div>
    {photo && <button className="certificate-photo-exit" onClick={() => setPhoto(false)} aria-label="Вернуть кнопки сертификата">Вернуть кнопки</button>}
  </div>;
}
