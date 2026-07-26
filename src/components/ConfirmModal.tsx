import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (variant === 'danger') {
      return <Trash2 size={24} className="confirm-icon-danger" />;
    }
    if (variant === 'warning') {
      return <AlertTriangle size={24} className="confirm-icon-warning" />;
    }
    return <Info size={24} className="confirm-icon-info" />;
  };

  const confirmJSX = (
    <div
      className="global-confirm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="global-confirm-card animate-scale-up">
        {/* ICON BADGE */}
        <div className={`confirm-badge-box badge-${variant}`}>
          {renderIcon()}
        </div>

        {/* TITLE & SUBTITLE */}
        <h3 className="confirm-title-text">{title}</h3>
        <div className="confirm-message-text">{message}</div>

        {/* ACTIONS */}
        <div className="confirm-actions-group">
          <button
            type="button"
            className={`confirm-btn-primary btn-${variant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
          <button
            type="button"
            className="confirm-btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(confirmJSX, document.body);
};

export default ConfirmModal;
