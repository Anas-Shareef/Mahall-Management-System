import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { Household, Member } from '../../services/db';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/Modal';

export const MyHousehold: React.FC = () => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Request Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadHousehold = async () => {
      setLoading(true);
      try {
        let memberRecord: Member | null = null;

        if (user?.member_id) {
          memberRecord = await db.members.getById(user.member_id);
        } else if (user?.id) {
          memberRecord = await db.members.getByUserId(user.id);
        }

        if (!memberRecord && user?.email) {
          const allMembers = await db.members.get();
          memberRecord = allMembers.find((m) => m.email && m.email.toLowerCase() === user.email?.toLowerCase()) || null;
        }

        if (memberRecord) {
          const [houseData, familyData] = await Promise.all([
            db.households.getById(memberRecord.household_id),
            db.members.getByHousehold(memberRecord.household_id),
          ]);
          setHousehold(houseData);
          setMembers(familyData);
        }
      } catch (err) {
        console.error('Error loading my household:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHousehold();
  }, [user]);

  const handleSendCorrectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionNote.trim()) return;

    setIsSubmitting(true);
    try {
      await db.notifications.sendNotification(
        {
          title_en: `Correction Request from House #${household?.house_number}`,
          title_ml: `വീട്ടു വിവര തിരുത്തൽ അപേക്ഷ (House #${household?.house_number})`,
          message_en: `${user?.name || 'Member'}: ${correctionNote}`,
          message_ml: `${user?.name || 'Member'}: ${correctionNote}`,
          type: 'alert',
        },
        'all'
      );

      setToastMessage({ type: 'success', text: '✓ Correction request sent to Mahall Admin successfully.' });
      setIsCorrectionModalOpen(false);
      setCorrectionNote('');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      setToastMessage({ type: 'error', text: 'Failed to send request. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="skeleton-loading-container padding-lg">
        <div className="skeleton-row"></div>
        <div className="skeleton-row"></div>
        <div className="skeleton-row"></div>
      </div>
    );
  }

  return (
    <div className="my-household-page animate-fade-in flex-col gap-md">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type} animate-bounce-in`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex-between align-items-center flex-wrap gap-xs">
        <div>
          <h2 className="font-lg font-weight-800 text-dark margin-0">My Household</h2>
          <p className="font-xs color-subtle margin-top-3xs">
            Complete details and registered members for House No. {household?.house_number || 'N/A'}
          </p>
        </div>
        <button
          type="button"
          className="pill-btn-secondary font-xs flex-row-gap-xs"
          onClick={() => setIsCorrectionModalOpen(true)}
        >
          <Send size={14} /> Request Correction
        </button>
      </div>

      {/* HOUSEHOLD OVERVIEW CARD */}
      <div className="glass-card padding-lg border-radius-xl" style={{ background: 'linear-gradient(135deg, #01A350 0%, #007A3B 100%)', color: '#ffffff' }}>
        <div className="flex-between align-items-center flex-wrap gap-md">
          <div>
            <span className="font-2xs font-weight-800 text-uppercase" style={{ opacity: 0.85, letterSpacing: '0.06em' }}>Registered Household</span>
            <h3 className="font-xl font-weight-900 margin-top-3xs" style={{ color: '#ffffff' }}>House No. {household?.house_number}</h3>
            <p className="font-xs margin-top-2xs" style={{ opacity: 0.9 }}>
              House Owner: <strong>{household?.house_owner_name}</strong>
            </p>
          </div>
          <div className="flex-col gap-2xs" style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 18px', borderRadius: 14 }}>
            <span className="font-2xs font-weight-700" style={{ opacity: 0.9 }}>Total Family Members</span>
            <span className="font-lg font-weight-900" style={{ color: '#ffffff' }}>{members.length} Members</span>
          </div>
        </div>
      </div>

      {/* HOUSEHOLD DETAILS */}
      <div className="form-card" style={{ background: '#ffffff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <h4 className="font-xs font-weight-800 text-uppercase color-subtle margin-bottom-md">Household Information</h4>
        
        <div className="form-row-grid">
          <div>
            <span className="font-2xs color-subtle">House Number</span>
            <p className="font-sm font-weight-700 text-dark margin-0">H-{household?.house_number}</p>
          </div>
          <div>
            <span className="font-2xs color-subtle">House Owner</span>
            <p className="font-sm font-weight-700 text-dark margin-0">{household?.house_owner_name}</p>
          </div>
        </div>

        <div className="form-row-grid margin-top-md">
          <div>
            <span className="font-2xs color-subtle">Owner Contact Phone</span>
            <p className="font-sm font-weight-700 text-dark margin-0">{household?.house_owner_phone || 'N/A'}</p>
          </div>
          <div>
            <span className="font-2xs color-subtle">Mahallu Sector / Address</span>
            <p className="font-sm font-weight-700 text-dark margin-0">{household?.address || 'Mahallu Area'}</p>
          </div>
        </div>
      </div>

      {/* FAMILY MEMBERS LIST */}
      <div className="flex-col gap-xs margin-top-xs">
        <h4 className="font-xs font-weight-800 text-uppercase color-subtle margin-bottom-xs">Family Members Registered ({members.length})</h4>
        
        <div className="flex-col gap-xs">
          {members.map((m) => {
            const isCurrentUser = m.id === user?.member_id || m.user_id === user?.id || (m.email && m.email.toLowerCase() === user?.email?.toLowerCase());
            return (
              <div
                key={m.id}
                className="glass-card padding-md flex-between align-items-center"
                style={{
                  border: isCurrentUser ? '2px solid #01A350' : '1px solid #e2e8f0',
                  borderRadius: 14,
                  background: isCurrentUser ? '#f0fdf4' : '#ffffff',
                }}
              >
                <div>
                  <div className="font-sm font-weight-800 text-dark flex-row-gap-xs align-items-center">
                    <span>{m.name}</span>
                    {isCurrentUser && (
                      <span className="status-badge-pill active font-2xs" style={{ background: '#01A350', color: '#fff' }}>
                        You
                      </span>
                    )}
                    {m.relationship === 'Self (Owner)' && (
                      <span className="font-2xs text-emerald font-weight-800">(House Owner)</span>
                    )}
                  </div>
                  <div className="font-2xs color-subtle margin-top-3xs">
                    {m.relationship} • {m.phone || 'No phone'}
                  </div>
                </div>

                <div className="flex-row-gap-xs align-items-center">
                  <span className={`status-badge-pill ${m.portal_status || 'not_granted'}`}>
                    {(m.portal_status || 'not_granted').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CORRECTION REQUEST MODAL */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Request Household Info Correction"
        subtitle="Submit a correction note to the Mahall Administrator"
        icon={<Send size={20} className="text-emerald" />}
      >
        <form onSubmit={handleSendCorrectionRequest} className="flex-col gap-md">
          <div className="form-group">
            <label className="form-label font-weight-700">Correction Details / Instructions *</label>
            <textarea
              required
              rows={4}
              className="dhic-input font-xs"
              placeholder="Describe what information needs updating (e.g. phone number correction, family member name spelling, address update)..."
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              style={{ width: '100%', borderRadius: 12, padding: 12 }}
            ></textarea>
          </div>

          <div className="flex-end gap-xs margin-top-xs">
            <button type="button" className="pill-btn-ghost font-xs" onClick={() => setIsCorrectionModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="pill-btn-primary font-xs" disabled={isSubmitting}>
              {isSubmitting ? 'Sending Request...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyHousehold;
