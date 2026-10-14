import type { MouseEvent } from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** "sm" para buscadores dentro de listas o desplegables */
  size?: 'md' | 'sm';
  className?: string;
  autoFocus?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  size = 'md',
  className = '',
  autoFocus,
  onClick,
}: SearchBarProps) {
  return (
    <div className={`tk-search tk-search-${size} ${className}`} onClick={onClick} role="search">
      <span className="tk-search-icon" aria-hidden="true">
        <Search size={size === 'sm' ? 14 : 17} strokeWidth={2.25} />
      </span>
      <input
        type="search"
        className="tk-search-input"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="tk-search-clear" onClick={() => onChange('')} aria-label="Limpiar búsqueda">
          <X size={14} />
        </button>
      )}
      <span className="tk-search-line" aria-hidden="true" />
    </div>
  );
}
