import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { Household, Member, MemberSubscription, SubscriptionYear } from '../../services/db';
import { 
  IndianRupee, 
  History, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Data States
  const [member, setMember] = useState<Member | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [activeYear, setActiveYear] = useState<SubscriptionYear | null>(null);
  const [subscription, setSubscription] = useState<MemberSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMemberDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Get member record with robust auto-linking to Admin records
        let memObj: Member | null = await db.members.getByUserId(user.id);
        
        if (!memObj && user.member_id) {
          memObj = await db.members.getById(user.member_id);
        }

        if (!memObj && user.email) {
          const allMembers = await db.members.get();
          memObj = allMembers.find((m) => m.email && m.email.toLowerCase() === user.email?.toLowerCase()) || null;
        }

        // If matched but user_id was not linked yet, auto-link to Supabase now
        if (memObj && (!memObj.user_id || memObj.user_id !== user.id)) {
          try {
            await db.members.update(memObj.id, { user_id: user.id, portal_access: true, portal_status: 'active' });
            memObj.user_id = user.id;
          } catch (e) {
            console.warn('Auto-link update notice:', e);
          }
        }

        if (memObj) {
          setMember(memObj);

          // Get household details from Admin
          const houseObj = await db.households.getById(memObj.household_id);
          setHousehold(houseObj);

          // Get active year and subscriptions from Admin
          const yearList = await db.years.get();
          const activeYr = yearList.find(y => y.status === 'active') || yearList[0];
          
          if (activeYr) {
            setActiveYear(activeYr);

            const allSubs = await db.subscriptions.getByMember(memObj.id);
            const subRecord = allSubs.find((s) => s.subscription_year_id === activeYr.id);
            if (subRecord) {
              setSubscription(subRecord);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load member dashboard details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMemberDashboardData();
  }, [user]);

  if (loading) {
    return <div className="loading-indicator">{t('common.loading')}</div>;
  }

  if (!member) {
    return (
      <div className="error-unlinked-member glass-card animate-fade-in">
        <AlertTriangle size={32} className="error-icon" />
        <h4>Unlinked Profile</h4>
        <p>This user login has not been associated with a Mahallu member record yet. Please contact the Committee Admin to link your profile.</p>
        <style>{`
          .error-unlinked-member {
            padding: 40px;
            text-align: center;
            max-width: 500px;
            margin: 40px auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .error-icon { color: var(--warning); }
        `}</style>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Progress percentage
  const paidPercent = subscription && subscription.total_due > 0 
    ? Math.min(100, Math.round((subscription.total_paid / subscription.total_due) * 100))
    : 0;

  return (
    <div className="member-dashboard-page animate-fade-in">
      
      {/* Greetings Banner */}
      <div className="welcome-banner">
        <div className="banner-contents">
          <h3>{t('dashboard.assalamuAlaikum', { name: member.name })}</h3>
          <p>
            {household ? `House No. ${household.house_number} • ` : ''}
            {t('auth.loginTitle')}
          </p>
        </div>
        <div className="banner-relationship-badge">
          <User size={14} />
          <span>{member.relationship}</span>
        </div>
      </div>

      {/* Subscription Status details */}
      {subscription && activeYear ? (
        <div className="subscription-summary-section">
          <div className="status-progress-card glass-card">
            <div className="progress-header">
              <div>
                <h4>Subscription Ledger - {activeYear.year}</h4>
                <p>Outstanding balance is updated upon offline manual receipt verification.</p>
              </div>
              <span className={`status-pill ${subscription.status}`}>
                {t(`subscription.${subscription.status === 'paid' ? 'paid' : subscription.status === 'partially_paid' ? 'partiallyPaid' : 'unpaid'}`)}
              </span>
            </div>

            <div className="progress-bar-container">
              <div className="progress-info-row">
                <span>Payment Progress</span>
                <span className="percent-bold">{paidPercent}%</span>
              </div>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${paidPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Ledger Stats Grid */}
          <div className="ledger-stats-grid">
            <div className="stat-card glass-card">
              <div className="card-icon-wrapper color-blue">
                <IndianRupee size={20} />
              </div>
              <div className="card-details">
                <span>{t('subscription.annualSubscription')}</span>
                <h2>{formatCurrency(subscription.annual_fee)}</h2>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="card-icon-wrapper color-red">
                <History size={20} />
              </div>
              <div className="card-details">
                <span>{t('subscription.previousArrears')}</span>
                <h2>{formatCurrency(subscription.previous_arrears)}</h2>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="card-icon-wrapper color-amber">
                <IndianRupee size={20} />
              </div>
              <div className="card-details">
                <span>{t('subscription.totalDue')}</span>
                <h2>{formatCurrency(subscription.total_due)}</h2>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="card-icon-wrapper color-green">
                <CheckCircle size={20} />
              </div>
              <div className="card-details">
                <span>{t('subscription.totalPaid')}</span>
                <h2>{formatCurrency(subscription.total_paid)}</h2>
              </div>
            </div>
          </div>

          {/* Outstanding Balance Callout */}
          <div className="outstanding-balance-banner">
            <div className="balance-text-wrapper">
              <Clock size={24} className="outstanding-icon" />
              <div>
                <h5>{t('subscription.outstandingBalance')}</h5>
                <p>Please contact the Mahallu Committee admin office to settle pending balances.</p>
              </div>
            </div>
            <h2>{formatCurrency(subscription.balance)}</h2>
          </div>

        </div>
      ) : (
        <div className="no-ledger-card glass-card">
          <AlertCircle size={28} className="info-icon" />
          <p>No subscription details are configured for you for the current active year. Please verify with the admin team.</p>
        </div>
      )}

      <style>{`
        .member-dashboard-page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .loading-indicator {
          padding: 50px;
          text-align: center;
          color: var(--text-muted);
          font-weight: 600;
        }

        .welcome-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
          color: white;
          padding: 24px 32px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
        }

        .welcome-banner h3 {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .welcome-banner p {
          font-size: 13px;
          opacity: 0.9;
        }

        .banner-relationship-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.15);
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* STATUS AND PROGRESS CARD */
        .status-progress-card {
          padding: 24px;
          margin-bottom: 24px;
        }

        .progress-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .progress-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        [data-theme="dark"] .progress-header h4 {
          color: var(--gold-light);
        }

        .progress-header p {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .status-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .status-pill.paid { background-color: var(--success-bg); color: var(--success); }
        .status-pill.partially_paid { background-color: var(--warning-bg); color: var(--warning); }
        .status-pill.unpaid { background-color: var(--error-bg); color: var(--error); }

        .progress-bar-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progress-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .percent-bold {
          font-weight: 700;
          color: var(--primary-light);
        }

        .bar-bg {
          height: 10px;
          background-color: var(--bg-app);
          border-radius: 5px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(to right, var(--primary), var(--primary-light));
          border-radius: 5px;
          transition: width 0.4s ease;
        }

        /* LEDGER STATS GRID */
        .ledger-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .card-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .color-blue { background-color: #eff6ff; color: #2563eb; }
        .color-red { background-color: #fef2f2; color: #ef4444; }
        .color-amber { background-color: #fffbeb; color: #d97706; }
        .color-green { background-color: #ecfdf5; color: #10b981; }

        .card-details span {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-details h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 2px;
        }

        /* OUTSTANDING BANNER */
        .outstanding-balance-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #fef2f2;
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 20px 24px;
          border-radius: var(--radius-md);
        }

        [data-theme="dark"] .outstanding-balance-banner {
          background-color: rgba(239, 68, 68, 0.05);
        }

        .balance-text-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .outstanding-icon {
          color: #ef4444;
          flex-shrink: 0;
        }

        .outstanding-balance-banner h5 {
          font-size: 14px;
          font-weight: 700;
          color: #ef4444;
        }

        .outstanding-balance-banner p {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .outstanding-balance-banner h2 {
          font-size: 28px;
          font-weight: 800;
          color: #ef4444;
        }

        .no-ledger-card {
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .info-icon {
          color: var(--text-muted);
        }

        @media (max-width: 1200px) {
          .ledger-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .outstanding-balance-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .outstanding-balance-banner h2 {
            align-self: flex-end;
          }
        }

        @media (max-width: 576px) {
          .ledger-stats-grid {
            grid-template-columns: 1fr;
          }
          .welcome-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};
export default Dashboard;
