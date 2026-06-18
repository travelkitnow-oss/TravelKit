import { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import './DownloadAppBanner.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function DownloadAppBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    const isCapacitor = !!(window as any).Capacitor;
    const dismissed = localStorage.getItem('travelkit_install_banner_dismissed');
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(ios);

    if (isMobile && !isStandalone && !isCapacitor && !dismissed) {
      setVisible(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.classList.add('with-download-banner');
    } else {
      document.body.classList.remove('with-download-banner');
    }
    return () => document.body.classList.remove('with-download-banner');
  }, [visible]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosHelp(true);
    } else {
      setShowIosHelp(true);
    }
  };

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('travelkit_install_banner_dismissed', '1');
  };

  if (!visible) return null;

  return (
    <>
      <div className="download-app-banner">
        <div className="download-app-icon">
          <Smartphone size={22} />
        </div>
        <div className="download-app-text">
          <strong>Travel Kit</strong>
          <span>Instalá la app en tu inicio</span>
        </div>
        <button className="download-app-btn" onClick={handleInstall}>
          <Download size={16} />
          Instalar
        </button>
        <button className="download-app-close" onClick={handleClose} aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>

      {showIosHelp && (
        <div className="install-help-overlay" onClick={() => setShowIosHelp(false)}>
          <div className="install-help-card" onClick={(e) => e.stopPropagation()}>
            <button className="install-help-close" onClick={() => setShowIosHelp(false)}>
              <X size={20} />
            </button>
            <h3>Instalá Travel Kit</h3>
            {isIos ? (
              <>
                <p>Para instalar la app en tu iPhone:</p>
                <ol>
                  <li>Tocá el botón <strong>Compartir</strong> abajo en Safari</li>
                  <li>Buscá y tocá <strong>"Agregar a pantalla de inicio"</strong></li>
                  <li>Tocá <strong>Agregar</strong> arriba a la derecha</li>
                </ol>
              </>
            ) : (
              <>
                <p>Para instalar la app:</p>
                <ol>
                  <li>Abrí el menú <strong>⋮</strong> del navegador</li>
                  <li>Tocá <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong></li>
                  <li>Confirmá la instalación</li>
                </ol>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
