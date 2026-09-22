import { useEffect, useRef, useState } from 'react';

type Insets = { top: number; right: number; bottom: number; left: number };
type Handler = () => void;
export interface TelegramApp {
  platform: string;
  viewportStableHeight: number;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
  isFullscreen?: boolean;
  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  enableVerticalSwipes(): void;
  disableVerticalSwipes(): void;
  requestFullscreen(): void;
  exitFullscreen(): void;
  openLink(url: string): void;
  onEvent(event: string, handler: Handler): void;
  offEvent(event: string, handler: Handler): void;
  BackButton: { show(): void; hide(): void; onClick(handler: Handler): void; offClick(handler: Handler): void };
}
declare global { interface Window { Telegram?: { WebApp?: TelegramApp } } }

// Launch parameters only select the UI adapter. They are never authentication.
// No Telegram identity or initData is read, stored, or sent by this game.
export function getTelegram() {
  const app = window.Telegram?.WebApp;
  return app && app.platform !== 'unknown' ? app : null;
}
let loading: Promise<TelegramApp | null> | undefined;
export function loadTelegram() {
  if (getTelegram()) return Promise.resolve(getTelegram());
  const params = new URLSearchParams(location.hash.slice(1));
  if (location.protocol === 'file:' || (!params.has('tgWebAppPlatform') && !new URLSearchParams(location.search).has('telegram'))) {
    return Promise.resolve(null);
  }
  return loading ??= new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js?63';
    script.async = true;
    // Rendering never waits for the external SDK, including when it is blocked.
    script.onload = () => resolve(getTelegram());
    script.onerror = () => resolve(null);
    document.head.append(script);
  });
}

export function useTelegram(options: {
  backVisible: boolean; protectProgress: boolean; gestures: boolean;
  onBack: Handler; onDeactivate: Handler; onFullscreenFailed: Handler;
}) {
  const [app, setApp] = useState<TelegramApp | null>(null);
  const latest = useRef(options); latest.current = options;
  useEffect(() => {
    let mounted = true;
    void loadTelegram().then(value => { if (mounted) setApp(value); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!app) return;
    const root = document.documentElement;
    const resize = () => {
      if (app.viewportStableHeight > 0) root.style.setProperty('--telegram-height', `${app.viewportStableHeight}px`);
      for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
        const inset = Math.max(0, app.safeAreaInset?.[edge] ?? 0) + Math.max(0, app.contentSafeAreaInset?.[edge] ?? 0);
        root.style.setProperty(`--telegram-${edge}`, `${inset}px`);
      }
    };
    const back = () => latest.current.onBack();
    const deactivate = () => latest.current.onDeactivate();
    const fullscreenFailed = () => latest.current.onFullscreenFailed();
    const externalLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[target="_blank"]');
      if (!link || !/^https?:$/.test(new URL(link.href).protocol) || !app.isVersionAtLeast('6.1')) return;
      event.preventDefault(); app.openLink(link.href);
    };
    root.classList.add('in-telegram');
    resize();
    app.expand();
    if (app.isVersionAtLeast('6.1')) {
      app.setHeaderColor(app.isVersionAtLeast('6.9') ? '#262626' : 'bg_color');
      app.setBackgroundColor('#262626');
      app.BackButton.onClick(back);
    }
    if (app.isVersionAtLeast('7.10')) app.setBottomBarColor('#262626');
    const events: [string, Handler][] = [['viewportChanged', resize], ['safeAreaChanged', resize], ['contentSafeAreaChanged', resize], ['deactivated', deactivate], ['fullscreenFailed', fullscreenFailed]];
    for (const [event, handler] of events) app.onEvent(event, handler);
    document.addEventListener('click', externalLink);
    app.ready();
    return () => {
      for (const [event, handler] of events) app.offEvent(event, handler);
      if (app.isVersionAtLeast('6.1')) { app.BackButton.offClick(back); app.BackButton.hide(); }
      if (app.isVersionAtLeast('6.2')) app.disableClosingConfirmation();
      if (app.isVersionAtLeast('7.7')) app.enableVerticalSwipes();
      document.removeEventListener('click', externalLink);
      root.classList.remove('in-telegram');
      for (const key of ['height', 'top', 'right', 'bottom', 'left']) root.style.removeProperty(`--telegram-${key}`);
    };
  }, [app]);
  useEffect(() => {
    if (!app) return;
    if (app.isVersionAtLeast('6.1')) { if (options.backVisible) app.BackButton.show(); else app.BackButton.hide(); }
    if (app.isVersionAtLeast('6.2')) { if (options.protectProgress) app.enableClosingConfirmation(); else app.disableClosingConfirmation(); }
    if (app.isVersionAtLeast('7.7')) { if (options.gestures) app.disableVerticalSwipes(); else app.enableVerticalSwipes(); }
  }, [app, options.backVisible, options.protectProgress, options.gestures]);
  return app;
}
