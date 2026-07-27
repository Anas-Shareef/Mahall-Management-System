import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { VmOneLogo } from '../../components/VmOneLogo';
import { Mail, Lock, Shield, User, LogIn, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export const LoginGateway: React.FC = () => {
  const { loginWithEmail } = useAuth();
  const { branding } = useOrganization();
  const navigate = useNavigate();

  const [activeRoleTab, setActiveRoleTab] = useState<'admin' | 'treasurer' | 'secretary' | 'president' | 'member'>('admin');
  const [email, setEmail] = useState('admin@mahal.com');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleCredentials = {
    admin: { email: 'admin@mahal.com', label: 'Admin Portal', desc: 'Full Mahallu Management Control' },
    treasurer: { email: 'treasurer@mahal.com', label: 'Treasurer', desc: 'Financial Collections & Dues' },
    secretary: { email: 'secretary@mahal.com', label: 'Secretary', desc: 'Directory & Community Records' },
    president: { email: 'president@mahal.com', label: 'President', desc: 'Executive Oversight & Reports' },
    member: { email: 'member@mahal.com', label: 'Member Portal', desc: 'Personal Subscriptions & Dues' },
  };

  const handleRoleSelect = (roleKey: 'admin' | 'treasurer' | 'secretary' | 'president' | 'member') => {
    setActiveRoleTab(roleKey);
    setEmail(roleCredentials[roleKey].email);
    setPassword('password123');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      setSuccessMsg('Login successful! Redirecting to workspace...');
      setTimeout(() => {
        if (activeRoleTab === 'member') {
          navigate('/member/dashboard');
        } else {
          navigate('/admin/dashboard');
        }
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify your email & password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dhic-login-page">
      <div className="dhic-login-card animate-fade-in">
        {/* Brand Header */}
        <div className="dhic-brand-header">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.organizationName} style={{ height: 56, width: 'auto' }} />
          ) : (
            <VmOneLogo size={46} showWordmark={true} showTagline={false} />
          )}
          <h2 className="dhic-org-title">{branding.organizationName}</h2>
          <p className="dhic-org-sub">{branding.organizationNameMalayalam || 'ഒരുമ · സേവനം · വളർച്ച'}</p>
        </div>

        {/* DHIC Academic Role Selection Tabs */}
        <div className="dhic-role-tabs-wrap">
          <button
            type="button"
            className={`dhic-role-tab-btn ${activeRoleTab === 'admin' ? 'active' : ''}`}
            onClick={() => handleRoleSelect('admin')}
          >
            <Shield size={14} /> Admin
          </button>
          <button
            type="button"
            className={`dhic-role-tab-btn ${activeRoleTab === 'treasurer' ? 'active' : ''}`}
            onClick={() => handleRoleSelect('treasurer')}
          >
            Treasurer
          </button>
          <button
            type="button"
            className={`dhic-role-tab-btn ${activeRoleTab === 'secretary' ? 'active' : ''}`}
            onClick={() => handleRoleSelect('secretary')}
          >
            Secretary
          </button>
          <button
            type="button"
            className={`dhic-role-tab-btn ${activeRoleTab === 'president' ? 'active' : ''}`}
            onClick={() => handleRoleSelect('president')}
          >
            President
          </button>
          <button
            type="button"
            className={`dhic-role-tab-btn ${activeRoleTab === 'member' ? 'active' : ''}`}
            onClick={() => handleRoleSelect('member')}
          >
            <User size={14} /> Member
          </button>
        </div>

        {/* Error / Success Banners */}
        {errorMsg && (
          <div className="auth-alert error margin-bottom-md">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success margin-bottom-md">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* DHIC Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="dhic-form-group">
            <label className="dhic-form-label">Email Address / Username</label>
            <div className="dhic-input-wrapper">
              <Mail size={18} className="dhic-input-icon" />
              <input
                type="email"
                required
                className="dhic-input"
                placeholder="email@mahal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="dhic-form-group">
            <label className="dhic-form-label">Password</label>
            <div className="dhic-input-wrapper">
              <Lock size={18} className="dhic-input-icon" />
              <input
                type="password"
                required
                className="dhic-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="dhic-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <span>Signing In...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In to {roleCredentials[activeRoleTab].label}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credential Chips */}
        <div className="dhic-demo-chips-wrap">
          <div className="dhic-demo-title">Quick Demo Login Chips (1-Click Fill)</div>
          <div className="dhic-demo-chips-grid">
            <button type="button" className="dhic-demo-chip" onClick={() => handleRoleSelect('admin')}>
              🛡️ Admin
            </button>
            <button type="button" className="dhic-demo-chip" onClick={() => handleRoleSelect('treasurer')}>
              💵 Treasurer
            </button>
            <button type="button" className="dhic-demo-chip" onClick={() => handleRoleSelect('secretary')}>
              📋 Secretary
            </button>
            <button type="button" className="dhic-demo-chip" onClick={() => handleRoleSelect('president')}>
              👑 President
            </button>
            <button type="button" className="dhic-demo-chip" onClick={() => handleRoleSelect('member')}>
              👤 Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginGateway;
