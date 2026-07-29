import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { db } from '../services/db';
import type { Member } from '../services/db';
import { ShieldCheck, Mail, Lock, UserCheck, AlertTriangle, RefreshCcw, Power } from 'lucide-react';

interface GrantAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  houseNo?: string;
  onSuccess: () => void;
}

export const GrantAccessModal: React.FC<GrantAccessModalProps> = ({
  isOpen,
  onClose,
  member,
  houseNo = '',
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Mahall@12345');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (member) {
      setEmail(member.email || `${member.name.toLowerCase().replace(/\s+/g, '')}@mahal.com`);
      setPassword('Mahall@12345');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [member]);

  if (!member) return null;

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await db.members.grantPortalAccess(member.id, email, password);
      setSuccessMsg(`✓ Portal access granted successfully to ${member.name}.`);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Member Portal Access"
      subtitle={`Configure login credentials and access rights for ${member.name}`}
      icon={<ShieldCheck size={22} className="text-emerald" />}
      size="md"
    >
      <div className="flex-col gap-md">
        {/* MEMBER DETAILS CHIP */}
        <div className="glass-card padding-md border-radius-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="flex-between align-items-center flex-wrap gap-xs">
            <div>
              <h4 className="font-md font-weight-800 text-dark margin-0">{member.name}</h4>
              <p className="font-xs color-subtle margin-top-3xs">
                Relationship: <strong>{member.relationship}</strong> • House No: <strong>{houseNo || 'N/A'}</strong>
              </p>
            </div>
            <div className="flex-row-gap-xs align-items-center">
              <span className={`status-badge-pill ${member.portal_status || 'not_granted'}`}>
                {(member.portal_status || 'not_granted').replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="auth-alert error">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success">
            <UserCheck size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ACCESS MANAGEMENT OR GRANT FORM */}
        {member.portal_access && member.portal_status !== 'not_granted' ? (
          <div className="flex-col gap-md margin-top-xs">
            <div className="form-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: 20, borderRadius: 16 }}>
              <h4 className="font-xs font-weight-800 text-uppercase color-subtle margin-bottom-sm">Access Control Actions</h4>
              
              <div className="flex-col gap-xs">
                {member.portal_status === 'active' && (
                  <>
                    <button
                      type="button"
                      className="pill-btn-secondary width-100 flex-center gap-xs"
                      style={{ justifyContent: 'center', padding: '12px 18px', background: '#fffbe0', color: '#d97706', border: '1px solid #fde68a' }}
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
          <form onSubmit={handleGrantAccess} className="flex-col gap-md">
            <div className="form-group">
              <label className="form-label font-weight-700">Member Login Email Address *</label>
              <div className="dhic-input-wrapper">
                <Mail size={16} className="dhic-input-icon" />
                <input
                  type="email"
                  required
                  className="dhic-input font-xs"
                  placeholder="member@mahal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label font-weight-700">Initial Password *</label>
              <div className="dhic-input-wrapper">
                <Lock size={16} className="dhic-input-icon" />
                <input
                  type="text"
                  required
                  className="dhic-input font-xs"
                  placeholder="Mahall@12345"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <span className="field-hint font-2xs color-subtle margin-top-3xs">
                The member will use this password to sign in to the Member Portal.
              </span>
            </div>

            <div className="flex-end gap-xs margin-top-sm">
              <button type="button" className="pill-btn-ghost font-xs" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="pill-btn-primary font-xs" disabled={isSubmitting}>
                {isSubmitting ? 'Granting Access...' : 'Grant Portal Access'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default GrantAccessModal;
