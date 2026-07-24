import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { Household, Member, MemberSubscription, SubscriptionYear, Payment } from '../../services/db';
import { 
  Home, Users, TrendingUp, CheckCircle, History, ArrowUpRight, 
  BookOpen, Plus, AlertCircle, X, 
  Loader2, Sparkles, Receipt, FileText, ArrowUp, Building2 
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Data States
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Quick Add Household Modal State
  const [isAddHouseModalOpen, setIsAddHouseModalOpen] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Main Area');
  const [houseFormError, setHouseFormError] = useState('');
  const [isSavingHouse, setIsSavingHouse] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [donations, setDonations] = useState<any[]>([]);
  const [deaths, setDeaths] = useState<any[]>([]);
  const [marriages, setMarriages] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [houseList, memberList, yearList, subList, payList, donList, deathList, marrList, campList] = await Promise.all([
        db.households.get(),
        db.members.get(),
        db.years.get(),
        db.subscriptions.get(),
        db.payments.get(),
        db.donations.get(),
        db.deaths.get(),
        db.marriages.get(),
        db.donationCampaigns.get(),
      ]);

      setHouseholds(houseList);
      setMembers(memberList);
      setYears(yearList);
      setSubscriptions(subList);
      setPayments(payList);
      setDonations(donList);
      setDeaths(deathList);
      setMarriages(marrList);
      setCampaigns(campList);

      if (yearList.length > 0 && !selectedYearId) {
        const activeYr = yearList.find((y) => y.status === 'active') || yearList[0];
        setSelectedYearId(activeYr.id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast('error', 'Unable to load dashboard metrics. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const activeYearObj = useMemo(() => {
    return years.find((y) => y.id === selectedYearId) || years[0] || null;
  }, [years, selectedYearId]);

  // CALCULATE DYNAMIC METRICS FOR SELECTED ACTIVE SUBSCRIPTION YEAR
  const dynamicStats = useMemo(() => {
    const activeHouseholds = households.filter((h) => h.status === 'active');
    const activeMembers = members.filter((m) => m.status === 'active');
    const accountableMembers = members.filter((m) => m.status === 'active' && m.is_subscription_accountable !== false);

    // Resolve numeric year from selectedYearId for filtering date-based records
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    // Filter community records by selected year (derived from date fields)
    const filteredDonations = selectedYear
      ? donations.filter((d) => new Date(d.donation_date).getFullYear() === selectedYear)
      : donations;
    const filteredDeaths = selectedYear
      ? deaths.filter((d) => new Date(d.date_of_death).getFullYear() === selectedYear)
      : deaths;
    const filteredMarriages = selectedYear
      ? marriages.filter((m) => new Date(m.nikah_date).getFullYear() === selectedYear)
      : marriages;

    const totalDonationVal = filteredDonations.reduce((sum, d) => sum + d.amount, 0);
    const deathsCount = filteredDeaths.length;
    const marriagesCount = filteredMarriages.length;
    const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;

    const yearSubs = selectedYearId 
      ? subscriptions.filter((s) => s.subscription_year_id === selectedYearId)
      : subscriptions;
    const expected = yearSubs.reduce((sum, s) => sum + s.total_due, 0);
    const collected = yearSubs.reduce((sum, s) => sum + s.total_paid, 0);
    const pending = yearSubs.reduce((sum, s) => sum + s.balance, 0);
    const arrears = yearSubs.reduce((sum, s) => sum + s.previous_arrears, 0);

    const fullyPaidCount = yearSubs.filter((s) => s.status === 'paid').length;
    const partiallyPaidCount = yearSubs.filter((s) => s.status === 'partially_paid').length;
    const unpaidCount = yearSubs.filter((s) => s.status === 'unpaid').length;

    const collectionRate = expected > 0 ? ((collected / expected) * 100).toFixed(1) : '0';

    return {
      totalHouseholds: activeHouseholds.length,
      totalMembers: activeMembers.length,
      accountableMembersCount: accountableMembers.length,
      expectedSubscription: expected,
      totalCollected: collected,
      pendingAmount: pending,
      totalArrears: arrears,
      fullyPaid: fullyPaidCount,
      partiallyPaid: partiallyPaidCount,
      unpaidCount,
      collectionRate,
      totalDonations: totalDonationVal,
      deathsCount,
      marriagesCount,
      activeCampaignsCount,
    };
  }, [households, members, subscriptions, selectedYearId, years, donations, deaths, marriages, campaigns]);

  // MONTHLY PAYMENT COLLECTION BAR CHART DATA — filtered by selected year
  const monthlyCollections = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthTotals = new Array(12).fill(0);

    // Resolve numeric year for chart filtering
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    payments.forEach((pay) => {
      const d = new Date(pay.payment_date);
      if (!isNaN(d.getTime())) {
        // Only include payments from selected year; if no year selected, show all
        if (!selectedYear || d.getFullYear() === selectedYear) {
          const mIdx = d.getMonth();
          monthTotals[mIdx] += pay.amount;
        }
      }
    });

    const maxVal = Math.max(...monthTotals, 1000);

    return months.map((month, idx) => ({
      month,
      amount: monthTotals[idx],
      heightPercent: Math.min(100, Math.max(10, Math.round((monthTotals[idx] / maxVal) * 100))),
    }));
  }, [payments, selectedYearId, years]);

  // RECENT SYSTEM ACTIVITY FEED GENERATED FROM REAL DATA
  const recentActivities = useMemo(() => {
    const acts: { id: string; title: string; desc: string; time: string; type: 'house' | 'member' | 'payment' }[] = [];

    // Recent payments
    payments.slice(0, 3).forEach((p) => {
      const m = members.find((mem) => mem.id === p.member_id);
      acts.push({
        id: `pay-${p.id}`,
        title: 'Offline Payment Recorded',
        desc: `₹${p.amount} received from ${m ? m.name : 'Member'} (${p.payment_method.toUpperCase()})`,
        time: p.payment_date,
        type: 'payment',
      });
    });

    // Recent households
    households.slice(0, 2).forEach((h) => {
      acts.push({
        id: `house-${h.id}`,
        title: 'New Household Registered',
        desc: `House H-${h.house_number} (${h.house_owner_name}) registered`,
        time: new Date(h.created_at).toLocaleDateString(),
        type: 'house',
      });
    });

    return acts.slice(0, 5);
  }, [payments, households, members]);

  // RECENT TRANSACTIONS TABLE
  const recentTransactions = useMemo(() => {
    return payments.slice(0, 5).map((pay) => {
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
  }, [payments, members, households]);

  // OPEN QUICK ADD HOUSEHOLD MODAL
  const openAddHouseModal = () => {
    setHouseNumber('');
    setOwnerName('');
    setOwnerPhone('');
    setAddress('');
    setArea('Main Area');
    setHouseFormError('');
    setIsAddHouseModalOpen(true);
  };

  // SAVE QUICK ADD HOUSEHOLD
  const handleSaveHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setHouseFormError('');

    if (!houseNumber.trim() || !ownerName.trim()) {
      setHouseFormError('House number and head of household name are required.');
      return;
    }

    if (households.some((h) => h.house_number.trim() === houseNumber.trim())) {
      setHouseFormError(`A household with house number H-${houseNumber.trim()} already exists.`);
      return;
    }

    setIsSavingHouse(true);

    try {
      await db.households.create({
        house_number: houseNumber.trim(),
        house_owner_name: ownerName.trim(),
        house_owner_phone: ownerPhone.trim() || null,
        address: address.trim() || null,
        area: area.trim() || 'Main Area',
        status: 'active',
      });

      showToast('success', `✓ Household H-${houseNumber.trim()} added successfully!`);
      setIsAddHouseModalOpen(false);
      await loadDashboardData();
    } catch (err: any) {
      setHouseFormError(err.message || 'Failed to add household. Please try again.');
    } finally {
      setIsSavingHouse(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="skeleton-loading-container animate-fade-in" style={{ padding: '40px 20px' }}>
        <div className="skeleton-row" style={{ height: '120px', borderRadius: '16px', marginBottom: '20px' }}></div>
        <div className="skeleton-row" style={{ height: '240px', borderRadius: '16px' }}></div>
      </div>
    );
  }

  return (
    <div className="lessa-dashboard animate-fade-in">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type} animate-bounce-in`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* PAGE HEADER & QUICK ACTIONS */}
      <div className="dashboard-header-bar">
        <div>
          <h3 className="dashboard-title">{t('nav.dashboard')} Overview</h3>
          <p className="dashboard-subtitle">
            Consolidated metrics, active subscription year analytics & quick operations.
          </p>
        </div>

        <div className="dashboard-actions-group">
          <YearFilter
            selectedYearId={selectedYearId}
            onChange={setSelectedYearId}
            years={years}
            showAllOption={true}
          />

          <button className="add-btn primary-btn" onClick={openAddHouseModal}>
            <Plus size={16} />
            <span>+ Add Household</span>
          </button>
        </div>
      </div>

      {/* 1. HERO STATS EMERALD BANNER CARD */}
      <div className="hero-emerald-banner shadow-md">
        <div className="hero-stat-col">
          <div className="hero-stat-top">
            <div className="hero-icon-circle">
              <Home size={18} color="#ffffff" />
            </div>
            <span className="hero-stat-label">{t('dashboard.totalHouseholds')}</span>
          </div>
          <h2 className="hero-stat-value">{dynamicStats.totalHouseholds}</h2>
          <span className="hero-stat-sub font-xs">Active house units</span>
        </div>

        <div className="hero-stat-col">
          <div className="hero-stat-top">
            <div className="hero-icon-circle">
              <Users size={18} color="#ffffff" />
            </div>
            <span className="hero-stat-label">{t('dashboard.totalMembers')}</span>
          </div>
          <h2 className="hero-stat-value">{dynamicStats.totalMembers}</h2>
          <span className="hero-stat-sub font-xs">
            {dynamicStats.accountableMembersCount} Accountable
          </span>
        </div>

        <div className="hero-stat-col">
          <div className="hero-stat-top">
            <div className="hero-icon-circle">
              <TrendingUp size={18} color="#ffffff" />
            </div>
            <span className="hero-stat-label">Collection Target</span>
          </div>
          <h2 className="hero-stat-value">{dynamicStats.collectionRate}%</h2>
          <span className="hero-stat-sub font-xs">Year {activeYearObj?.year} Target</span>
        </div>

        <div className="hero-stat-col no-border">
          <div className="hero-stat-top">
            <div className="hero-icon-circle">
              <CheckCircle size={18} color="#ffffff" />
            </div>
            <span className="hero-stat-label">{t('dashboard.totalCollected')}</span>
          </div>
          <h2 className="hero-stat-value">{formatCurrency(dynamicStats.totalCollected)}</h2>
          <span className="hero-stat-sub font-xs">Actual payments received</span>
        </div>
      </div>

      {/* 2. MIDDLE GRID: Revenue Summary + Quick Actions & Alerts */}
      <div className="middle-dashboard-grid">
        {/* Revenue & Subscription Breakdown Card */}
        <div className="glass-card summary-revenue-card shadow-sm">
          <div className="summary-card-header">
            <div>
              <h3 className="summary-card-title">
                Financial Revenue & Subscription Summary ({activeYearObj?.year})
              </h3>
              <p className="summary-card-sub">Real-time dynamic aggregation from Supabase records</p>
            </div>
            <div className="trend-indicators">
              <span className="trend-tag up">
                <ArrowUp size={12} /> {dynamicStats.collectionRate}% Paid
              </span>
            </div>
          </div>

          {/* Metric Boxes */}
          <div className="dues-metrics-row">
            <div className="mini-due-box">
              <span className="mini-label">{t('dashboard.pendingAmount')}</span>
              <h4 className="mini-val text-amber">{formatCurrency(dynamicStats.pendingAmount)}</h4>
            </div>
            <div className="mini-due-box">
              <span className="mini-label">{t('dashboard.totalArrears')}</span>
              <h4 className="mini-val text-red">{formatCurrency(dynamicStats.totalArrears)}</h4>
            </div>
            <div className="mini-due-box">
              <span className="mini-label">{t('dashboard.fullyPaid')}</span>
              <h4 className="mini-val text-emerald">{dynamicStats.fullyPaid} Members</h4>
            </div>
            <div className="mini-due-box">
              <span className="mini-label">{t('dashboard.pendingMembers')}</span>
              <h4 className="mini-val text-muted">{dynamicStats.unpaidCount} Members</h4>
            </div>
          </div>

          {/* Monthly Payments Collection Bar Chart */}
          <div className="chart-section-wrapper">
            <div className="chart-head">
              <span className="bold-text font-sm">Monthly Offline Collection Breakdown (INR)</span>
              <span className="font-xs text-muted">Payments timeline</span>
            </div>
            <div className="bar-chart-container">
              {monthlyCollections.map((col) => (
                <div key={col.month} className="bar-col">
                  <div
                    className="bar-fill"
                    style={{ height: `${col.heightPercent}%` }}
                    title={`${col.month}: ₹${col.amount}`}
                  ></div>
                  <span className="bar-month-label">{col.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions & Actionable Alerts Side Widget */}
        <div className="side-actions-widget">
          <div className="glass-card widget-card shadow-sm">
            <div className="widget-header">
              <div className="widget-header-title">
                <Sparkles size={18} className="text-emerald" />
                <h4>Quick Actions</h4>
              </div>
            </div>

            <div className="quick-action-buttons-list">
              <button className="quick-action-btn" onClick={openAddHouseModal}>
                <Building2 size={16} />
                <span>Add Household</span>
              </button>

              <button
                className="quick-action-btn"
                onClick={() => navigate('/admin/members')}
              >
                <Users size={16} />
                <span>Add Member</span>
              </button>

              <button
                className="quick-action-btn"
                onClick={() => navigate('/admin/payments')}
              >
                <Receipt size={16} />
                <span>Record Payment</span>
              </button>

              <button
                className="quick-action-btn"
                onClick={() => navigate('/admin/subscriptions')}
              >
                <FileText size={16} />
                <span>Manage Subscriptions</span>
              </button>
            </div>
          </div>

          {/* Actionable Alerts Widget */}
          <div className="glass-card widget-card shadow-sm alert-widget">
            <div className="widget-header">
              <div className="widget-header-title">
                <AlertCircle size={18} className="text-amber" />
                <h4>Actionable Alerts</h4>
              </div>
            </div>

            <div className="alerts-list">
              {dynamicStats.unpaidCount > 0 && (
                <div className="alert-item amber">
                  <AlertCircle size={15} />
                  <span>
                    ⚠ {dynamicStats.unpaidCount} accountable members have unpaid subscriptions for {activeYearObj?.year}.
                  </span>
                </div>
              )}

              {dynamicStats.totalArrears > 0 && (
                <div className="alert-item red">
                  <AlertCircle size={15} />
                  <span>
                    ⚠ {formatCurrency(dynamicStats.totalArrears)} total previous arrears pending collection.
                  </span>
                </div>
              )}

              <div className="alert-item emerald">
                <CheckCircle size={15} />
                <span>
                  ✓ {dynamicStats.collectionRate}% of target subscriptions collected for year {activeYearObj?.year}.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SPLIT: Payment History Table + Recent System Activity */}
      <div className="bottom-dashboard-grid">
        {/* Recent Offline Payments Table */}
        <div className="glass-card table-widget-card shadow-sm">
          <div className="widget-header">
            <div className="widget-header-title">
              <History size={18} className="text-emerald" />
              <h4>{t('payment.paymentHistory')}</h4>
            </div>
            <button className="view-all-link" onClick={() => navigate('/admin/payments')}>
              <span>View All</span>
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="table-responsive desktop-view-only">
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
                    <td colSpan={5} className="no-data-cell">
                      No offline payment records logged yet.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="bold-name">{tx.memberName}</td>
                      <td>House H-{tx.houseNumber}</td>
                      <td className="amount-highlight text-success">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td>
                        <span className="badge-pill success">
                          {tx.method.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-muted">{tx.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE TRANSACTION CARDS */}
          <div className="mobile-cards-directory">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="mobile-notif-card">
                <div className="card-head">
                  <div>
                    <h4 className="notif-title">{tx.memberName}</h4>
                    <span className="notif-date">House H-{tx.houseNumber} • {tx.date}</span>
                  </div>
                  <span className="bold-text text-success">{formatCurrency(tx.amount)}</span>
                </div>
                <div className="card-body">
                  <span>Method: {tx.method.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent System Activity Widget */}
        <div className="glass-card guide-widget-card shadow-sm">
          <div className="widget-header">
            <div className="widget-header-title">
              <BookOpen size={18} className="text-emerald" />
              <h4>Recent System Activity</h4>
            </div>
          </div>

          <div className="guide-steps-list">
            {recentActivities.map((act, idx) => (
              <div key={act.id} className="guide-item">
                <div className="guide-num">{idx + 1}</div>
                <div className="guide-info">
                  <h5>{act.title}</h5>
                  <p>{act.desc}</p>
                  <span className="activity-time-tag">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MODAL: QUICK ADD HOUSEHOLD
      ════════════════════════════════════════════════ */}
      {isAddHouseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>Add New Household</h4>
                <p className="modal-subtitle">Register a new household unit into the Mahallu database.</p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsAddHouseModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHousehold} className="modal-form">
              {houseFormError && (
                <div className="form-alert error">
                  <AlertCircle size={16} />
                  <span>{houseFormError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="modal-house-num">Household Number *</label>
                <input
                  id="modal-house-num"
                  type="text"
                  required
                  placeholder="e.g. H-105"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-owner-name">Head of Household (Owner Name) *</label>
                <input
                  id="modal-owner-name"
                  type="text"
                  required
                  placeholder="e.g. Ahmed Ali"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="modal-owner-phone">Contact Phone</label>
                  <input
                    id="modal-owner-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-area">Ward / Area</label>
                  <input
                    id="modal-area"
                    type="text"
                    placeholder="e.g. Main Area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-address">Full Address</label>
                <input
                  id="modal-address"
                  type="text"
                  placeholder="e.g. Green Valley Road, Wayanad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddHouseModalOpen(false)}
                  disabled={isSavingHouse}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="add-btn primary-btn"
                  disabled={isSavingHouse}
                >
                  {isSavingHouse ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Household</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .lessa-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .toast-notification {
          position: fixed;
          top: 24px; right: 24px;
          z-index: 999;
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px; border-radius: var(--radius-pill);
          font-weight: 700; font-size: 13.5px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        .toast-notification.success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .toast-notification.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .dashboard-header-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; width: 100%; box-sizing: border-box;
        }
        .dashboard-title { font-size: 22px; font-weight: 800; color: #111827; }
        .dashboard-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

        .dashboard-actions-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .year-selector-pill {
          display: flex; align-items: center; gap: 8px;
          background: #ffffff; border: 1px solid var(--border-color);
          padding: 6px 14px; border-radius: var(--radius-pill);
          font-size: 13px; font-weight: 700; color: #374151;
        }
        .calendar-icon { color: #00966b; }
        .year-dropdown-select {
          border: none; background: transparent; font-weight: 800; color: #00966b; cursor: pointer; font-size: 13px; outline: none;
        }

        .add-btn.primary-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 20px; border-radius: var(--radius-pill); background: var(--primary);
          color: #ffffff; font-weight: 700; font-size: 13.5px; border: none; cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35); transition: var(--transition-all);
        }

        /* 1. HERO EMERALD BANNER CARD */
        .hero-emerald-banner {
          background: linear-gradient(135deg, #00966b 0%, #037a57 100%);
          border-radius: var(--radius-xl);
          padding: 24px 28px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          color: #ffffff;
        }

        .hero-stat-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-right: 20px;
          border-right: 1px solid rgba(255, 255, 255, 0.18);
        }
        .hero-stat-col.no-border { border-right: none; }

        .hero-stat-top { display: flex; align-items: center; gap: 10px; }
        .hero-icon-circle {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex; align-items: center; justify-content: center;
        }
        .hero-stat-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9; }
        .hero-stat-value { font-size: 26px; font-weight: 800; line-height: 1.1; }
        .hero-stat-sub { font-size: 11px; opacity: 0.8; }

        /* 2. MIDDLE DASHBOARD GRID */
        .middle-dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: stretch;
        }

        .summary-revenue-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .summary-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .summary-card-title { font-size: 17px; font-weight: 800; color: #111827; }
        .summary-card-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }

        .trend-tag.up { background: #d1fae5; color: #065f46; font-weight: 800; font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-pill); display: inline-flex; align-items: center; gap: 4px; }

        .dues-metrics-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          background: #f9fafb;
          padding: 14px;
          border-radius: var(--radius-lg);
          border: 1px solid #f3f4f6;
        }

        .mini-due-box { display: flex; flex-direction: column; gap: 2px; }
        .mini-label { font-size: 10.5px; font-weight: 800; color: #6b7280; text-transform: uppercase; }
        .mini-val { font-size: 16px; font-weight: 800; }

        .text-amber { color: #d97706; }
        .text-red { color: #dc2626; }
        .text-emerald { color: #059669; }
        .text-muted { color: #6b7280; }
        .text-success { color: #059669; }

        /* MONTHLY CHART */
        .chart-section-wrapper { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
        .chart-head { display: flex; justify-content: space-between; align-items: center; }

        .bar-chart-container {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 8px;
          height: 120px;
          align-items: flex-end;
          background: #f9fafb;
          padding: 14px 10px 8px;
          border-radius: var(--radius-lg);
          border: 1px solid #f3f4f6;
        }

        .bar-col { display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
        .bar-fill {
          width: 100%; max-width: 24px; background: linear-gradient(180deg, #00966b 0%, #10b981 100%);
          border-radius: 6px 6px 0 0; transition: height 0.4s ease;
        }
        .bar-month-label { font-size: 10px; font-weight: 700; color: #6b7280; }

        /* SIDE ACTIONS WIDGET */
        .side-actions-widget { display: flex; flex-direction: column; gap: 16px; }
        .widget-card { background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 18px; display: flex; flex-direction: column; gap: 14px; }

        .widget-header { display: flex; justify-content: space-between; align-items: center; }
        .widget-header-title { display: flex; align-items: center; gap: 8px; }
        .widget-header-title h4 { font-size: 15px; font-weight: 800; color: #111827; }

        .quick-action-buttons-list { display: flex; flex-direction: column; gap: 8px; }
        .quick-action-btn {
          display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--radius-lg);
          border: 1px solid var(--border-color); background: #f9fafb; color: #374151; font-size: 13.5px; font-weight: 700;
          cursor: pointer; transition: var(--transition-all); text-align: left; min-height: 52px;
        }
        .quick-action-btn:hover { background: #ecfdf5; color: #00966b; border-color: #a7f3d0; }

        .alerts-list { display: flex; flex-direction: column; gap: 8px; }
        .alert-item { display: flex; align-items: flex-start; gap: 8px; padding: 10px; border-radius: var(--radius-md); font-size: 12px; font-weight: 600; }
        .alert-item.amber { background: #fef3c7; color: #92400e; }
        .alert-item.red { background: #fee2e2; color: #991b1b; }
        .alert-item.emerald { background: #d1fae5; color: #065f46; }

        /* 3. BOTTOM DASHBOARD GRID */
        .bottom-dashboard-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: flex-start; }
        .view-all-link { display: flex; align-items: center; gap: 4px; background: transparent; border: none; color: #00966b; font-weight: 700; font-size: 12.5px; cursor: pointer; }

        .table-widget-card { background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 18px; display: flex; flex-direction: column; gap: 14px; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .lessa-table { width: 100%; border-collapse: collapse; text-align: left; }
        .lessa-table th { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .lessa-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; color: #111827; }
        .bold-name { font-weight: 700; }
        .amount-highlight { font-weight: 800; }

        .badge-pill { display: inline-block; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: var(--radius-pill); }
        .badge-pill.success { background: #d1fae5; color: #065f46; }

        .guide-widget-card { background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 18px; display: flex; flex-direction: column; gap: 14px; }
        .guide-steps-list { display: flex; flex-direction: column; gap: 12px; }
        .guide-item { display: flex; align-items: flex-start; gap: 12px; }
        .guide-num { width: 24px; height: 24px; border-radius: 50%; background: #ecfdf5; color: #00966b; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .guide-info h5 { font-size: 13px; font-weight: 700; color: #111827; }
        .guide-info p { font-size: 11.5px; color: #6b7280; margin-top: 2px; }
        .activity-time-tag { font-size: 10px; color: #9ca3af; display: block; margin-top: 2px; }

        /* MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.55); backdrop-filter: blur(4px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
        .modal-dialog-card { width: 100%; max-width: 520px; background: #ffffff; border-radius: var(--radius-xl); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); overflow: hidden; border: 1px solid var(--border-color); box-sizing: border-box; }
        .modal-header { padding: 18px 20px; display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
        .modal-header h4 { font-size: 17px; font-weight: 800; color: #111827; }
        .modal-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .modal-close-btn { background: transparent; border: none; color: #9ca3af; cursor: pointer; }
        .modal-form { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .form-row-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12.5px; font-weight: 700; color: #374151; }
        .form-group input, .form-group select { padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: #f9fafb; color: #111827; font-size: 13.5px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary); background: #ffffff; box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12); }
        .form-alert.error { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: var(--radius-md); font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e5e7eb; }
        .btn-cancel { background: #f3f4f6; border: 1px solid var(--border-color); color: #374151; padding: 10px 18px; border-radius: var(--radius-pill); font-weight: 700; cursor: pointer; }

        /* RESPONSIVE */
        @media (max-width: 991px) {
          .hero-emerald-banner { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .hero-stat-col { border-right: none; padding-right: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.18); padding-bottom: 12px; }
          .middle-dashboard-grid { grid-template-columns: 1fr; }
          .bottom-dashboard-grid { grid-template-columns: 1fr; }
          .dues-metrics-row { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 640px) {
          .hero-emerald-banner { grid-template-columns: 1fr; }
          .dashboard-header-bar { flex-direction: column; align-items: stretch; gap: 12px; }
          .dashboard-actions-group { flex-direction: column; align-items: stretch; }
          .year-selector-pill { justify-content: space-between; }
          .dues-metrics-row { grid-template-columns: 1fr; }
          .form-row-grid { grid-template-columns: 1fr; }
          .modal-overlay { padding: 0; align-items: flex-end; }
          .modal-dialog-card { border-radius: 20px 20px 0 0; max-height: 90vh; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
