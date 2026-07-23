import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';

import {
  Home,
  Users,
  TrendingUp,
  CheckCircle,
  History,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
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

  const collectionRate = stats.expectedSubscription > 0
    ? ((stats.totalCollected / stats.expectedSubscription) * 100).toFixed(1)
    : '0';

  return (
    <div className="lessa-dashboard">
      {/* 1. HERO STATS EMERALD BANNER CARD (Reference Image Top Section) */}
      <div className="hero-emerald-banner">
        <div className="hero-stat-col">
          <div className="hero-stat-top">
            <div className="hero-icon-circle">
              <Home size={18} color="#ffffff" />
            </div>
            <span className="hero-stat-label">{t('dashboard.totalHouseholds')}</span>
          </div>
          <h2 className="hero-stat-value">{stats.totalHouseholds}</h2>
        </div>

        <div className="hero-stat-col">
          <div className="hero-stat-top">
            <div className="hero-icon-circle">
              <Users size={18} color="#ffffff" />
            </div>
            <span className="hero-stat-label">{t('dashboard.totalMembers')}</span>
          </div>
          <h2 className="hero-stat-value">{stats.totalMembers}</h2>
        </div>

        <div className="hero-stat-col">
          <div className="hero-stat-top">
            <div className="hero-icon-circle">
              <TrendingUp size={18} color="#ffffff" />
            </div>
            <span className="hero-stat-label">Collection Rate</span>
          </div>
          <h2 className="hero-stat-value">{collectionRate}%</h2>
        </div>

        <div className="hero-stat-col">
          <div className="hero-stat-top">
            <div className="hero-icon-circle">
              <CheckCircle size={18} color="#ffffff" />
            </div>
            <span className="hero-stat-label">{t('dashboard.totalCollected')}</span>
          </div>
          <h2 className="hero-stat-value">{formatCurrency(stats.totalCollected)}</h2>
        </div>
      </div>

      {/* 2. MIDDLE GRID: Revenue Summary (Left 65%) + Orange Promo Banner (Right 35%) */}
      <div className="middle-dashboard-grid">
        {/* Summary Revenue Card */}
        <div className="glass-card summary-revenue-card">
          <div className="summary-card-header">
            <div>
              <h3 className="summary-card-title">Summary Revenue</h3>
              <p className="summary-card-sub">Last update last week • Mahallu Subscription</p>
            </div>
            <div className="trend-indicators">
              <span className="trend-tag up">
                <ArrowUp size={12} /> 23.22%
              </span>
              <span className="trend-tag down">
                <ArrowDown size={12} /> 3.31%
              </span>
            </div>
          </div>

          {/* Dues & Arrears Secondary Metric Row */}
          <div className="dues-metrics-row">
            <div className="mini-due-box">
              <span className="mini-label">{t('dashboard.pendingAmount')}</span>
              <h4 className="mini-val text-amber">{formatCurrency(stats.pendingAmount)}</h4>
            </div>
            <div className="mini-due-box">
              <span className="mini-label">{t('dashboard.totalArrears')}</span>
              <h4 className="mini-val text-red">{formatCurrency(stats.totalArrears)}</h4>
            </div>
            <div className="mini-due-box">
              <span className="mini-label">{t('dashboard.fullyPaid')}</span>
              <h4 className="mini-val text-emerald">{stats.fullyPaid} households</h4>
            </div>
            <div className="mini-due-box">
              <span className="mini-label">{t('dashboard.pendingMembers')}</span>
              <h4 className="mini-val text-muted">{stats.pendingMembers} households</h4>
            </div>
          </div>

          {/* Visual Progress Bar simulating revenue curve */}
          <div className="revenue-progress-bar-wrap">
            <div className="progress-bar-label">
              <span>Subscription Target vs Collection</span>
              <span className="progress-percent">{collectionRate}% Paid</span>
            </div>
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(100, Math.max(0, parseFloat(collectionRate)))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Orange Callout Banner (Exact Reference Image Style) */}
        <div className="orange-promo-card">
          <div className="promo-content">
            <h3 className="orange-title">Need more information?</h3>
            <p className="orange-desc">Present information in a visually appealing way for Mahallu members.</p>
            <button className="white-pill-btn">
              <span>See more</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SPLIT: Payment History Table + Guide Panel */}
      <div className="bottom-dashboard-grid">
        {/* Recent Offline Payments Table */}
        <div className="glass-card table-widget-card">
          <div className="widget-header">
            <div className="widget-header-title">
              <History size={18} className="text-emerald" />
              <h4>{t('payment.paymentHistory')}</h4>
            </div>
            <ArrowUpRight size={18} className="widget-link-icon" />
          </div>

          <div className="table-responsive">
            <table className="lessa-table">
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
                      <td className="bold-name">{tx.memberName}</td>
                      <td>{tx.houseNumber}</td>
                      <td className="amount-highlight">{formatCurrency(tx.amount)}</td>
                      <td>
                        <span className={`badge-pill ${tx.method === 'cash' ? 'success' : tx.method === 'upi' ? 'info' : 'warning'}`}>
                          {t(`payment.${tx.method}`)}
                        </span>
                      </td>
                      <td className="text-muted">{new Date(tx.date).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guide Steps Widget Card */}
        <div className="glass-card guide-widget-card">
          <div className="widget-header">
            <div className="widget-header-title">
              <BookOpen size={18} className="text-emerald" />
              <h4>Mahallu Guide</h4>
            </div>
            <ChevronRight size={18} className="widget-link-icon" />
          </div>

          <div className="guide-steps-list">
            <div className="guide-item">
              <div className="guide-num">1</div>
              <div className="guide-info">
                <h5>Households Management</h5>
                <p>Register households and list families. Every household groups multiple members.</p>
              </div>
            </div>

            <div className="guide-item">
              <div className="guide-num">2</div>
              <div className="guide-info">
                <h5>Subscriptions Setup</h5>
                <p>Configure yearly fees. Outstanding balances auto-calculate as previous arrears.</p>
              </div>
            </div>

            <div className="guide-item">
              <div className="guide-num">3</div>
              <div className="guide-info">
                <h5>Offline Payments</h5>
                <p>Directly record cash, UPI, or bank transactions to immediately update ledgers.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ════════════════════════════════════════════════
           LESSA DASHBOARD SPECIFIC STYLES
        ════════════════════════════════════════════════ */
        .lessa-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .loading-indicator {
          padding: 60px;
          text-align: center;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* ── 1. HERO EMERALD BANNER CARD ── */
        .hero-emerald-banner {
          background: linear-gradient(135deg, #00966b 0%, #037a57 100%);
          border-radius: var(--radius-lg);
          padding: 24px 28px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          box-shadow: 0 10px 25px -4px rgba(0, 150, 107, 0.35);
          color: #ffffff;
        }

        .hero-stat-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 20px;
          border-right: 1px solid rgba(255, 255, 255, 0.18);
        }

        .hero-stat-col:last-child {
          border-right: none;
          padding-right: 0;
        }

        .hero-stat-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .hero-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hero-stat-label {
          font-size: 13px;
          font-weight: 500;
          opacity: 0.9;
        }

        .hero-stat-value {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1;
          margin-top: 4px;
        }

        /* ── 2. MIDDLE DASHBOARD GRID ── */
        .middle-dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        /* Revenue Summary Card */
        .summary-revenue-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 20px;
        }

        .summary-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .summary-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
        }

        .summary-card-sub {
          font-size: 12.5px;
          color: #6b7280;
          margin-top: 2px;
        }

        .trend-indicators {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .trend-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
        }

        .trend-tag.up {
          background: #d1fae5;
          color: #065f46;
        }

        .trend-tag.down {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Dues Row */
        .dues-metrics-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          background: #f9fafb;
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .mini-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 600;
          display: block;
        }

        .mini-val {
          font-size: 15px;
          font-weight: 800;
          margin-top: 2px;
        }

        .text-amber { color: #d97706; }
        .text-red { color: #dc2626; }
        .text-emerald { color: #00966b; }
        .text-muted { color: #4b5563; }

        .revenue-progress-bar-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progress-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
        }

        .progress-percent {
          color: var(--primary);
          font-weight: 700;
        }

        .progress-track {
          height: 10px;
          background: #e5e7eb;
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00966b 0%, #00b380 100%);
          border-radius: 9999px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Orange Banner Card */
        .orange-promo-card {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          border-radius: var(--radius-lg);
          padding: 28px;
          color: #ffffff;
          box-shadow: 0 10px 25px -4px rgba(249, 115, 22, 0.35);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          position: relative;
          overflow: hidden;
        }

        .orange-title {
          font-size: 20px;
          font-weight: 800;
          line-height: 1.2;
        }

        .orange-desc {
          font-size: 13px;
          opacity: 0.9;
          margin: 8px 0 20px;
          line-height: 1.4;
        }

        .white-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          color: #ea580c;
          border: none;
          padding: 10px 22px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: var(--transition-all);
        }

        .white-pill-btn:hover {
          background: #f9fafb;
          transform: translateY(-1px);
        }

        /* ── 3. BOTTOM DASHBOARD GRID ── */
        .bottom-dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .table-widget-card, .guide-widget-card {
          padding: 24px;
        }

        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .widget-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .widget-header-title h4 {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
        }

        .widget-link-icon {
          color: #9ca3af;
          cursor: pointer;
        }

        /* Modern Table */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .lessa-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .lessa-table th {
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
        }

        .lessa-table td {
          padding: 14px;
          font-size: 13.5px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
        }

        .lessa-table tr:last-child td {
          border-bottom: none;
        }

        .bold-name {
          font-weight: 700;
          color: #111827;
        }

        .amount-highlight {
          font-weight: 800;
          color: var(--primary);
        }

        .no-data-cell {
          text-align: center;
          color: #9ca3af;
          padding: 20px;
        }

        /* Guide Widget Steps */
        .guide-steps-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .guide-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .guide-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #ecfdf5;
          color: var(--primary);
          font-weight: 800;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .guide-info h5 {
          font-size: 13.5px;
          font-weight: 700;
          color: #111827;
        }

        .guide-info p {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
          line-height: 1.35;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 991px) {
          .hero-emerald-banner { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .hero-stat-col:nth-child(2) { border-right: none; }
          .middle-dashboard-grid, .bottom-dashboard-grid { grid-template-columns: 1fr; }
          .dues-metrics-row { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 576px) {
          .hero-emerald-banner { grid-template-columns: 1fr; }
          .hero-stat-col { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.18); padding-bottom: 12px; }
          .hero-stat-col:last-child { border-bottom: none; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
