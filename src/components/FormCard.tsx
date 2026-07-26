import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface FormCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const FormCard: React.FC<FormCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
}) => {
  return (
    <div className={`form-card ${className}`}>
      <div className="form-card-header">
        {Icon && (
          <div className="form-card-icon-badge">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h3 className="form-card-title">{title}</h3>
          {subtitle && <p className="form-card-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="form-card-body">{children}</div>
    </div>
  );
};

export default FormCard;
