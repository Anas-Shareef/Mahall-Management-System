import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { VmOneLogo } from '../../components/VmOneLogo';
import { Shield, User, UserPlus, LogIn, ChevronRight, Globe } from 'lucide-react';

export const LoginGateway: React.FC = () => {
  const { language, setLanguage } = useTranslation();
  const { branding, getInitials } = useOrganization();

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ml' : 'en';
    setLanguage(nextLang);
    document.body.setAttribute('lang', nextLang);
  };

  return (
    <div className="gateway-page-container">
      <div className="gateway-top-bar">
        <button onClick={toggleLanguage} className="lang-toggle-btn">
          <Globe size={15} />
          <span>{language === 'en' ? 'മലയാളം' : 'English'}</span>
        </button>
      </div>

      <div className="gateway-content animate-fade-in">
        {/* Brand Header */}
        <div className="gateway-brand">
          {branding.logoUrl ? (
            <div className="brand-badge-box">
              <img src={branding.logoUrl} alt={branding.organizationName} className="brand-logo-img" />
            </div>
          ) : (
            <div className="margin-bottom-sm flex-center">
              <VmOneLogo size={52} showWordmark={true} showTagline={true} />
            </div>
          )}
          <h2 className="margin-top-xs">Vellikkeel Mahallu Organization for Native's Empowerment</h2>
          <p>Choose your portal to login or register your account</p>
        </div>

        {/* Portal Options Cards */}
        <div className="gateway-cards-grid">
          {/* Admin Portal Card */}
          <div className="portal-card admin-theme glass-card">
            <div className="card-top-badge admin">ADMIN PORTAL</div>
            <div className="portal-icon-wrapper admin">
              <Shield size={28} color="#ffffff" />
            </div>
            <h3>Admin Portal</h3>
            <p>Manage households, members, yearly subscriptions, offline payments, and broadcast notifications.</p>

            <div className="portal-card-actions">
              <Link to="/admin/login" className="portal-btn primary-admin">
                <LogIn size={16} />
                <span>Admin Login</span>
                <ChevronRight size={16} />
              </Link>
              <Link to="/admin/signup" className="portal-btn outline-admin">
                <UserPlus size={15} />
                <span>Create Admin Account</span>
              </Link>
            </div>
          </div>

          {/* Member Portal Card */}
          <div className="portal-card member-theme glass-card">
            <div className="card-top-badge member">MEMBER PORTAL</div>
            <div className="portal-icon-wrapper member">
              <User size={28} color="#ffffff" />
            </div>
            <h3>Member Portal</h3>
            <p>View your household details, yearly subscription dues, payment timeline, and receipts history.</p>

            <div className="portal-card-actions">
              <Link to="/member/login" className="portal-btn primary-member">
                <LogIn size={16} />
                <span>Member Login</span>
                <ChevronRight size={16} />
              </Link>
              <Link to="/member/signup" className="portal-btn outline-member">
                <UserPlus size={15} />
                <span>Register Member Account</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="gateway-footer">
          © {new Date().getFullYear()} Vellikkeel Hidayathul Islam Mahallu Committee • Private Portal
        </div>
      </div>

      <style>{`
        .gateway-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f2f4f7;
          padding: 32px 24px;
          position: relative;
        }

        .gateway-top-bar {
          position: absolute;
          top: 24px;
          right: 24px;
        }

        .lang-toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          font-weight: 600;
          font-size: 13px;
          color: var(--primary);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
        }

        .gateway-content {
          width: 100%;
          max-width: 860px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }

        .gateway-brand {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .brand-badge-box {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #ff7a00 0%, #ff9500 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 8px 20px rgba(255, 122, 0, 0.35);
        }

        .brand-badge-box span {
          color: #ffffff;
          font-weight: 800;
          font-size: 30px;
          line-height: 1;
        }

        .gateway-brand h1 {
          font-family: var(--font-ml);
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .gateway-brand h2 {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          margin-top: 2px;
        }

        .gateway-brand p {
          font-size: 13px;
          color: #9ca3af;
          margin-top: 6px;
        }

        /* Cards Grid */
        .gateway-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          width: 100%;
        }

        .portal-card {
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          background: #ffffff;
        }

        .card-top-badge {
          position: absolute;
          top: 16px;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 3px 10px;
          border-radius: 6px;
        }
        .card-top-badge.admin { background: #ecfdf5; color: #00966b; }
        .card-top-badge.member { background: #fff7ed; color: #ea580c; }

        .portal-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 12px 0 16px;
        }
        .portal-icon-wrapper.admin {
          background: linear-gradient(135deg, #00966b 0%, #037a57 100%);
          box-shadow: 0 8px 20px rgba(0, 150, 107, 0.35);
        }
        .portal-icon-wrapper.member {
          background: linear-gradient(135deg, #ff7a00 0%, #ea580c 100%);
          box-shadow: 0 8px 20px rgba(255, 122, 0, 0.35);
        }

        .portal-card h3 {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
        }

        .portal-card p {
          font-size: 13px;
          color: #6b7280;
          margin: 8px 0 24px;
          line-height: 1.45;
          flex: 1;
        }

        .portal-card-actions {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .portal-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 14px;
          transition: var(--transition-all);
        }

        .primary-admin {
          background: #00966b;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35);
        }
        .primary-admin:hover { background: #00b380; }

        .outline-admin {
          background: #f0fdf4;
          color: #00966b;
          border: 1px solid #a7f3d0;
        }
        .outline-admin:hover { background: #d1fae5; }

        .primary-member {
          background: #ea580c;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);
        }
        .primary-member:hover { background: #f97316; }

        .outline-member {
          background: #fff7ed;
          color: #ea580c;
          border: 1px solid #ffedd5;
        }
        .outline-member:hover { background: #ffedd5; }

        .gateway-footer {
          font-size: 11px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        @media (max-width: 768px) {
          .gateway-cards-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default LoginGateway;
