import type { ReactNode } from 'react';

interface TableEmptyProps {
  /** Cantidad de columnas de la tabla, para ocupar toda la fila */
  colSpan: number;
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  /** Muestra el indicador de carga en lugar del ícono */
  loading?: boolean;
}

/** Fila de estado vacío o de carga, con el mismo diseño en todas las tablas */
export default function TableEmpty({ colSpan, icon, title, text, action, loading }: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="tk-empty-cell">
        <div className="tk-empty">
          {loading ? <div className="loader-premium" /> : icon && <div className="tk-empty-icon">{icon}</div>}
          <h4>{title}</h4>
          {text && <p>{text}</p>}
          {action}
        </div>
      </td>
    </tr>
  );
}
