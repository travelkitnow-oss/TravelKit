import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logger } from '../lib/logger';

export default function NavigationLogger() {
  const location = useLocation();

  useEffect(() => {
    logger.info('Navigation', `Navegación a: ${location.pathname}${location.search}${location.hash}`);
  }, [location]);

  return null;
}
