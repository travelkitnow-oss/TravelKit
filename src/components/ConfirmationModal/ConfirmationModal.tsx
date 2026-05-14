import React from 'react';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return <AlertTriangle size={24} />;
      case 'warning': return <AlertCircle size={24} />;
      case 'info': return <Info size={24} />;
      default: return <AlertTriangle size={24} />;
    }
  };

  return (
    <div className="modal-overlay confirmation-overlay">
      <div className={`modal-content-pro confirmation-modal-pro animate-modal-in ${type}`}>
        <div className="modal-header-pro">
          <div className="header-left">
            <div className={`header-icon-box ${type}`}>
              {getIcon()}
            </div>
            <div className="header-text">
              <h3>{title}</h3>
              <p>{type === 'danger' ? 'Acción Requerida' : 'Confirmación'}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-modal-btn" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body-pro">
          <p className="confirmation-message">{message}</p>
        </div>
        
        <div className="modal-footer-pro">
          <button className="btn-modal btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            className={`btn-modal btn-confirm ${type}`} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
