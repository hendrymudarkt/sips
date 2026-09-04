'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sips_pwa_dismissed_until';
const DISMISS_DAYS = 7;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches
  );
}

function isDesktopDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // desktop if pointer fine + large width; treat >=1024 as desktop
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  // mobile/tablet = coarse pointer OR not wide. Desktop = wide AND fine pointer
  if (wide && !coarsePointer) return true;
  // UA fallback for SSR-less
  const ua = navigator.userAgent;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return !isMobileUA && wide;
}

function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

function isDebug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('pwa-debug') === '1';
  } catch {
    return false;
  }
}
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() < Number(v);
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
  } catch {}
}

export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [debug, setDebug] = useState(false);

  const checkVisibility = useCallback(() => {
    if (isStandalone()) return setVisible(false);
    if (!debug && isDismissed()) return setVisible(false);
    if (isDesktopDevice()) return setVisible(false);
    // Show if we have deferred prompt, iOS manual, or Android manual
    // (browsers without beforeinstallprompt: Firefox, WebView, Aloha).
    if (deferred || isIOSDevice || isAndroidDevice) setVisible(true);
    else setVisible(false);
  }, [deferred, isIOSDevice, isAndroidDevice, debug]);

  useEffect(() => {
    setIsIOSDevice(isIOS());
    setIsAndroidDevice(isAndroid());
    setDebug(isDebug());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferred(null);
      setVisible(false);
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', onAppInstalled);

    // Re-check on resize/orientation
    const mq = window.matchMedia('(min-width: 1024px)');
    const onMq = () => checkVisibility();
    mq.addEventListener?.('change', onMq);
    window.addEventListener('resize', onMq);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled);
      mq.removeEventListener?.('change', onMq);
      window.removeEventListener('resize', onMq);
    };
  }, [checkVisibility]);

  useEffect(() => {
    checkVisibility();
  }, [deferred, isIOSDevice, isAndroidDevice, debug, checkVisibility]);

  const handleInstall = async () => {
    try { navigator.vibrate?.(10); } catch {}
    if (!deferred) {
      // Manual path (iOS / browsers without beforeinstallprompt) - just dismiss
      setDismissed();
      setVisible(false);
      return;
    }
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferred(null);
        setVisible(false);
      } else {
        setDismissed();
        setVisible(false);
      }
    } catch {
      setDismissed();
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    try { navigator.vibrate?.(5); } catch {}
    setDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  const showManual = !deferred;
  const manualText = isIOSDevice ? (
    <p className="text-xs opacity-70 leading-snug mt-0.5">
      Tap <span className="font-semibold">Bagikan</span> → <span className="font-semibold">Add to Home Screen</span> untuk akses seperti aplikasi native.
    </p>
  ) : (
    <p className="text-xs opacity-70 leading-snug mt-0.5">
      Tap <span className="font-semibold">⋮</span> → <span className="font-semibold">Add to Home screen / Install app</span> untuk akses seperti aplikasi native.
    </p>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install aplikasi"
      className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-base-100 border border-base-300 shadow-2xl p-4 animate-slideUp flex gap-3 items-center">
        {/* App icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="SiPS" className="w-9 h-9 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">Install SiPS Mobile</p>
          {showManual ? manualText : (
            <p className="text-xs opacity-70 leading-snug mt-0.5">
              Install untuk akses cepat, fullscreen & offline seperti aplikasi Android.
            </p>
          )}
          {debug && (
            <p className="text-[10px] opacity-50 mt-1 font-mono">
              dbg: deferred={deferred ? 'y' : 'n'} sw={'serviceWorker' in navigator ? 'y' : 'n'}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {!showManual && (
            <button
              onClick={handleInstall}
              className="btn btn-primary btn-sm rounded-full px-5"
              aria-label="Install aplikasi"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="btn btn-ghost btn-xs rounded-full opacity-60"
            aria-label="Tutup prompt install"
          >
            {showManual ? 'Tutup' : 'Nanti'}
          </button>
        </div>
      </div>
    </div>
  );
}
