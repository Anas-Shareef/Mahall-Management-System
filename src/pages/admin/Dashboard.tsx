import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';

import {
  Home,
  Users,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  History,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(true);

  // States for calculated stats
  const [stats, setStats] = useState({
    totalHouseholds: 0,
    totalMembers: 0,
    expectedSubscription: 0,
    totalCollected: 0,
    pendingAmount: 0,
    totalArrears: 0,
    fullyPaid: 0,
    pendingMembers: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [households, members, years, subscriptions, payments] = await Promise.all([
          db.households.get(),
          db.members.get(),
          db.years.get(),
          db.subscriptions.get(),
          db.payments.get(),
        ]);

        // Find the active or latest subscription year (e.g., 2026)
        const currentYearRecord = years.find((y) => y.status === 'active') || years[0];
        
        if (currentYearRecord) {
          const currentYearSubs = subscriptions.filter(
            (s) => s.subscription_year_id === currentYearRecord.id
          );

          const expected = currentYearSubs.reduce((sum, s) => sum + s.annual_fee, 0);
          const collected = currentYearSubs.reduce((sum, s) => sum + s.total_paid, 0);
          const arrears = currentYearSubs.reduce((sum, s) => sum + s.previous_arrears, 0);
          const pending = currentYearSubs.reduce((sum, s) => sum + s.balance, 0);
          const fullyPaidCount = currentYearSubs.filter((s) => s.status === 'paid').length;
          const pendingCount = currentYearSubs.filter((s) => s.status !== 'paid').length;

          setStats({
            totalHouseholds: households.filter(h => h.status === 'active').length,
            totalMembers: members.filter(m => m.status === 'active').length,
            expectedSubscription: expected,
            totalCollected: collected,
            pendingAmount: pending,
            totalArrears: arrears,
            fullyPaid: fullyPaidCount,
            pendingMembers: pendingCount,
          });
        }

        // Map recent transactions with member and house info
        const recentPayLogs = payments.slice(0, 5).map((pay) => {
          const m = members.find((mem) => mem.id === pay.member_id);
          const h = m ? households.find((house) => house.id === m.household_id) : null;
          return {
            id: pay.id,
            memberName: m ? m.name : 'Unknown Member',
            houseNumber: h ? h.house_number : 'N/A',
            amount: pay.amount,
            method: pay.payment_method,
            date: pay.payment_date,
          };
        });
        setRecentTransactions(recentPayLogs);

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="loading-indicator">{t('common.loading')}</div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="dashboard-page">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div>
          <h3>{t('dashboard.welcomeBack', { name: 'Admin' })}</h3>
          <p>Here is the overview of Mahallu subscriptions and family records.</p>
        </div>
        <span className="current-date-badge">
          {new Date().toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Grid of 4 main metrics */}
      <div className="metrics-grid">
        <div className="metric-card glass-card">
          <div className="card-icon-wrapper color-emerald">
            <Home size={24} />
          </div>
          <div className="card-details">
            <span>{t('dashboard.totalHouseholds')}</span>
            <h2>{stats.totalHouseholds}</h2>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="card-icon-wrapper color-blue">
            <Users size={24} />
          </div>
          <div className="card-details">
            <span>{t('dashboard.totalMembers')}</span>
            <h2>{stats.totalMembers}</h2>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="card-icon-wrapper color-amber">
            <TrendingUp size={24} />
          </div>
          <div className="card-details">
            <span>{t('dashboard.expectedSubscription')}</span>
            <h2>{formatCurrency(stats.expectedSubscription)}</h2>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="card-icon-wrapper color-green">
            <CheckCircle size={24} />
          </div>
          <div className="card-details">
            <span>{t('dashboard.totalCollected')}</span>
            <h2>{formatCurrency(stats.totalCollected)}</h2>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="secondary-grid">
        <div className="sec-card pending-card">
          <div className="sec-header">
            <span>{t('dashboard.pendingAmount')}</span>
            <AlertTriangle size={18} />
          </div>
          <h3>{formatCurrency(stats.pendingAmount)}</h3>
        </div>

        <div className="sec-card arrears-card">
          <div className="sec-header">
            <span>{t('dashboard.totalArrears')}</span>
            <History size={18} />
          </div>
          <h3>{formatCurrency(stats.totalArrears)}</h3>
        </div>

        <div className="sec-card fully-paid-card">
          <div className="sec-header">
            <span>{t('dashboard.fullyPaid')}</span>
            <CheckCircle size={18} />
          </div>
          <h3>{stats.fullyPaid}</h3>
        </div>

        <div className="sec-card pending-members-card">
          <div className="sec-header">
            <span>{t('dashboard.pendingMembers')}</span>
            <AlertTriangle size={18} />
          </div>
          <h3>{stats.pendingMembers}</h3>
        </div>
      </div>

      {/* Content split section */}
      <div className="dashboard-content-split">
        {/* Recent Offline Payments */}
        <div className="table-card glass-card">
          <div className="card-header">
            <h4>{t('payment.paymentHistory')}</h4>
            <ArrowUpRight size={18} className="header-link-icon" />
          </div>
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>{t('member.memberName')}</th>
                  <th>{t('household.houseNumber')}</th>
                  <th>{t('payment.amount')}</th>
                  <th>{t('payment.paymentMethod')}</th>
                  <th>{t('payment.paymentDate')}</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-data-cell">{t('common.noData')}</td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="bold-text">{tx.memberName}</td>
                      <td>{tx.houseNumber}</td>
                      <td className="amount-text">{formatCurrency(tx.amount)}</td>
                      <td>
                        <span className={`method-badge ${tx.method}`}>
                          {t(`payment.${tx.method}`)}
                        </span>
                      </td>
                      <td>{new Date(tx.date).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Instructions / Info Panel */}
        <div className="info-card glass-card">
          <div className="card-header">
            <h4>{t('nav.settings')}</h4>
            <BookOpen size={18} className="header-link-icon" />
          </div>
          <div className="info-body">
            <div className="info-step">
              <span className="step-num">1</span>
              <div>
                <h5>Households Management</h5>
                <p>Register households and list families. Every household groups multiple members.</p>
              </div>
            </div>
            <div className="info-step">
              <span className="step-num">2</span>
              <div>
                <h5>Subscriptions Setup</h5>
                <p>Configure yearly fees. Outstanding balances auto-calculate as previous arrears.</p>
              </div>
            </div>
            <div className="info-step">
              <span className="step-num">3</span>
              <div>
                <h5>Offline Payments</h5>
                <p>Directly record cash, UPI, or bank transactions to immediately update ledgers.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          gap: 30px;
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
          font-size: 14px;
          opacity: 0.9;
        }

        .current-date-badge {
          background: rgba(255, 255, 255, 0.15);
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* METRICS GRID */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .metric-card {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .card-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .color-emerald { background-color: #ecfdf5; color: #059669; }
        .color-blue { background-color: #eff6ff; color: #2563eb; }
        .color-amber { background-color: #fffbeb; color: #d97706; }
        .color-green { background-color: #f0fdf4; color: #16a34a; }

        .card-details span {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-details h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 2px;
        }

        /* SECONDARY GRID */
        .secondary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .sec-card {
          padding: 20px;
          border-radius: var(--radius-md);
          color: white;
          box-shadow: var(--shadow-sm);
        }

        .sec-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .sec-card h3 {
          font-size: 22px;
          font-weight: 700;
        }

        .pending-card { background-color: #f59e0b; }
        .arrears-card { background-color: #ef4444; }
        .fully-paid-card { background-color: #10b981; }
        .pending-members-card { background-color: #6366f1; }

        /* SPLIT SECTION */
        .dashboard-content-split {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .table-card, .info-card {
          padding: 24px;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }

        .card-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        [data-theme="dark"] .card-header h4 {
          color: var(--gold-light);
        }

        .header-link-icon {
          color: var(--text-muted);
        }

        /* DASHBOARD TABLE */
        .table-responsive {
          overflow-x: auto;
        }

        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .dashboard-table th {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          background-color: var(--bg-app);
          border-bottom: 1px solid var(--border-color);
        }

        .dashboard-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .dashboard-table tr:last-child td {
          border-bottom: none;
        }

        .bold-text {
          font-weight: 600;
        }

        .amount-text {
          font-weight: 700;
          color: var(--primary-light);
        }

        .no-data-cell {
          text-align: center;
          color: var(--text-muted);
          padding: 30px !important;
        }

        /* METHOD BADGE */
        .method-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .method-badge.cash { background-color: #ecfdf5; color: #047857; }
        .method-badge.upi { background-color: #eff6ff; color: #1d4ed8; }
        .method-badge.bank_transfer { background-color: #f5f3ff; color: #6d28d9; }
        .method-badge.other { background-color: #fffbeb; color: #b45309; }

        /* INFO STEP CARD */
        .info-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-step {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: var(--primary-10);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
          border: 1px solid var(--primary-20);
        }

        .info-step h5 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 2px;
        }

        .info-step p {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        /* RESPONSIVE */
        @media (max-width: 1200px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .secondary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 991px) {
          .dashboard-content-split {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 576px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          .secondary-grid {
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
