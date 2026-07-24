import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Mail, Lock, User, Phone, AlertCircle, CheckCircle, ArrowLeft, LogIn } from 'lucide-react';

export const AdminSignup: React.FC = () => {
  const { t } = useTranslation();
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (password.length < 5) {
      setErrorMsg('Password must be at least 5 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await signUpWithEmail({
        name,
        email,
        password,
        phone: phone || undefined,
        role: 'admin',
      });

      setSuccessMsg('Admin Account registered successfully! Redirecting...');
      setTimeout(() => {
        navigate('/admin/dashboard');
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
        <Link to="/admin/login" className="back-gateway-link">
          <ArrowLeft size={16} />
          <span>Back to Admin Login</span>
        </Link>
      </div>

      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div className="admin-badge-icon">
            <Shield size={24} color="#ffffff" />
          </div>
          <h1>Create Admin Account</h1>
          <p>Register new Admin credentials on Supabase</p>
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
            <label htmlFor="admin-name">Full Name *</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="admin-name"
                type="text"
                required
                placeholder="Mahallu Committee Admin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="admin-email">Email Address *</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="admin-email"
                type="email"
                required
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="admin-phone">Phone Number</label>
            <div className="input-with-icon">
              <Phone size={18} className="input-icon" />
              <input
                id="admin-phone"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="input-row-grid">
            <div className="input-group">
              <label htmlFor="admin-password">Password *</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="admin-confirm">Confirm Password *</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="admin-confirm"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="primary-pill-btn">
            {isSubmitting ? t('common.loading') : 'Register Admin Account'}
          </button>
        </form>

        <div className="auth-footer-links">
          <p>Already have an Admin account?</p>
          <Link to="/admin/login" className="signup-link">
            <LogIn size={15} />
            <span>Sign In to Admin Portal</span>
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
          max-width: 480px;
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

        .admin-badge-icon {
          width: 54px;
          height: 54px;
          background: linear-gradient(135deg, #00966b 0%, #037a57 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 6px 16px rgba(0, 150, 107, 0.35);
        }

        .auth-header h1 {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
        }

        .auth-header p {
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

        .input-row-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
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
          color: var(--primary);
        }

        @media (max-width: 576px) {
          .input-row-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default AdminSignup;
