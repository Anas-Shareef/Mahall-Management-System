import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  quickActions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
  closeOnOverlayClick?: boolean;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  quickActions,
  size = 'lg',
  children,
  footer,
  showCloseButton = true,
  className = '',
  closeOnOverlayClick = true,
}) => {
  // Lock body scroll and trigger keyboard ESC handler
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
        return 'side-panel-size-sm';
      case 'md':
        return 'side-panel-size-md';
      case 'lg':
        return 'side-panel-size-lg';
      case 'full':
        return 'side-panel-size-full';
      default:
        return 'side-panel-size-lg';
    }
  };

  return (
    <div
      className="global-side-panel-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`global-side-panel-container ${getSizeClass()} ${className}`}>
        {/* STICKY HEADER */}
        <div className="side-panel-header">
          <div className="modal-title-group">
            {icon && <div className="modal-header-icon-box">{icon}</div>}
            <div>
              <h3 className="modal-title-text">{title}</h3>
              {subtitle && <p className="modal-subtitle-text">{subtitle}</p>}
            </div>
          </div>

          <div className="flex-row-gap-xs align-items-center">
            {quickActions}
            {showCloseButton && (
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={onClose}
                aria-label="Close Panel"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* SCROLLABLE INDEPENDENT BODY */}
        <div className="side-panel-body">{children}</div>

        {/* STICKY FOOTER (FOR FORMS & ACTIONS) */}
        {footer && <div className="side-panel-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default SidePanel;
