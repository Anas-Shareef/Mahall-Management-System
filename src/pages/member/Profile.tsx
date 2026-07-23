import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { Household, Member } from '../../services/db';
import { User, Home, Users, CheckCircle, Smartphone } from 'lucide-react';

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [member, setMember] = useState<Member | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfileDetails = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const memObj = await db.members.getByUserId(user.id);
        if (memObj) {
          setMember(memObj);

          const [houseObj, membersList] = await Promise.all([
            db.households.getById(memObj.household_id),
            db.members.getByHousehold(memObj.household_id),
          ]);
          setHousehold(houseObj);
          // Filter out self
          setFamilyMembers(membersList.filter((m) => m.id !== memObj.id));
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileDetails();
  }, [user]);

  if (loading) {
    return <div className="loading-indicator">{t('common.loading')}</div>;
  }

  if (!member) {
    return <div className="loading-indicator">No member profile linked.</div>;
  }

  return (
    <div className="member-profile-page animate-fade-in">
      <div className="page-header-actions">
        <h3>{t('nav.myProfile')}</h3>
      </div>

      <div className="profile-details-grid">
        {/* PERSONAL DETAILS CARD */}
        <div className="profile-details-card glass-card">
          <div className="card-header-label">
            <User size={18} className="header-icon" />
            <h4>Personal Account Details</h4>
          </div>

          <div className="profile-meta-list">
            <div className="meta-row">
              <span className="meta-label">Full Name</span>
              <span className="meta-val bold-text">{member.name}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Relationship to House Owner</span>
              <span className="meta-val">{member.relationship}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Phone Number</span>
              <span className="meta-val">{member.phone || '—'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Email Address</span>
              <span className="meta-val">{member.email || '—'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Portal Access Status</span>
              <span className="meta-val login-active">
                <CheckCircle size={14} />
                <span>Authorized Active Login</span>
              </span>
            </div>
          </div>
        </div>

        {/* HOUSEHOLD & FAMILY CARD */}
        <div className="profile-details-card glass-card">
          <div className="card-header-label">
            <Home size={18} className="header-icon" />
            <h4>Household Group Details</h4>
          </div>

          {household && (
            <div className="house-profile-meta">
              <div className="meta-row">
                <span className="meta-label">House Number</span>
                <span className="meta-val bold-text">House No. {household.house_number}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">House Owner</span>
                <span className="meta-val">{household.house_owner_name}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Address</span>
                <span className="meta-val italic">{household.address || 'Vellikkeel Ward Area'}</span>
              </div>
            </div>
          )}

          <div className="family-members-section">
            <h5>
              <Users size={14} />
              <span>Other Family Members ({familyMembers.length})</span>
            </h5>

            <div className="family-members-list">
              {familyMembers.length === 0 ? (
                <p className="no-family-p">No other family members linked under this household.</p>
              ) : (
                familyMembers.map((m) => (
                  <div key={m.id} className="family-member-item">
                    <div>
                      <span className="name">{m.name}</span>
                      <span className="rel">({m.relationship})</span>
                    </div>
                    {m.phone && (
                      <span className="phone">
                        <Smartphone size={10} />
                        {m.phone}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .member-profile-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header-actions h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
        }

        .profile-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: flex-start;
        }

        .profile-details-card {
          padding: 24px;
        }

        .card-header-label {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 20px;
        }

        .card-header-label h4 {
          font-size: 15px;
          font-weight: 700;
          color: var(--primary);
        }

        [data-theme="dark"] .card-header-label h4 {
          color: var(--gold-light);
        }

        .header-icon {
          color: var(--gold);
        }

        .profile-meta-list, .house-profile-meta {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .meta-label {
          color: var(--text-muted);
          font-weight: 600;
        }

        .meta-val {
          font-weight: 600;
          color: var(--text-main);
        }

        .bold-text {
          font-weight: 700;
          color: var(--primary-light);
        }

        .italic {
          font-style: italic;
          color: var(--text-muted);
          font-weight: normal;
        }

        .login-active {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--success);
          font-weight: 700;
        }

        .house-profile-meta {
          background-color: var(--bg-app);
          padding: 16px;
          border-radius: var(--radius-md);
          margin-bottom: 20px;
          border: 1px solid var(--border-color);
        }

        /* FAMILY MEMBERS */
        .family-members-section h5 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 12px;
        }

        .family-members-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .family-member-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background-color: var(--bg-app);
          border-radius: var(--radius-sm);
          font-size: 12px;
        }

        .family-member-item .name {
          font-weight: 700;
          color: var(--text-main);
        }

        .family-member-item .rel {
          color: var(--text-muted);
          margin-left: 6px;
        }

        .family-member-item .phone {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
        }

        .no-family-p {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          padding: 12px;
        }

        @media (max-width: 768px) {
          .profile-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
export default Profile;
