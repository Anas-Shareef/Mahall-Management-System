import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { VmOneLogo } from '../components/VmOneLogo';

export const LanguageSelect: React.FC = () => {
  const { setLanguage } = useTranslation();
  const { branding } = useOrganization();
  const navigate = useNavigate();

  const handleSelect = (lang: 'en' | 'ml') => {
    setLanguage(lang);
    document.body.setAttribute('lang', lang);
    navigate('/login');
  };

  return (
    <div className="language-select-container">
      <div className="language-card animate-fade-in">
        <div className="logo-section">
          {branding.logoUrl ? (
            <div className="brand-logo-icon">
              <img src={branding.logoUrl} alt={branding.organizationName} className="brand-logo-img" />
            </div>
          ) : (
            <div className="margin-bottom-sm flex-center">
              <VmOneLogo size={48} showWordmark={true} showTagline={true} />
            </div>
          )}
          <h2 className="title-en margin-top-xs">Vellikkeel Mahallu Organization for Native's Empowerment</h2>
        </div>

        <div className="selection-divider"></div>

        <div className="instruction-section">
          <h3 className="prompt-en">Select Your Language</h3>
          <h3 className="prompt-ml">നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക</h3>
        </div>

        <div className="button-group">
          <button 
            onClick={() => handleSelect('en')} 
            className="lang-pill-btn btn-en"
            aria-label="Select English"
          >
            <span className="lang-text">English</span>
            <span className="lang-subtext">Click to continue in English</span>
          </button>
          
          <button 
            onClick={() => handleSelect('ml')} 
            className="lang-pill-btn btn-ml"
            aria-label="Select Malayalam"
          >
            <span className="lang-text">മലയാളം</span>
            <span className="lang-subtext">മലയാളത്തിൽ തുടരുവാൻ ക്ലിക്ക് ചെയ്യുക</span>
          </button>
        </div>

        <div className="footer-copyright">
          © {new Date().getFullYear()} Vellikkeel Hidayathul Islam Mahallu Committee
        </div>
      </div>

      <style>{`
        .language-select-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f2f4f7;
          padding: 24px;
        }

        .language-card {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 40px 32px;
          box-shadow: var(--shadow-floating);
          text-align: center;
        }

        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }

        .brand-logo-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #ff7a00 0%, #ff9500 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 8px 20px rgba(255, 122, 0, 0.35);
        }

        .brand-logo-icon span {
          color: #ffffff;
          font-weight: 800;
          font-size: 32px;
          line-height: 1;
        }

        .title-ml {
          font-family: var(--font-ml);
          color: #111827;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .title-en {
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .selection-divider {
          height: 1px;
          background: var(--border-color);
          margin: 24px 0;
        }

        .instruction-section {
          margin-bottom: 24px;
        }

        .prompt-en {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 2px;
        }

        .prompt-ml {
          font-family: var(--font-ml);
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        .button-group {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 28px;
        }

        .lang-pill-btn {
          width: 100%;
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          background: #ffffff;
          cursor: pointer;
          transition: var(--transition-all);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          box-shadow: var(--shadow-sm);
        }

        .lang-pill-btn:hover {
          background: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 8px 20px rgba(0, 150, 107, 0.35);
          transform: translateY(-2px);
        }

        .lang-pill-btn:hover .lang-text,
        .lang-pill-btn:hover .lang-subtext {
          color: #ffffff;
        }

        .lang-text {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
        }

        .btn-ml .lang-text {
          font-family: var(--font-ml);
          font-size: 19px;
        }

        .lang-subtext {
          font-size: 11px;
          color: #6b7280;
        }

        .footer-copyright {
          font-size: 10.5px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
      `}</style>
    </div>
  );
};

export default LanguageSelect;
