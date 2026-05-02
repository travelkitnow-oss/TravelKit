import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content confirmation-modal animate-scale-in">
        <div className="modal-header">
          <div className="confirmation-icon-title">
            <div className={`confirmation-icon ${type}`}>
              <AlertTriangle size={20} />
            </div>
            <h3>{title}</h3>
          </div>
          <button onClick={onClose} className="close-modal-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <p>{message}</p>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
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
