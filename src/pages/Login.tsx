import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Smartphone, Key, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { loginWithEmail, sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'admin' | 'member'>('admin');
  
  // Admin Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Member Form States
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ml' : 'en';
    setLanguage(nextLang);
    document.body.setAttribute('lang', nextLang);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      setSuccessMsg(t('common.saveSuccess'));
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.invalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await sendOTP(phone);
      setOtpSent(true);
      setSuccessMsg(t('auth.otpSent'));
    } catch (err: any) {
      setErrorMsg(err.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await verifyOTP(phone, otp);
      setSuccessMsg(t('common.saveSuccess'));
      setTimeout(() => {
        navigate('/member/dashboard');
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.incorrectOtp'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Top Header Controls */}
      <div className="login-controls">
        <button onClick={toggleLanguage} className="lang-toggle-btn">
          {language === 'en' ? 'മലയാളം' : 'English'}
        </button>
      </div>

      <div className="login-card animate-fade-in">
        {/* Branding header */}
        <div className="login-branding">
          <div className="emblem-container">
            <span>VH</span>
          </div>
          <h1>{t('auth.loginTitle')}</h1>
          <p>{t('auth.loginSubtitle')}</p>
        </div>

        {/* Role Tabs */}
        <div className="role-tabs">
          <button
            onClick={() => {
              setRole('admin');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`tab-btn ${role === 'admin' ? 'active' : ''}`}
          >
            <Shield size={16} />
            <span>{t('auth.adminLogin')}</span>
          </button>
          <button
            onClick={() => {
              setRole('member');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`tab-btn ${role === 'member' ? 'active' : ''}`}
          >
            <Smartphone size={16} />
            <span>{t('auth.memberLogin')}</span>
          </button>
        </div>

        {/* Message Alert Banners */}
        {errorMsg && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Role Forms */}
        {role === 'admin' ? (
          <form onSubmit={handleAdminSubmit} className="login-form">
            <div className="input-group">
              <label htmlFor="admin-email">{t('auth.email')}</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  placeholder="admin@mahal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="admin-password">{t('auth.password')}</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="submit-btn primary-btn">
              {isSubmitting ? t('common.loading') : t('auth.login')}
            </button>
          </form>
        ) : (
          <div className="login-form">
            {!otpSent ? (
              <form onSubmit={handleSendOTP}>
                <div className="input-group">
                  <label htmlFor="member-phone">{t('auth.mobileNumber')}</label>
                  <p className="field-hint">{t('auth.receiveOtp')}</p>
                  <div className="input-with-icon">
                    <Smartphone size={18} className="input-icon" />
                    <input
                      id="member-phone"
                      type="tel"
                      required
                      placeholder={t('auth.phonePlaceholder')}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="submit-btn primary-btn">
                  {isSubmitting ? t('common.loading') : t('auth.login')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <div className="input-group">
                  <label htmlFor="member-otp">{t('auth.otp')}</label>
                  <p className="field-hint">{t('auth.phonePlaceholder')}: <b>{phone}</b></p>
                  <div className="input-with-icon">
                    <Key size={18} className="input-icon" />
                    <input
                      id="member-otp"
                      type="text"
                      required
                      placeholder={t('auth.otpPlaceholder')}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                  <p className="otp-helper-hint">Demo code: <b>123456</b></p>
                </div>

                <div className="otp-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setErrorMsg('');
                    }}
                    className="back-btn"
                  >
                    {t('common.back')}
                  </button>
                  <button type="submit" disabled={isSubmitting} className="submit-btn primary-btn">
                    {isSubmitting ? t('common.loading') : t('auth.verify')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          padding: 20px;
          position: relative;
        }

        [data-theme="dark"] .login-container {
          background: #f0f4f2;
        }

        .login-controls {
          position: absolute;
          top: 20px;
          right: 20px;
        }

        .lang-toggle-btn {
          padding: 8px 16px;
          border: 1.5px solid #1a4731;
          border-radius: var(--radius-sm);
          background: transparent;
          color: #1a4731;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .lang-toggle-btn:hover {
          background: #1a4731;
          color: white;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 40px 32px;
          box-shadow: var(--shadow-floating);
        }

        .login-branding {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 28px;
        }

        .brand-logo-icon {
          width: 54px;
          height: 54px;
          background: linear-gradient(135deg, #ff7a00 0%, #ff9500 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          box-shadow: 0 6px 16px rgba(255, 122, 0, 0.35);
        }

        .brand-logo-icon span {
          color: #ffffff;
          font-weight: 800;
          font-size: 28px;
          line-height: 1;
        }

        .login-branding h1 {
          font-family: var(--font-ml);
          font-size: 19px;
          font-weight: 700;
          color: #111827;
          line-height: 1.3;
          margin-bottom: 4px;
        }

        .login-branding p {
          font-size: 11.5px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        /* Pill Tabs */
        .role-tabs {
          display: flex;
          background: #f3f4f6;
          border-radius: var(--radius-pill);
          padding: 4px;
          margin-bottom: 24px;
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border: none;
          background: transparent;
          color: #6b7280;
          font-weight: 600;
          font-size: 13px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: var(--transition-all);
        }

        .tab-btn.active {
          background: var(--primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 150, 107, 0.35);
        }

        .alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          margin-bottom: 20px;
          font-size: 13px;
        }

        .alert-error {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .alert-success {
          background-color: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
        }

        .field-hint {
          font-size: 11px;
          color: #9ca3af;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #9ca3af;
        }

        .input-with-icon input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 14px;
          transition: var(--transition-all);
        }

        .input-with-icon input::placeholder {
          color: #9ca3af;
        }

        .input-with-icon input:focus {
          outline: none;
          border-color: var(--primary);
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12);
        }

        .otp-helper-hint {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
          text-align: right;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 14.5px;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .primary-btn {
          background: var(--primary);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35);
        }

        .primary-btn:hover {
          background: var(--primary-light);
          box-shadow: 0 6px 18px rgba(0, 150, 107, 0.45);
        }

        .primary-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .otp-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .back-btn {
          flex: 1;
          padding: 12px;
          background: #f3f4f6;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          color: #374151;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-all);
          text-align: center;
        }

        .back-btn:hover {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  );
};
export default Login;
