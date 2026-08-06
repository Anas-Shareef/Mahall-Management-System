import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { db } from '../services/db';
import type { Member } from '../services/db';
import { 
  ShieldCheck, Mail, Lock, UserCheck, AlertTriangle, RefreshCcw, Power, 
  Eye, EyeOff, Copy, Check, Sparkles
} from 'lucide-react';

interface GrantAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  houseNo?: string;
  onSuccess: () => void;
}

// Malayalam to English Transliteration Helper
const generateEnglishEmailSlug = (name: string, memberId: string): string => {
  if (!name) return `member_${memberId.slice(0, 6)}@mahal.com`;

  // Dictionary for common Malayalam names
  const malayalamMap: { [key: string]: string } = {
    'അബൂബക്കർ': 'aboobackar',
    'അബൂബക്കര്': 'aboobackar',
    'മുഹമ്മദ്': 'muhammed',
    'ആയിഷ': 'aisha',
    'അബ്ദുല്ല': 'abdulla',
    'ഉമർ': 'umar',
    'ഉസ്മാൻ': 'usman',
    'അലി': 'ali',
    'ഫാത്തിമ': 'fathima',
    'സൈനബ': 'zainaba',
    'മർയം': 'maryam',
    'ഇബ്രാഹിം': 'ibrahim',
    'യൂസഫ്': 'yousaf',
    'സുഹറ': 'suhara',
    'ഖദീജ': 'khadeeja',
    'ഹാജറ': 'hajara',
    'റസിയ': 'raziya',
    'ഹമീദ്': 'hameed',
    'സലീം': 'saleem',
    'റഫീഖ്': 'rafeeq',
    'ഷഫീഖ്': 'shafeeq',
    'അഷ്റഫ്': 'ashraf',
    'മുസ്തഫ': 'musthafa',
    'സാദിഖ്': 'sadiq',
    'കബീർ': 'kabeer',
  };

  const trimmed = name.trim();
  if (malayalamMap[trimmed]) {
    return `${malayalamMap[trimmed]}@mahal.com`;
  }

  // Check for any non-ASCII (Malayalam) characters
  const isNonAscii = /[^\x00-\x7F]/.test(trimmed);
  if (isNonAscii) {
    const cleanId = memberId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    return `member_${cleanId || 'user'}@mahal.com`;
  }

  // Standard English name
  const cleanEnglish = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

  return `${cleanEnglish || 'member'}@mahal.com`;
};

export const GrantAccessModal: React.FC<GrantAccessModalProps> = ({
  isOpen,
  onClose,
  member,
  houseNo = '',
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Mahall@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (member) {
      if (member.email && !/[^\x00-\x7F]/.test(member.email)) {
        setEmail(member.email);
      } else {
        setEmail(generateEnglishEmailSlug(member.name, member.id));
      }
      setPassword('Mahall@12345');
      setErrorMsg('');
      setSuccessMsg('');
      setCopied(false);
    }
  }, [member]);

  if (!member) return null;

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Ensure valid email syntax without Malayalam characters
    if (/[^\x00-\x7F]/.test(email)) {
      setErrorMsg('Login email address must contain English characters only (e.g. aboobackar@mahal.com).');
      return;
    }

    setIsSubmitting(true);

    try {
      await db.members.grantPortalAccess(member.id, email, password);
      setSuccessMsg(`✓ Portal access granted successfully to ${member.name}!`);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to grant portal access. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'suspended' | 'revoked') => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await db.members.updatePortalStatus(member.id, newStatus);
      setSuccessMsg(`✓ Member portal access status updated to ${newStatus.toUpperCase()}.`);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update portal status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = () => {
    const text = `Member Portal Login:\nEmail: ${email}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateSlug = () => {
    setEmail(generateEnglishEmailSlug(member.name, member.id));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Member Portal Access"
      subtitle={`Configure login credentials and access rights for ${member.name}`}
      icon={<ShieldCheck size={22} className="text-emerald" />}
      size="md"
    >
      <div className="grant-portal-access-modal-body">
        {/* MEMBER IDENTITY BADGE CARD */}
        <div className="portal-user-profile-chip">
          <div className="portal-user-avatar">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="portal-user-meta">
            <h4 className="portal-user-name">{member.name}</h4>
            <div className="portal-user-sub">
              <span>Relationship: <strong>{member.relationship}</strong></span>
              <span className="dot-divider">•</span>
              <span>House No: <strong>{houseNo ? `H-${houseNo.replace(/^H-?/i, '')}` : 'N/A'}</strong></span>
            </div>
          </div>
          <div className="portal-status-tag">
            <span className={`status-badge-pill ${member.portal_status || 'not_granted'}`}>
              {(member.portal_status || 'not_granted').replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="auth-alert error margin-bottom-sm">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success margin-bottom-sm">
            <UserCheck size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ACCESS MANAGEMENT OR GRANT FORM */}
        {member.portal_access && member.portal_status !== 'not_granted' ? (
          <div className="flex-col gap-md margin-top-xs">
            <div className="portal-credentials-card">
              <h5 className="section-title">Active Login Credentials</h5>
              <div className="credentials-row">
                <span className="cred-label">Login Email:</span>
                <strong className="cred-val">{member.email || email}</strong>
              </div>

              <div className="flex-between align-items-center margin-top-sm">
                <span className="font-xs color-subtle">Copy login info for member:</span>
                <button 
                  type="button" 
                  className="pill-btn-ghost font-2xs flex-row-gap-3xs"
                  onClick={copyCredentials}
                >
                  {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Login Details'}</span>
                </button>
              </div>
            </div>

            <div className="portal-actions-card">
              <h5 className="section-title">Access Control Actions</h5>
              
              <div className="flex-col gap-xs margin-top-xs">
                {member.portal_status === 'active' && (
                  <>
                    <button
                      type="button"
                      className="pill-btn-secondary width-100 flex-center gap-xs"
                      style={{ justifyContent: 'center', padding: '12px 18px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}
                      onClick={() => handleStatusChange('suspended')}
                      disabled={isSubmitting}
                    >
                      <Power size={16} /> Suspend Portal Access (Temporary)
                    </button>
                    <button
                      type="button"
                      className="pill-btn-danger width-100 flex-center gap-xs margin-top-2xs"
                      style={{ justifyContent: 'center', padding: '12px 18px' }}
                      onClick={() => handleStatusChange('revoked')}
                      disabled={isSubmitting}
                    >
                      <Power size={16} /> Revoke Portal Access (Permanent)
                    </button>
                  </>
                )}

                {(member.portal_status === 'suspended' || member.portal_status === 'revoked') && (
                  <button
                    type="button"
                    className="pill-btn-primary width-100 flex-center gap-xs"
                    style={{ justifyContent: 'center', padding: '12px 18px' }}
                    onClick={() => handleStatusChange('active')}
                    disabled={isSubmitting}
                  >
                    <RefreshCcw size={16} /> Restore Active Portal Access
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGrantAccess} className="portal-grant-form">
            <div className="form-group margin-bottom-md">
              <div className="flex-between align-items-center margin-bottom-2xs">
                <label className="form-label font-weight-700 margin-0">Member Login Email Address (English) *</label>
                <button
                  type="button"
                  className="regenerate-slug-btn"
                  onClick={regenerateSlug}
                  title="Generate English Email Address"
                >
                  <Sparkles size={13} />
                  <span>Auto-Suggest</span>
                </button>
              </div>

              <div className="portal-input-relative">
                <Mail size={17} className="portal-input-icon" />
                <input
                  type="email"
                  required
                  className="portal-form-control font-xs"
                  placeholder="aboobackar@mahal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <span className="field-hint font-2xs color-subtle margin-top-3xs">
                Must be in English script (e.g. <strong>aboobackar@mahal.com</strong>).
              </span>
            </div>

            <div className="form-group margin-bottom-md">
              <label className="form-label font-weight-700 margin-bottom-2xs">Initial Password *</label>
              <div className="portal-input-relative">
                <Lock size={17} className="portal-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="portal-form-control font-xs"
                  placeholder="Mahall@12345"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span className="field-hint font-2xs color-subtle margin-top-3xs">
                The member will use this email and password to sign in to the Member Portal.
              </span>
            </div>

            <div className="flex-between align-items-center margin-top-lg">
              <button 
                type="button" 
                className="pill-btn-ghost font-2xs flex-row-gap-3xs"
                onClick={copyCredentials}
              >
                {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
              </button>

              <div className="flex-row-gap-xs">
                <button type="button" className="pill-btn-ghost font-xs" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="pill-btn-primary font-xs" disabled={isSubmitting}>
                  {isSubmitting ? 'Granting Access...' : 'Grant Portal Access'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* EMBEDDED MODAL STYLES FOR ABSOLUTE DESIGN PERFECTION & ICON ALIGNMENT */}
      <style>{`
        .grant-portal-access-modal-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .portal-user-profile-chip {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .portal-user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #00966b 0%, #059669 100%);
          color: #ffffff;
          font-weight: 800;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0, 150, 107, 0.25);
        }

        .portal-user-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .portal-user-name {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .portal-user-sub {
          font-size: 12px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .dot-divider { color: #cbd5e1; }

        .portal-status-tag { flex-shrink: 0; }

        .portal-grant-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
          background: #ffffff;
          padding: 18px;
          border-radius: 16px;
          border: 1.5px solid #f1f5f9;
        }

        .portal-input-relative {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .portal-input-icon {
          position: absolute !important;
          left: 14px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          color: #00966b !important;
          pointer-events: none !important;
          z-index: 5 !important;
        }

        .portal-form-control {
          width: 100% !important;
          padding: 11px 44px 11px 44px !important;
          border: 1.5px solid #cbd5e1 !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-size: 13.5px !important;
          font-weight: 600 !important;
          box-sizing: border-box !important;
          transition: all 0.2s ease !important;
        }

        .portal-form-control:focus {
          outline: none !important;
          border-color: #00966b !important;
          box-shadow: 0 0 0 3.5px rgba(0, 150, 107, 0.15) !important;
        }

        .password-toggle-eye-btn {
          position: absolute !important;
          right: 12px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: transparent !important;
          border: none !important;
          color: #64748b !important;
          cursor: pointer !important;
          padding: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 5 !important;
        }

        .password-toggle-eye-btn:hover { color: #0f172a !important; }

        .regenerate-slug-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #ecfdf5;
          color: #00966b;
          border: 1px solid #a7f3d0;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .regenerate-slug-btn:hover {
          background: #d1fae5;
        }

        .portal-credentials-card,
        .portal-actions-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 18px;
          border-radius: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .section-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 10px;
        }

        .credentials-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13.5px;
        }

        .cred-label { color: #64748b; }
        .cred-val { color: #00966b; font-weight: 700; }
      `}</style>
    </Modal>
  );
};

export default GrantAccessModal;
