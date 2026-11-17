import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// "Install the app" for browsers that support it (Chrome, Edge, Android). On iPhone, explains Add to Home Screen.
export default function InstallButton({ className = 'btn-outline' }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPromptEvent(e); };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
  if (installed || standalone) return null;
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!promptEvent && !ios) return null;

  const click = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      await promptEvent.userChoice.catch(() => {});
      setPromptEvent(null);
    } else setHelp((h) => !h);
  };

  return (
    <div>
      <button type="button" className={className} onClick={click}><Download className="h-4 w-4" /> Install the app</button>
      {help && <p className="mt-2 text-xs text-slate-500">In Safari, tap the Share button, then "Add to Home Screen".</p>}
    </div>
  );
}
