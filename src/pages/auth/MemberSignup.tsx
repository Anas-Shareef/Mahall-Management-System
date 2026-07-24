import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { User, Phone, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft, LogIn } from 'lucide-react';

export const MemberSignup: React.FC = () => {
  const { t } = useTranslation();
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 5) {
      setErrorMsg('Password must be at least 5 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await signUpWithEmail({
        name,
        email: email || `${phone}@mahal.local`,
        password,
        phone,
        role: 'member',
      });

      setSuccessMsg('Member Account registered successfully! Redirecting...');
      setTimeout(() => {
        navigate('/member/dashboard');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-top-bar">
        <Link to="/member/login" className="back-gateway-link">
          <ArrowLeft size={16} />
          <span>Back to Member Login</span>
        </Link>
      </div>

      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div className="member-badge-icon">
            <User size={24} color="#ffffff" />
          </div>
          <h1>Member Account Sign Up</h1>
          <p>പുതിയ അംഗത്തിന് രജിസ്റ്റർ ചെയ്യാം</p>
        </div>

        {errorMsg && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="member-name">Full Name *</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="member-name"
                type="text"
                required
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="member-phone-input">Phone Number *</label>
            <div className="input-with-icon">
              <Phone size={18} className="input-icon" />
              <input
                id="member-phone-input"
                type="tel"
                required
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="member-email-input">Email Address (Optional)</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="member-email-input"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="member-password-input">Password *</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="member-password-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="primary-pill-btn">
            {isSubmitting ? t('common.loading') : 'Register Member Account'}
          </button>
        </form>

        <div className="auth-footer-links">
          <p>Already registered?</p>
          <Link to="/member/login" className="signup-link">
            <LogIn size={15} />
            <span>Sign In to Member Portal</span>
          </Link>
        </div>
      </div>

      <style>{`
        .auth-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f2f4f7;
          padding: 24px;
          position: relative;
        }

        .auth-top-bar {
          position: absolute;
          top: 24px;
          left: 24px;
        }

        .back-gateway-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          background: #ffffff;
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 36px 32px;
          box-shadow: var(--shadow-floating);
        }

        .auth-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 24px;
        }

        .member-badge-icon {
          width: 54px;
          height: 54px;
          background: linear-gradient(135deg, #ff7a00 0%, #ff9500 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 6px 16px rgba(255, 122, 0, 0.35);
        }

        .auth-header h1 {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
        }

        .auth-header p {
          font-family: var(--font-ml);
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .auth-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          margin-bottom: 20px;
          font-size: 13px;
        }
        .auth-alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .auth-alert.success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
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
          padding: 11px 14px 11px 42px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
          transition: var(--transition-all);
        }

        .input-with-icon input:focus {
          outline: none;
          border-color: var(--primary);
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12);
        }

        .primary-pill-btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: var(--radius-pill);
          background: var(--primary);
          color: #ffffff;
          font-weight: 700;
          font-size: 14.5px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35);
          transition: var(--transition-all);
          margin-top: 6px;
        }

        .primary-pill-btn:hover {
          background: var(--primary-light);
        }

        .auth-footer-links {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .auth-footer-links p { font-size: 12px; color: #6b7280; }

        .signup-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #ea580c;
        }
      `}</style>
    </div>
  );
};

export default MemberSignup;
