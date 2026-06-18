import { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import './DownloadAppBanner.css';

export default function DownloadAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Solo mostrar en mobile y si el usuario no lo cerró antes
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isCapacitor = !!(window as any).Capacitor;
    const dismissed = localStorage.getItem('travelkit_download_banner_dismissed');
    if (isMobile && !isCapacitor && !dismissed) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('travelkit_download_banner_dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div className="download-app-banner">
      <div className="download-app-icon">
        <Smartphone size={22} />
      </div>
      <div className="download-app-text">
        <strong>Travel Kit</strong>
        <span>Descargá la app para Android</span>
      </div>
      <a href="/travelkit.apk" download className="download-app-btn">
        <Download size={16} />
        Bajar
      </a>
      <button className="download-app-close" onClick={handleClose} aria-label="Cerrar">
        <X size={18} />
      </button>
    </div>
  );
}
