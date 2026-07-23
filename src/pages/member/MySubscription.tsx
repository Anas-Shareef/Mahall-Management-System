import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { Member, MemberSubscription, SubscriptionYear } from '../../services/db';
import { Calendar, ShieldAlert } from 'lucide-react';

export const MySubscription: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [member, setMember] = useState<Member | null>(null);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLedgers = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const memObj = await db.members.getByUserId(user.id);
        if (memObj) {
          setMember(memObj);
          const [yearList, subList] = await Promise.all([
            db.years.get(),
            db.subscriptions.getByMember(memObj.id),
          ]);
          setYears(yearList);
          setSubscriptions(subList);
        }
      } catch (err) {
        console.error('Failed to load member ledgers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLedgers();
  }, [user]);

  if (loading) {
    return <div className="loading-indicator">{t('common.loading')}</div>;
  }

  if (!member) {
    return <div className="loading-indicator">No member profile linked.</div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="my-subscription-page animate-fade-in">
      <div className="page-header-actions">
        <h3>{t('nav.mySubscription')}</h3>
      </div>

      <div className="ledger-timeline-list">
        {subscriptions.length === 0 ? (
          <div className="empty-ledgers glass-card">
            <ShieldAlert size={28} />
            <p>No subscription history ledger files found for your member account.</p>
          </div>
        ) : (
          subscriptions.map((sub) => {
            const yr = years.find((y) => y.id === sub.subscription_year_id);
            return (
              <div key={sub.id} className="ledger-timeline-card glass-card">
                <div className="card-top-header">
                  <div className="year-title">
                    <Calendar size={18} className="year-icon" />
                    <h4>Year {yr ? yr.year : 'N/A'}</h4>
                  </div>
                  <span className={`status-pill ${sub.status}`}>
                    {t(`subscription.${sub.status === 'paid' ? 'paid' : sub.status === 'partially_paid' ? 'partiallyPaid' : 'unpaid'}`)}
                  </span>
                </div>

                <div className="ledger-financials-breakdown">
                  <div className="breakdown-col">
                    <span>{t('subscription.annualSubscription')}</span>
                    <h5>{formatCurrency(sub.annual_fee)}</h5>
                  </div>
                  <div className="breakdown-col">
                    <span>{t('subscription.previousArrears')}</span>
                    <h5 className={sub.previous_arrears > 0 ? 'outstanding' : ''}>
                      {formatCurrency(sub.previous_arrears)}
                    </h5>
                  </div>
                  <div className="breakdown-col">
                    <span>{t('subscription.totalDue')}</span>
                    <h5>{formatCurrency(sub.total_due)}</h5>
                  </div>
                  <div className="breakdown-col">
                    <span>{t('subscription.totalPaid')}</span>
                    <h5 className="paid-bold">{formatCurrency(sub.total_paid)}</h5>
                  </div>
                  <div className="breakdown-col balance-col">
                    <span>{t('subscription.outstandingBalance')}</span>
                    <h5 className={sub.balance > 0 ? 'outstanding-bold' : 'paid-bold'}>
                      {formatCurrency(sub.balance)}
                    </h5>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .my-subscription-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header-actions h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
        }

        .ledger-timeline-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ledger-timeline-card {
          padding: 24px;
        }

        .card-top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 20px;
        }

        .year-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .year-title h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        [data-theme="dark"] .year-title h4 {
          color: var(--gold-light);
        }

        .year-icon {
          color: var(--gold);
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

        /* BREAKDOWN */
        .ledger-financials-breakdown {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }

        .breakdown-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .breakdown-col span {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .breakdown-col h5 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
        }

        .breakdown-col h5.outstanding {
          color: var(--error);
        }

        .paid-bold {
          color: var(--success) !important;
        }

        .outstanding-bold {
          color: var(--error) !important;
        }

        .balance-col {
          background-color: var(--bg-app);
          padding: 10px;
          border-radius: var(--radius-sm);
        }

        .empty-ledgers {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 991px) {
          .ledger-financials-breakdown {
            grid-template-columns: repeat(2, 1fr);
          }
          .balance-col {
            grid-column: span 2;
          }
        }

        @media (max-width: 480px) {
          .ledger-financials-breakdown {
            grid-template-columns: 1fr;
          }
          .balance-col {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
};
export default MySubscription;
