import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import type { Language } from '../contexts/LanguageContext';

export const LanguageSelect: React.FC = () => {
  const { setLanguage } = useTranslation();
  const navigate = useNavigate();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    // Set document lang attribute for typography adjustments
    document.body.setAttribute('lang', lang);
    navigate('/login');
  };

  return (
    <div className="language-select-container">
      <div className="language-card animate-fade-in">
        <div className="logo-section">
          {/* Elegant Emblem representation */}
          <div className="logo-emblem">
            <span>VH</span>
          </div>
          <h1 className="title-ml">വെള്ളിക്കീൽ ഹിദായത്തുൽ ഇസ്ലാം മഹല്ല് കമ്മിറ്റി</h1>
          <h2 className="title-en">Vellikkeel Hidayathul Islam Mahallu Committee</h2>
        </div>

        <div className="selection-divider"></div>

        <div className="instruction-section">
          <h3 className="prompt-en">Select Your Language</h3>
          <h3 className="prompt-ml">നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക</h3>
        </div>

        <div className="button-group">
          <button 
            onClick={() => handleSelect('en')} 
            className="lang-btn btn-en"
            aria-label="Select English"
          >
            <span className="lang-text">English</span>
            <span className="lang-subtext">Click to continue in English</span>
          </button>
          
          <button 
            onClick={() => handleSelect('ml')} 
            className="lang-btn btn-ml"
            aria-label="Select Malayalam"
          >
            <span className="lang-text">മലയാളം</span>
            <span className="lang-subtext">മലയാളത്തിൽ തുടരുവാൻ ക്ലിക്ക് ചെയ്യുക</span>
          </button>
        </div>

        <div className="footer-copyright">
          © {new Date().getFullYear()} Vellikkeel Hidayathul Islam Mahallu Committee. All Rights Reserved.
        </div>
      </div>

      <style>{`
        .language-select-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--primary-dark) 0%, #032b21 50%, #0c362a 100%);
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        /* Decorative Background Circles */
        .language-select-container::before,
        .language-select-container::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, var(--gold-10) 0%, transparent 70%);
          z-index: 1;
        }

        .language-select-container::before {
          width: 600px;
          height: 600px;
          top: -200px;
          right: -100px;
        }

        .language-select-container::after {
          width: 500px;
          height: 500px;
          bottom: -150px;
          left: -150px;
        }

        .language-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 520px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-lg);
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
        }

        [data-theme="dark"] .language-card {
          background: rgba(19, 27, 46, 0.95);
          border-color: rgba(255, 255, 255, 0.05);
        }

        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
        }

        .logo-emblem {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
          border: 3px solid var(--gold);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }

        .logo-emblem span {
          color: var(--gold);
          font-weight: 800;
          font-size: 24px;
          letter-spacing: -1px;
        }

        .title-ml {
          font-family: var(--font-ml);
          color: var(--primary);
          font-size: 22px;
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 6px;
        }

        .title-en {
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        [data-theme="dark"] .title-ml {
          color: var(--gold);
        }
        [data-theme="dark"] .title-en {
          color: var(--text-muted);
        }

        .selection-divider {
          height: 2px;
          background: linear-gradient(to right, transparent, var(--gold), transparent);
          margin: 20px 0;
        }

        .instruction-section {
          margin-bottom: 28px;
        }

        .prompt-en {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 4px;
        }

        .prompt-ml {
          font-family: var(--font-ml);
          font-size: 18px;
          font-weight: 700;
          color: var(--primary-light);
        }

        [data-theme="dark"] .prompt-ml {
          color: #a7f3d0;
        }

        .button-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 30px;
        }

        .lang-btn {
          width: 100%;
          padding: 16px 24px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-card);
          cursor: pointer;
          transition: var(--transition-all);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          box-shadow: var(--shadow-sm);
        }

        .lang-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--primary);
        }

        .btn-en:hover {
          background: var(--primary-10);
        }

        .btn-ml:hover {
          background: var(--gold-10);
          border-color: var(--gold);
        }

        .lang-text {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary);
        }

        .btn-ml .lang-text {
          font-family: var(--font-ml);
          font-size: 20px;
        }

        [data-theme="dark"] .lang-text {
          color: var(--text-main);
        }

        .lang-subtext {
          font-size: 11px;
          color: var(--text-muted);
        }

        .footer-copyright {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
};
export default LanguageSelect;
