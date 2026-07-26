import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
  closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'lg',
  children,
  footer,
  showCloseButton = true,
  className = '',
  closeOnOverlayClick = true,
}) => {
  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'modal-size-sm';
      case 'md':
        return 'modal-size-md';
      case 'lg':
        return 'modal-size-lg';
      case 'xl':
        return 'modal-size-xl';
      case 'full':
        return 'modal-size-full';
      default:
        return 'modal-size-lg';
    }
  };

  const modalJSX = (
    <div
      className="global-modal-overlay animate-fade-in"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`global-modal-card ${getSizeClass()} ${className}`}>
        {/* STICKY HEADER */}
        <div className="global-modal-header">
          <div className="modal-title-group">
            {icon && <div className="modal-header-icon-box">{icon}</div>}
            <div>
              <h3 className="modal-title-text">{title}</h3>
              {subtitle && <p className="modal-subtitle-text">{subtitle}</p>}
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={onClose}
              aria-label="Close Modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* SCROLLABLE CONTENT BODY */}
        <div className="global-modal-body">
          {children}
        </div>

        {/* STICKY FOOTER */}
        {footer && (
          <div className="global-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};

export default Modal;
