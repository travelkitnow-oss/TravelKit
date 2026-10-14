import type { ReactNode } from 'react';
import './PageHeader.css';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Sección del menú a la que pertenece la página (ej. "Viaje") */
  section?: string;
  /** Botones o controles alineados a la derecha */
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, section, actions }: PageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header-text">
        {section && <span className="admin-page-section">{section}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="admin-page-header-actions">{actions}</div>}
    </header>
  );
}
