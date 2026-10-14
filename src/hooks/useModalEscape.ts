import { useEffect } from 'react';

const CLOSE_SELECTOR = '.close-modal-btn, .close-modal-btn-white, .close-session-modal, [aria-label="Cerrar"]';

/**
 * Cierra el popup que está más arriba al presionar Escape, usando su propio
 * botón de cerrar (así se respeta la lógica de limpieza de cada popup).
 */
export function useModalEscape() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const overlays = document.querySelectorAll<HTMLElement>('.modal-overlay');
      const top = overlays[overlays.length - 1];
      const closeBtn = top?.querySelector<HTMLElement>(CLOSE_SELECTOR);
      if (closeBtn) {
        e.preventDefault();
        closeBtn.click();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
