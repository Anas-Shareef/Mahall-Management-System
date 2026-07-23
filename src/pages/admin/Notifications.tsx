import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { Household, Member, Notification } from '../../services/db';
import { Send, Bell, AlertCircle, CheckCircle } from 'lucide-react';

export const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Data States
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pastNotifications, setPastNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [titleEn, setTitleEn] = useState('');
  const [msgEn, setMsgEn] = useState('');
  const [titleMl, setTitleMl] = useState('');
  const [msgMl, setMsgMl] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'pending' | 'arrears' | 'household' | 'member'>('all');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [notifType, setNotifType] = useState<'payment_reminder' | 'arrears_reminder' | 'announcement'>('announcement');
  
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [houseList, memberList, notifList] = await Promise.all([
        db.households.get(),
        db.members.get(),
        db.notifications.get(),
      ]);
      setHouseholds(houseList);
      setMembers(memberList);
      setPastNotifications(notifList);
    } catch (err) {
      console.error('Failed to load notifications data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update default target dropdown selection when target type changes
  useEffect(() => {
    if (targetType === 'household') {
      setSelectedTargetId(households[0]?.id || '');
    } else if (targetType === 'member') {
      setSelectedTargetId(members[0]?.id || '');
    } else {
      setSelectedTargetId('');
    }
  }, [targetType, households, members]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    if (!titleEn || !msgEn || !titleMl || !msgMl) {
      setFormError('Title and message are required in both English and Malayalam.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Setup payload
      const payload = {
        title_en: titleEn,
        message_en: msgEn,
        title_ml: titleMl,
        message_ml: msgMl,
        type: notifType,
        created_by: user?.id || null,
      };

      // Determine target list
      let broadcastTarget = targetType as string;
      if (targetType === 'household' || targetType === 'member') {
        broadcastTarget = selectedTargetId;
      }

      await db.notifications.createBroadcast(payload, broadcastTarget);
      
      setSuccessMsg(t('notifications.sendSuccess'));
      setTitleEn('');
      setMsgEn('');
      setTitleMl('');
      setMsgMl('');
      
      // Reload history list
      const updatedList = await db.notifications.get();
      setPastNotifications(updatedList);
    } catch (err: any) {
      setFormError(err.message || 'Failed to send broadcast announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="notifications-page">
      <div className="page-header-actions">
        <h3>{t('notifications.notificationsTitle')}</h3>
      </div>

      <div className="notifications-split-layout">
        {/* BROADCAST ANNOUNCEMENT FORM */}
        <div className="broadcast-card glass-card">
          <div className="card-header">
            <h4>{t('notifications.sendNotification')}</h4>
          </div>

          <form onSubmit={handleBroadcast} className="broadcast-form">
            {formError && (
              <div className="form-alert error">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}
            {successMsg && (
              <div className="form-alert success">
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Target Selectors */}
            <div className="form-row-grid">
              <div className="form-group">
                <label htmlFor="target-audience-select">{t('notifications.targetAudience')}</label>
                <select
                  id="target-audience-select"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                >
                  <option value="all">{t('notifications.targetAll')}</option>
                  <option value="pending">{t('notifications.targetPending')}</option>
                  <option value="arrears">{t('notifications.targetArrears')}</option>
                  <option value="household">{t('notifications.targetHousehold')}</option>
                  <option value="member">{t('notifications.targetMember')}</option>
                </select>
              </div>

              {/* Dynamic Target Selection Dropdowns */}
              {targetType === 'household' && (
                <div className="form-group">
                  <label htmlFor="target-house-select">Select Target Household</label>
                  <select
                    id="target-house-select"
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                  >
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>House No. {h.house_number} ({h.house_owner_name})</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'member' && (
                <div className="form-group">
                  <label htmlFor="target-member-select">Select Target Member</label>
                  <select
                    id="target-member-select"
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="notif-type-select">Announcement Classification</label>
                <select
                  id="notif-type-select"
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as any)}
                >
                  <option value="announcement">General Announcement</option>
                  <option value="payment_reminder">Subscription Payment Reminder</option>
                  <option value="arrears_reminder">Outstanding Arrears Reminder</option>
                </select>
              </div>
            </div>

            <div className="lang-form-split">
              {/* ENGLISH SECTION */}
              <div className="lang-section-block">
                <h5>English Content</h5>
                <div className="form-group">
                  <label htmlFor="title-en-input">{t('notifications.titleEnLabel')} *</label>
                  <input
                    id="title-en-input"
                    type="text"
                    required
                    placeholder="e.g., Annual general body meeting"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="msg-en-input">{t('notifications.messageEnLabel')} *</label>
                  <textarea
                    id="msg-en-input"
                    rows={4}
                    required
                    placeholder="Provide details about the announcement..."
                    value={msgEn}
                    onChange={(e) => setMsgEn(e.target.value)}
                  />
                </div>
              </div>

              {/* MALAYALAM SECTION */}
              <div className="lang-section-block">
                <h5 style={{ fontFamily: 'var(--font-ml)' }}>മലയാളം ഉള്ളടക്കം</h5>
                <div className="form-group">
                  <label htmlFor="title-ml-input">{t('notifications.titleMlLabel')} *</label>
                  <input
                    id="title-ml-input"
                    type="text"
                    required
                    placeholder="ഉദാ: വാർഷിക പൊതുയോഗം"
                    value={titleMl}
                    onChange={(e) => setTitleMl(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="msg-ml-input">{t('notifications.messageMlLabel')} *</label>
                  <textarea
                    id="msg-ml-input"
                    rows={4}
                    required
                    placeholder="വിവരങ്ങൾ ഇവിടെ രേഖപ്പെടുത്തുക..."
                    value={msgMl}
                    onChange={(e) => setMsgMl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="submit-btn primary-btn broadcast-btn">
              <Send size={16} />
              <span>{isSubmitting ? t('common.loading') : 'Send Broadcast Announcement'}</span>
            </button>
          </form>
        </div>

        {/* PAST ANNOUNCEMENTS HISTORY */}
        <div className="past-announcements-card glass-card">
          <div className="card-header">
            <h4>History Logs</h4>
          </div>
          <div className="past-announcements-list">
            {loading ? (
              <div className="loading-text">{t('common.loading')}</div>
            ) : pastNotifications.length === 0 ? (
              <div className="empty-logs">{t('common.noData')}</div>
            ) : (
              pastNotifications.map((notif) => (
                <div key={notif.id} className="past-notif-item">
                  <div className="past-notif-header">
                    <span className="notif-badge-pill">
                      <Bell size={12} />
                      {notif.type}
                    </span>
                    <span className="notif-time-stamp">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="notif-lang-preview">
                    <div className="lang-box">
                      <b>EN:</b> {notif.title_en}
                      <p>{notif.message_en}</p>
                    </div>
                    <div className="lang-box ml-preview">
                      <b>ML:</b> {notif.title_ml}
                      <p>{notif.message_ml}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .notifications-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header-actions h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
        }

        .notifications-split-layout {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
          align-items: flex-start;
        }

        .broadcast-card, .past-announcements-card {
          padding: 24px;
        }

        .card-header {
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 20px;
        }

        .card-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        [data-theme="dark"] .card-header h4 {
          color: var(--gold-light);
        }

        .broadcast-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
        }

        .form-alert.error {
          background-color: var(--error-bg);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .form-alert.success {
          background-color: var(--success-bg);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .form-row-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
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

        .form-group input, .form-group select, .form-group textarea {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-card);
          color: var(--text-main);
          transition: var(--transition-all);
        }

        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-10);
        }

        /* DUAL LANGUAGE BLOCKS */
        .lang-form-split {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .lang-section-block {
          background-color: var(--bg-app);
          padding: 16px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1px solid var(--border-color);
        }

        .lang-section-block h5 {
          font-size: 14px;
          font-weight: 700;
          color: var(--primary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }

        [data-theme="dark"] .lang-section-block h5 {
          color: var(--gold-light);
        }

        .broadcast-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: none;
          font-weight: 700;
          cursor: pointer;
        }

        /* HISTORY LOGS */
        .past-announcements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 540px;
          overflow-y: auto;
        }

        .empty-logs {
          text-align: center;
          color: var(--text-muted);
          padding: 40px;
          font-size: 13px;
        }

        .past-notif-item {
          background-color: var(--bg-app);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
        }

        .past-notif-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .notif-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          background-color: var(--primary-10);
          color: var(--primary);
          padding: 4px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .notif-time-stamp {
          font-size: 11px;
          color: var(--text-muted);
        }

        .notif-lang-preview {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .lang-box {
          font-size: 12px;
          color: var(--text-main);
          line-height: 1.4;
        }

        .lang-box b {
          color: var(--primary-light);
        }

        .ml-preview {
          border-top: 1px dashed var(--border-color);
          padding-top: 8px;
        }

        /* RESPONSIVE */
        @media (max-width: 991px) {
          .notifications-split-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .lang-form-split {
            grid-template-columns: 1fr;
          }
          .form-row-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
export default Notifications;
