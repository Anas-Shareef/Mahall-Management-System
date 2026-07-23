import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { Globe, User, CheckCircle, AlertCircle } from 'lucide-react';

export const SharedSettings: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { user, updateUserLanguage, updateUserProfile } = useAuth();
  
  // Profile Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleLanguageChange = async (lang: 'en' | 'ml') => {
    setLanguage(lang);
    document.body.setAttribute('lang', lang);
    await updateUserLanguage(lang);
    setSuccessMsg(t('settings.updateSuccess'));
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (!name) {
      setErrorMsg('Name is required');
      setIsSaving(false);
      return;
    }

    try {
      if (user) {
        await db.profiles.update(user.id, {
          name,
          email: email || null,
          phone: phone || null,
        });

        await updateUserProfile({
          name,
          email: email || null,
          phone: phone || null,
        });

        setSuccessMsg(t('settings.updateSuccess'));
        setTimeout(() => setSuccessMsg(''), 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-grid">
        {/* PROFILE CARD */}
        <div className="settings-card glass-card">
          <div className="card-header">
            <User size={20} className="header-icon" />
            <h4>{t('settings.profile')}</h4>
          </div>
          
          <form onSubmit={handleProfileSave} className="settings-form">
            {successMsg && (
              <div className="alert-msg success">
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="alert-msg error">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="settings-name-input">Full Name *</label>
              <input
                id="settings-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-phone-input">Mobile Phone</label>
              <input
                id="settings-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-email-input">Email Address</label>
              <input
                id="settings-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={isSaving} className="submit-btn primary-btn">
              {isSaving ? t('common.loading') : t('settings.saveSettings')}
            </button>
          </form>
        </div>

        {/* SYSTEM & LANGUAGE CARD */}
        <div className="settings-card glass-card">
          <div className="card-header">
            <Globe size={20} className="header-icon" />
            <h4>{t('settings.language')}</h4>
          </div>

          <div className="language-selector-section">
            <p className="section-prompt">{t('settings.languageSelect')}</p>
            <div className="lang-buttons-row">
              <button
                className={`lang-option-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                <span className="lang-label">English</span>
                <span className="lang-sub">System default translation</span>
              </button>

              <button
                className={`lang-option-btn ml-btn ${language === 'ml' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('ml')}
              >
                <span className="lang-label">മലയാളം</span>
                <span className="lang-sub">സ്ഥാപനത്തിന്റെ മാതൃഭാഷ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          align-items: flex-start;
        }

        .settings-card {
          padding: 24px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 24px;
        }

        .card-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        [data-theme="dark"] .card-header h4 {
          color: var(--gold-light);
        }

        .header-icon {
          color: var(--gold);
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
        }

        .form-group input {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-card);
          color: var(--text-main);
          transition: var(--transition-all);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-10);
        }

        .submit-btn {
          padding: 12px;
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 700;
          cursor: pointer;
        }

        /* ALERTS */
        .alert-msg {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
        }

        .alert-msg.success {
          background-color: var(--success-bg);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .alert-msg.error {
          background-color: var(--error-bg);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        /* LANGUAGE SELECTION */
        .language-selector-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-prompt {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .lang-buttons-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lang-option-btn {
          width: 100%;
          padding: 16px 20px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-app);
          cursor: pointer;
          transition: var(--transition-all);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .lang-option-btn:hover {
          border-color: var(--primary);
          background-color: var(--bg-card);
        }

        .lang-option-btn.active {
          border-color: var(--primary);
          background-color: var(--primary-10);
        }

        .lang-option-btn.active .lang-label {
          color: var(--primary);
          font-weight: 700;
        }

        .lang-label {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-main);
        }

        .ml-btn .lang-label {
          font-family: var(--font-ml);
          font-size: 17px;
        }

        .lang-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        @media (max-width: 991px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
export default SharedSettings;
