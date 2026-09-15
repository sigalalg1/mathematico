import { useCallback, useEffect, useState } from 'react';

const DISMISSED_KEY = 'matika-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isStandalone(): boolean {
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches)
    || Boolean((navigator as NavigatorWithStandalone).standalone);
}

function isIosSafari(): boolean {
  const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isWebKit = /WebKit/.test(navigator.userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  return isIosDevice && isWebKit && !isOtherIosBrowser;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface InstallAppState {
  canInstall: boolean;
  showIosInstall: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
}

export function useInstallApp(): InstallAppState {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [standalone, setStandalone] = useState(isStandalone);

  useEffect(() => {
    const displayMode = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayMode = () => setStandalone(isStandalone());
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setStandalone(true);
      setPromptEvent(null);
    };

    displayMode?.addEventListener?.('change', handleDisplayMode);
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      displayMode?.removeEventListener?.('change', handleDisplayMode);
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
    setDismissed(true);
    setPromptEvent(null);
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setPromptEvent(null);
      return;
    }
    dismiss();
  }, [dismiss, promptEvent]);

  return {
    canInstall: !standalone && !dismissed && promptEvent !== null,
    showIosInstall: !standalone && !dismissed && promptEvent === null && isIosSafari(),
    install,
    dismiss,
  };
}
