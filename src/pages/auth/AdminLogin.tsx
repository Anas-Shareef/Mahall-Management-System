import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { VmOneLogo } from '../../components/VmOneLogo';
import { Shield, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft, LogIn, ArrowRight, UserPlus } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { loginWithEmail } = useAuth();
  const { branding } = useOrganization();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@mahal.com');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      setSuccessMsg('Login successful! Redirecting to admin workspace...');
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid admin credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dhic-login-page">
      <div className="dhic-login-card animate-fade-in">
        <div className="margin-bottom-sm flex-between align-items-center">
          <Link to="/login" className="back-gateway-link font-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Portal Gateway
          </Link>
          <span className="card-top-badge admin">ADMIN PORTAL</span>
        </div>

        {/* Brand Header */}
        <div className="dhic-brand-header">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.organizationName} style={{ height: 52, width: 'auto' }} />
          ) : (
            <VmOneLogo size={44} showWordmark={true} showTagline={false} />
          )}
          <h2 className="dhic-org-title">{branding.organizationName}</h2>
          <p className="dhic-org-sub">{branding.organizationNameMalayalam || 'ഒരുമ · സേവനം · വളർച്ച'}</p>
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

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="dhic-form-group">
            <label className="dhic-form-label">Admin Email Address *</label>
            <div className="dhic-input-wrapper">
              <Mail size={18} className="dhic-input-icon" />
              <input
                type="email"
                required
                className="dhic-input"
                placeholder="admin@mahal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="dhic-form-group">
            <label className="dhic-form-label">Password *</label>
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
                <span>Sign In to Admin Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Registration CTA Options */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="font-2xs font-weight-800 text-uppercase color-subtle text-center">Account Options & Registration</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link 
              to="/admin/signup" 
              className="pill-btn-ghost font-xs flex-center gap-xs"
              style={{ padding: '10px 14px', borderRadius: 9999, border: '1px solid #cbd5e1', textDecoration: 'none', color: '#01A350', fontWeight: 700, justifyContent: 'center' }}
            >
              <UserPlus size={14} /> Create Admin
            </Link>
            <Link 
              to="/member/login" 
              className="pill-btn-ghost font-xs flex-center gap-xs"
              style={{ padding: '10px 14px', borderRadius: 9999, border: '1px solid #cbd5e1', textDecoration: 'none', color: '#0746D3', fontWeight: 700, justifyContent: 'center' }}
            >
              <Shield size={14} /> Member Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
