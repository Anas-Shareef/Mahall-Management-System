import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { 
  Household, Member, MemberSubscription, SubscriptionYear, Payment, ArrearAdjustment 
} from '../../services/db';
import { 
  Plus, Search, Filter, Calendar, X, AlertCircle, 
  CheckCircle, Loader2, Home, CreditCard, 
  Layers, Sparkles, UserCheck, DollarSign, Eye
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { SidePanel } from '../../components/SidePanel';

export const Subscriptions: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Primary Sub-Tab State ('overview' | 'ledgers' | 'years')
  const [activeTab, setActiveTab] = useState<'overview' | 'ledgers' | 'years'>('overview');

  // Data States
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [arrearsList, setArrearsList] = useState<ArrearAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');

  // Selected Member Ledger View Modal State
  const [ledgerMember, setLedgerMember] = useState<Member | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Add Arrear Adjustment Modal State
  const [isArrearModalOpen, setIsArrearModalOpen] = useState(false);
  const [arrearYearId, setArrearYearId] = useState('');
  const [arrearAmount, setArrearAmount] = useState<number>(0);
  const [arrearReason, setArrearReason] = useState('');
  const [isSavingArrear, setIsSavingArrear] = useState(false);

  // Configure Year Modal State
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [yearVal, setYearVal] = useState<number>(new Date().getFullYear());
  const [defaultFee, setDefaultFee] = useState<number>(1200);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [yearStatus, setYearStatus] = useState<'active' | 'inactive'>('active');
  const [yearError, setYearError] = useState('');
  const [isSavingYear, setIsSavingYear] = useState(false);

  // Ledger Generation State & Modal
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{
    yearName: number;
    fee: number;
    accountableCount: number;
    createdCount: number;
    existingCount: number;
  } | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [yearList, memberList, houseList, subList, payList, arrList] = await Promise.all([
        db.years.get(),
        db.members.get(),
        db.households.get(),
        db.subscriptions.get(),
        db.payments.get(),
        db.arrears.get(),
      ]);
      setYears(yearList);
      setMembers(memberList);
      setHouseholds(houseList);
      setSubscriptions(subList);
      setPayments(payList);
      setArrearsList(arrList);

      if (yearList.length > 0 && !selectedYearId) {
        const activeYr = yearList.find((y) => y.status === 'active') || yearList[0];
        setSelectedYearId(activeYr.id);
      }
    } catch (err) {
      console.error('Failed to load subscriptions setup:', err);
      showToast('error', 'Unable to load subscription data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentYearObj = useMemo(() => {
    return years.find((y) => y.id === selectedYearId) || years[0] || null;
  }, [years, selectedYearId]);

  // CALCULATED DYNAMIC STATISTICS FOR CURRENT SELECTED YEAR
  const yearStats = useMemo(() => {
    const yearSubs = selectedYearId 
      ? subscriptions.filter((s) => s.subscription_year_id === selectedYearId)
      : subscriptions;
    const accountableMembers = members.filter((m) => m.status === 'active' && m.is_subscription_accountable !== false);

    const paidCount = yearSubs.filter((s) => s.status === 'paid').length;
    const partiallyPaidCount = yearSubs.filter((s) => s.status === 'partially_paid').length;
    const unpaidCount = yearSubs.filter((s) => s.status === 'unpaid').length;

    const totalExpected = yearSubs.reduce((sum, s) => sum + s.total_due, 0);
    const totalCollected = yearSubs.reduce((sum, s) => sum + s.total_paid, 0);
    const totalOutstanding = yearSubs.reduce((sum, s) => sum + s.balance, 0);

    return {
      accountableMembers: accountableMembers.length,
      paidCount,
      partiallyPaidCount,
      unpaidCount,
      totalExpected,
      totalCollected,
      totalOutstanding,
    };
  }, [subscriptions, selectedYearId, members]);

  // Open Configure Year Modal
  const openConfigureYearModal = () => {
    const existingYears = years.map((y) => y.year);
    const nextYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : new Date().getFullYear();

    setYearVal(nextYear);
    setDefaultFee(1200);
    setStartDate(`${nextYear}-01-01`);
    setEndDate(`${nextYear}-12-31`);
    setYearStatus('active');
    setYearError('');
    setIsYearModalOpen(true);
  };

  // Save Configure Year Form
  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setYearError('');

    if (years.some((y) => y.year === yearVal)) {
      setYearError(`⚠ Subscription year ${yearVal} already exists. Please choose a different year.`);
      return;
    }

    setIsSavingYear(true);

    try {
      const newYearRecord = await db.years.create({
        year: yearVal,
        default_fee: Number(defaultFee),
        start_date: startDate || `${yearVal}-01-01`,
        end_date: endDate || `${yearVal}-12-31`,
        status: yearStatus,
      });

      showToast('success', `✓ Subscription year ${yearVal} configured successfully.`);
      setIsYearModalOpen(false);

      // Reload dataset and auto-select new year
      await loadData();
      setSelectedYearId(newYearRecord.id);
    } catch (err: any) {
      setYearError(err.message || 'Failed to save subscription year.');
    } finally {
      setIsSavingYear(false);
    }
  };

  // TRIGGER IDEMPOTENT LEDGER GENERATION
  const handleGenerateLedger = async (targetYearId?: string) => {
    const yearToGenId = targetYearId || selectedYearId;
    const targetYr = years.find((y) => y.id === yearToGenId);
    if (!targetYr) {
      showToast('error', 'Please select a valid subscription year.');
      return;
    }

    setIsGenerating(true);

    try {
      const summary = await db.subscriptions.generateLedger(yearToGenId);
      setGenResult({
        yearName: targetYr.year,
        fee: targetYr.default_fee,
        accountableCount: summary.accountableCount,
        createdCount: summary.createdCount,
        existingCount: summary.existingCount,
      });

      showToast('success', `✓ Subscription ledger for ${targetYr.year} generated successfully!`);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to generate subscription ledger.');
    } finally {
      setIsGenerating(false);
    }
  };

  // OPEN MEMBER LEDGER DETAIL MODAL
  const openMemberLedgerModal = (member: Member) => {
    setLedgerMember(member);
    setIsLedgerModalOpen(true);
  };

  // TOGGLE MEMBER ACCOUNTABILITY FROM LEDGER MODAL
  const handleToggleAccountability = async (member: Member, newValue: boolean) => {
    try {
      await db.members.update(member.id, { is_subscription_accountable: newValue });
      showToast('success', `✓ Member accountability set to ${newValue ? 'ON' : 'OFF'}.`);
      setLedgerMember((prev) => (prev ? { ...prev, is_subscription_accountable: newValue } : null));
      loadData();
    } catch (err: any) {
      showToast('error', 'Failed to update member accountability setting.');
    }
  };

  // ADD ARREAR ADJUSTMENT TO MEMBER LEDGER
  const handleSaveArrearAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerMember || !arrearYearId || arrearAmount <= 0) {
      showToast('error', 'Please provide a valid year and arrear amount.');
      return;
    }

    setIsSavingArrear(true);

    try {
      await db.arrears.create({
        member_id: ledgerMember.id,
        subscription_year_id: arrearYearId,
        amount: Number(arrearAmount),
        reason: arrearReason.trim() || 'Manual arrear adjustment',
        created_by: user?.id || null,
      });

      // Also update or add arrear to current subscription
      const sub = subscriptions.find(
        (s) => s.member_id === ledgerMember.id && s.subscription_year_id === arrearYearId
      );
      if (sub) {
        await db.subscriptions.update(sub.id, {
          previous_arrears: sub.previous_arrears + Number(arrearAmount),
        });
      }

      showToast('success', '✓ Arrear adjustment added successfully.');
      setIsArrearModalOpen(false);
      setArrearAmount(0);
      setArrearReason('');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add arrear adjustment.');
    } finally {
      setIsSavingArrear(false);
    }
  };

  // Dynamic Member Ledgers List Filtered
  const filteredLedgerMembers = useMemo(() => {
    return members.filter((m) => {
      if (m.status !== 'active') return false;

      const house = households.find((h) => h.id === m.household_id);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (house && (house.house_number.includes(q) || house.house_owner_name.toLowerCase().includes(q)));

      const matchesHouse = selectedHouseholdId ? m.household_id === selectedHouseholdId : true;

      // Status filter matching for current selected year
      const sub = subscriptions.find(
        (s) => s.member_id === m.id && s.subscription_year_id === selectedYearId
      );
      const subStatusVal = sub ? sub.status : 'unpaid';
      const matchesStatus = selectedStatus ? subStatusVal === selectedStatus : true;

      return matchesSearch && matchesHouse && matchesStatus;
    });
  }, [members, households, searchQuery, selectedHouseholdId, selectedStatus, subscriptions, selectedYearId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="subscriptions-page animate-fade-in">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type} animate-bounce-in`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="page-header-actions">
        <div>
          <h3>{t('subscription.subscriptionTitle')}</h3>
          <p className="page-subtitle">Scalable year-based subscription ledgers, rolling arrears & payment allocation.</p>
        </div>

        <div className="header-cta-group">
          <YearFilter
            selectedYearId={selectedYearId}
            onChange={setSelectedYearId}
            years={years}
            showAllOption={true}
            showFee={true}
          />

          <button className="add-btn secondary-btn" onClick={openConfigureYearModal}>
            <Plus size={15} />
            <span>Configure Year</span>
          </button>

          <button
            className="add-btn primary-btn"
            onClick={() => handleGenerateLedger()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="spinner-icon" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Subscription Ledger</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PRIMARY NAVIGATION TABS */}
      <div className="subscription-nav-tabs">
        <button
          className={`tab-pill-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers size={16} />
          <span>Overview & Stats</span>
        </button>

        <button
          className={`tab-pill-btn ${activeTab === 'ledgers' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledgers')}
        >
          <UserCheck size={16} />
          <span>Member Ledgers</span>
        </button>

        <button
          className={`tab-pill-btn ${activeTab === 'years' ? 'active' : ''}`}
          onClick={() => setActiveTab('years')}
        >
          <Calendar size={16} />
          <span>Subscription Years</span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════
          TAB 1: OVERVIEW & FINANCIAL STATS DASHBOARD
      ════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="overview-tab-content animate-fade-in">
          {/* STATS CARDS GRID */}
          <div className="stats-dashboard-grid">
            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box emerald">
                <UserCheck size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Accountable Members</span>
                <h3 className="metric-value">{yearStats.accountableMembers}</h3>
                <span className="metric-sub">Eligible for {currentYearObj?.year} ledger</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box green">
                <CheckCircle size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Fully Paid</span>
                <h3 className="metric-value text-success">{yearStats.paidCount}</h3>
                <span className="metric-sub">{yearStats.partiallyPaidCount} Partially paid</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box amber">
                <AlertCircle size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Unpaid Dues</span>
                <h3 className="metric-value text-warning">{yearStats.unpaidCount}</h3>
                <span className="metric-sub">Pending members count</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box primary">
                <DollarSign size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Expected</span>
                <h3 className="metric-value text-primary">{formatCurrency(yearStats.totalExpected)}</h3>
                <span className="metric-sub">Annual + Rolling Arrears</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box teal">
                <CreditCard size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Collected</span>
                <h3 className="metric-value text-success">{formatCurrency(yearStats.totalCollected)}</h3>
                <span className="metric-sub">Actual payments received</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box red">
                <AlertCircle size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Outstanding</span>
                <h3 className="metric-value text-danger">{formatCurrency(yearStats.totalOutstanding)}</h3>
                <span className="metric-sub">Remaining balance to collect</span>
              </div>
            </div>
          </div>

          {/* PROGRESS & QUICK ACTIONS CARD */}
          <div className="overview-summary-card glass-card">
            <div className="card-head">
              <div>
                <h4>{currentYearObj?.year} Financial Collection Overview</h4>
                <p>Consolidated progress of active subscription year collections vs expected obligations.</p>
              </div>
              <span className="year-fee-tag">Annual Rate: ₹{currentYearObj?.default_fee}</span>
            </div>

            <div className="progress-bar-container">
              <div className="progress-labels">
                <span>Collected: {formatCurrency(yearStats.totalCollected)}</span>
                <span>
                  {yearStats.totalExpected > 0
                    ? Math.round((yearStats.totalCollected / yearStats.totalExpected) * 100)
                    : 0}
                  % Target Achieved
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      yearStats.totalExpected > 0
                        ? Math.min(100, (yearStats.totalCollected / yearStats.totalExpected) * 100)
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 2: MEMBER LEDGERS DIRECTORY & SEARCH
      ════════════════════════════════════════════════ */}
      {activeTab === 'ledgers' && (
        <div className="ledgers-tab-content animate-fade-in">
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="filter-bar glass-card">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search member name, house number, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-selectors-grid">
              <div className="filter-select-wrapper">
                <Filter size={15} className="select-icon" />
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="">Status: All</option>
                  <option value="paid">{t('subscription.paid')}</option>
                  <option value="partially_paid">{t('subscription.partiallyPaid')}</option>
                  <option value="unpaid">{t('subscription.unpaid')}</option>
                </select>
              </div>

              <div className="filter-select-wrapper">
                <Home size={15} className="select-icon" />
                <select
                  value={selectedHouseholdId}
                  onChange={(e) => setSelectedHouseholdId(e.target.value)}
                >
                  <option value="">Household: All</option>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      House {h.house_number} ({h.house_owner_name})
                    </option>
                  ))}
                </select>
              </div>

              {(searchQuery || selectedStatus || selectedHouseholdId) && (
                <button
                  className="clear-filters-link"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('');
                    setSelectedHouseholdId('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* MEMBER LEDGERS TABLE / CARDS */}
          <div className="table-container-card glass-card">
            {loading ? (
              <div className="skeleton-loading-container">
                <div className="skeleton-row"></div>
                <div className="skeleton-row"></div>
                <div className="skeleton-row"></div>
              </div>
            ) : filteredLedgerMembers.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-icon neutral">
                  <Search size={32} />
                </div>
                <h4>No member ledgers found</h4>
                <p>Try adjusting your search criteria or select another subscription year.</p>
              </div>
            ) : (
              <>
                {/* DESKTOP TABLE */}
                <div className="table-responsive desktop-view-only">
                  <table className="subscriptions-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Household</th>
                        <th>Annual Rate</th>
                        <th>Previous Arrears</th>
                        <th>Total Due</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedgerMembers.map((m) => {
                        const house = households.find((h) => h.id === m.household_id);
                        const sub = subscriptions.find(
                          (s) => s.member_id === m.id && s.subscription_year_id === selectedYearId
                        );

                        const annualFeeVal = sub ? sub.annual_fee : currentYearObj?.default_fee || 0;
                        const prevArrearsVal = sub ? sub.previous_arrears : 0;
                        const totalDueVal = sub ? sub.total_due : annualFeeVal;
                        const totalPaidVal = sub ? sub.total_paid : 0;
                        const balanceVal = sub ? sub.balance : totalDueVal;
                        const statusVal = sub ? sub.status : 'unpaid';

                        return (
                          <tr key={m.id} className="sub-row" onClick={() => openMemberLedgerModal(m)}>
                            <td className="bold-text">
                              <div className="name-cell">
                                <span>{m.name}</span>
                                {m.is_subscription_accountable === false && (
                                  <span className="opted-out-badge">Non-Accountable</span>
                                )}
                              </div>
                            </td>
                            <td>
                              {house ? `H-${house.house_number} (${house.house_owner_name})` : 'N/A'}
                            </td>
                            <td>{formatCurrency(annualFeeVal)}</td>
                            <td>{formatCurrency(prevArrearsVal)}</td>
                            <td className="bold-text">{formatCurrency(totalDueVal)}</td>
                            <td className="text-success">{formatCurrency(totalPaidVal)}</td>
                            <td className={`balance-td ${balanceVal > 0 ? 'outstanding' : 'paid'}`}>
                              {formatCurrency(balanceVal)}
                            </td>
                            <td>
                              <span className={`status-pill ${statusVal}`}>
                                {statusVal.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="action-icon-btn view"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMemberLedgerModal(m);
                                }}
                                title="View Member Subscription Ledger"
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS */}
                <div className="mobile-cards-directory">
                  {filteredLedgerMembers.map((m) => {
                    const house = households.find((h) => h.id === m.household_id);
                    const sub = subscriptions.find(
                      (s) => s.member_id === m.id && s.subscription_year_id === selectedYearId
                    );

                    const totalDueVal = sub ? sub.total_due : currentYearObj?.default_fee || 0;
                    const balanceVal = sub ? sub.balance : totalDueVal;
                    const statusVal = sub ? sub.status : 'unpaid';

                    return (
                      <div
                        key={m.id}
                        className="mobile-notif-card"
                        onClick={() => openMemberLedgerModal(m)}
                      >
                        <div className="card-head">
                          <div>
                            <h4 className="notif-title">{m.name}</h4>
                            <span className="notif-date">
                              {house ? `House H-${house.house_number}` : 'N/A'}
                            </span>
                          </div>
                          <span className={`status-pill ${statusVal}`}>
                            {statusVal.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <div className="card-body">
                          <div className="card-info-row">
                            <span>Total Due: {formatCurrency(totalDueVal)}</span>
                            <span className={`balance-td ${balanceVal > 0 ? 'outstanding' : 'paid'}`}>
                              Balance: {formatCurrency(balanceVal)}
                            </span>
                          </div>
                        </div>

                        <div className="card-footer">
                          <span className="sub-id-tag">
                            {m.is_subscription_accountable !== false ? 'Accountable' : 'Non-Accountable'}
                          </span>
                          <button
                            className="mobile-action-btn edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMemberLedgerModal(m);
                            }}
                          >
                            <Eye size={14} />
                            <span>View Ledger</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 3: SUBSCRIPTION YEARS MANAGEMENT
      ════════════════════════════════════════════════ */}
      {activeTab === 'years' && (
        <div className="years-tab-content animate-fade-in">
          <div className="table-container-card glass-card">
            <div className="years-table-header">
              <div>
                <h4>Configured Subscription Years</h4>
                <p>Database-driven annual subscription rates and obligation triggers.</p>
              </div>
              <button className="add-btn primary-btn" onClick={openConfigureYearModal}>
                <Plus size={16} />
                <span>+ Create Subscription Year</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="subscriptions-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Annual Subscription Rate</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.id}>
                      <td className="bold-text">
                        <span className="year-badge">{y.year}</span>
                      </td>
                      <td className="bold-text text-primary">{formatCurrency(y.default_fee)}</td>
                      <td>
                        {y.start_date} to {y.end_date}
                      </td>
                      <td>
                        <span className={`status-pill ${y.status === 'active' ? 'paid' : 'unpaid'}`}>
                          {y.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="action-icon-btn edit"
                          onClick={() => handleGenerateLedger(y.id)}
                          title="Generate Subscription Ledger for this year"
                        >
                          <Sparkles size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER SUBSCRIPTION LEDGER RIGHT SIDE PANEL */}
      <SidePanel
        isOpen={Boolean(isLedgerModalOpen && ledgerMember)}
        onClose={() => setIsLedgerModalOpen(false)}
        title={ledgerMember ? `${ledgerMember.name} — Subscription Ledger` : ''}
        subtitle={
          ledgerMember && households.find((h) => h.id === ledgerMember.household_id)
            ? `House H-${households.find((h) => h.id === ledgerMember.household_id)?.house_number} (${households.find((h) => h.id === ledgerMember.household_id)?.house_owner_name})`
            : 'Registered Member'
        }
        icon={<UserCheck size={20} />}
        size="lg"
      >
        {ledgerMember && (
          <div className="flex-col gap-md">
            {/* ACCOUNTABILITY TOGGLE */}
            <div className="accountability-toggle-card">
              <div>
                <span className="toggle-title">Subscription Accountability</span>
                <p className="toggle-desc">
                  Is this member eligible to receive future annual subscription obligations?
                </p>
              </div>

              <div className="toggle-btn-group">
                <button
                  className={`accountable-btn ${
                    ledgerMember.is_subscription_accountable !== false ? 'active-on' : ''
                  }`}
                  onClick={() => handleToggleAccountability(ledgerMember, true)}
                >
                  ON (Accountable)
                </button>
                <button
                  className={`accountable-btn ${
                    ledgerMember.is_subscription_accountable === false ? 'active-off' : ''
                  }`}
                  onClick={() => handleToggleAccountability(ledgerMember, false)}
                >
                  OFF
                </button>
              </div>
            </div>

            {/* YEAR-BY-YEAR OBLIGATIONS BREAKDOWN */}
            <div className="drawer-section">
              <div className="drawer-section-head">
                <h5>Yearly Subscription History</h5>
              </div>

              <div className="table-responsive">
                <table className="mini-ledger-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Annual Rate</th>
                      <th>Previous Arrears</th>
                      <th>Total Due</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions
                      .filter((s) => s.member_id === ledgerMember.id)
                      .map((s) => {
                        const yObj = years.find((y) => y.id === s.subscription_year_id);
                        return (
                          <tr key={s.id}>
                            <td className="bold-text">{yObj?.year || 'N/A'}</td>
                            <td>{formatCurrency(s.annual_fee)}</td>
                            <td>{formatCurrency(s.previous_arrears)}</td>
                            <td className="bold-text">{formatCurrency(s.total_due)}</td>
                            <td className="text-success">{formatCurrency(s.total_paid)}</td>
                            <td className={`balance-td ${s.balance > 0 ? 'outstanding' : 'paid'}`}>
                              {formatCurrency(s.balance)}
                            </td>
                            <td>
                              <span className={`status-pill ${s.status}`}>
                                {s.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ARREAR ADJUSTMENTS AUDIT TRAIL */}
            <div className="drawer-section">
              <div className="drawer-section-head flex-between">
                <h5>Auditable Arrear Adjustments</h5>
                <button
                  className="add-btn secondary-btn compact-btn"
                  onClick={() => {
                    setArrearYearId(years[0]?.id || '');
                    setArrearAmount(0);
                    setArrearReason('');
                    setIsArrearModalOpen(true);
                  }}
                >
                  <Plus size={14} />
                  <span>+ Add Arrear Adjustment</span>
                </button>
              </div>

              <div className="arrears-history-list">
                {arrearsList.filter((a) => a.member_id === ledgerMember.id).length === 0 ? (
                  <div className="empty-small-text">No manual arrear adjustments logged.</div>
                ) : (
                  arrearsList
                    .filter((a) => a.member_id === ledgerMember.id)
                    .map((arr) => {
                      const yObj = years.find((y) => y.id === arr.subscription_year_id);
                      return (
                        <div key={arr.id} className="arrear-item-box">
                          <div>
                            <span className="arr-amount">+{formatCurrency(arr.amount)}</span>
                            <span className="arr-reason">{arr.reason}</span>
                          </div>
                          <span className="arr-date">
                            Year {yObj?.year} • {new Date(arr.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* LINKED PAYMENT TRANSACTIONS */}
            <div className="drawer-section">
              <div className="drawer-section-head">
                <h5>Payment History Receipts</h5>
              </div>

              <div className="arrears-history-list">
                {payments.filter((p) => p.member_id === ledgerMember.id).length === 0 ? (
                  <div className="empty-small-text">No payment receipts logged for this member yet.</div>
                ) : (
                  payments
                    .filter((p) => p.member_id === ledgerMember.id)
                    .map((pay) => (
                      <div key={pay.id} className="arrear-item-box payment-box">
                        <div>
                          <span className="arr-amount text-success">
                            ✓ {formatCurrency(pay.amount)} ({pay.payment_method.toUpperCase()})
                          </span>
                          <span className="arr-reason">
                            Ref: {pay.reference_number || 'N/A'} {pay.notes ? `• ${pay.notes}` : ''}
                          </span>
                        </div>
                        <span className="arr-date">{pay.payment_date}</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </SidePanel>

      {/* ════════════════════════════════════════════════
          MODAL: ADD ARREAR ADJUSTMENT
      ════════════════════════════════════════════════ */}
      {isArrearModalOpen && ledgerMember && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>Add Arrear Adjustment</h4>
                <p className="modal-subtitle">Log auditable prior arrears adjustment for {ledgerMember.name}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsArrearModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveArrearAdjustment} className="modal-form">
              <div className="form-group">
                <label>Target Subscription Year</label>
                <select value={arrearYearId} onChange={(e) => setArrearYearId(e.target.value)}>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      Year {y.year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Arrear Adjustment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 500"
                  value={arrearAmount || ''}
                  onChange={(e) => setArrearAmount(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Reason / Audit Note *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rollover unpaid dues from previous year"
                  value={arrearReason}
                  onChange={(e) => setArrearReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsArrearModalOpen(false)}
                  disabled={isSavingArrear}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn submit-pill-btn" disabled={isSavingArrear}>
                  {isSavingArrear ? 'Saving...' : 'Add Arrear Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: CONFIGURE SUBSCRIPTION YEAR
      ════════════════════════════════════════════════ */}
      {isYearModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>Configure Subscription Year</h4>
                <p className="modal-subtitle">Define annual rate once for database-driven obligations.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsYearModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveYear} className="modal-form">
              {yearError && (
                <div className="form-alert error">
                  <AlertCircle size={16} />
                  <span>{yearError}</span>
                </div>
              )}

              <div className="form-group">
                <label>Subscription Year *</label>
                <input
                  type="number"
                  required
                  min="2000"
                  max="2100"
                  value={yearVal}
                  onChange={(e) => setYearVal(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Annual Subscription Rate (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={defaultFee}
                  onChange={(e) => setDefaultFee(Number(e.target.value))}
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={yearStatus}
                  onChange={(e) => setYearStatus(e.target.value as any)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Draft / Closed</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsYearModalOpen(false)}
                  disabled={isSavingYear}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn submit-pill-btn" disabled={isSavingYear}>
                  {isSavingYear ? 'Configuring...' : 'Configure Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: GENERATION RESULT SUMMARY
      ════════════════════════════════════════════════ */}
      {genResult && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>Subscription Ledger Generated</h4>
                <p className="modal-subtitle">Summary of obligation trigger execution</p>
              </div>
              <button className="modal-close-btn" onClick={() => setGenResult(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="gen-result-body">
              <div className="gen-result-icon">
                <Sparkles size={32} color="#00966b" />
              </div>

              <div className="gen-stats-list">
                <div className="gen-stat-row">
                  <span>Target Year:</span>
                  <strong>{genResult.yearName}</strong>
                </div>
                <div className="gen-stat-row">
                  <span>Annual Rate:</span>
                  <strong>₹{genResult.fee}</strong>
                </div>
                <div className="gen-stat-row">
                  <span>Accountable Members:</span>
                  <strong>{genResult.accountableCount}</strong>
                </div>
                <div className="gen-stat-row text-success">
                  <span>New Records Created:</span>
                  <strong>{genResult.createdCount}</strong>
                </div>
                <div className="gen-stat-row text-muted">
                  <span>Already Existing:</span>
                  <strong>{genResult.existingCount}</strong>
                </div>
              </div>

              <button
                className="add-btn primary-btn full-width"
                onClick={() => setGenResult(null)}
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .subscriptions-page {
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

        .page-header-actions {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; width: 100%; box-sizing: border-box;
        }
        .page-header-actions h3 { font-size: 22px; font-weight: 800; color: #111827; }
        .page-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

        .header-cta-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

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
        .add-btn.secondary-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 18px; border-radius: var(--radius-pill); background: #ffffff;
          color: #374151; font-weight: 700; font-size: 13.5px; border: 1px solid var(--border-color); cursor: pointer;
        }

        /* PRIMARY TABS */
        .subscription-nav-tabs {
          display: flex; gap: 8px; background: #ffffff; padding: 6px;
          border-radius: var(--radius-pill); border: 1px solid var(--border-color);
          width: fit-content; flex-wrap: wrap;
        }
        .tab-pill-btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 18px;
          border-radius: var(--radius-pill); border: none; background: transparent;
          color: #4b5563; font-weight: 700; font-size: 13px; cursor: pointer; transition: var(--transition-all);
        }
        .tab-pill-btn.active {
          background: #ecfdf5; color: #00966b; box-shadow: 0 2px 8px rgba(0, 150, 107, 0.15);
        }

        /* STATS DASHBOARD GRID */
        .stats-dashboard-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;
        }
        .stat-metric-card {
          background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl);
          padding: 20px; display: flex; align-items: center; gap: 16px;
        }
        .metric-icon-box {
          width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .metric-icon-box.emerald { background: #ecfdf5; color: #00966b; }
        .metric-icon-box.green { background: #d1fae5; color: #059669; }
        .metric-icon-box.amber { background: #fef3c7; color: #d97706; }
        .metric-icon-box.primary { background: #e0e7ff; color: #4338ca; }
        .metric-icon-box.teal { background: #ccfbf1; color: #0d9488; }
        .metric-icon-box.red { background: #fee2e2; color: #dc2626; }

        .metric-info { display: flex; flex-direction: column; gap: 2px; }
        .metric-label { font-size: 11.5px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-value { font-size: 22px; font-weight: 800; color: #111827; }
        .metric-sub { font-size: 11px; color: #9ca3af; }

        .text-success { color: #059669 !important; }
        .text-warning { color: #d97706 !important; }
        .text-danger { color: #dc2626 !important; }
        .text-primary { color: #00966b !important; }

        /* OVERVIEW SUMMARY CARD */
        .overview-summary-card {
          background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 24px;
        }
        .overview-summary-card .card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .overview-summary-card h4 { font-size: 17px; font-weight: 800; color: #111827; }
        .overview-summary-card p { font-size: 12.5px; color: #6b7280; }
        .year-fee-tag { background: #ecfdf5; color: #00966b; font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: var(--radius-pill); }

        .progress-bar-container { display: flex; flex-direction: column; gap: 8px; }
        .progress-labels { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; color: #374151; }
        .progress-track { width: 100%; height: 12px; background: #e5e7eb; border-radius: var(--radius-pill); overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #00966b 0%, #10b981 100%); border-radius: var(--radius-pill); transition: width 0.5s ease; }

        /* FILTER BAR & TABLES */
        .filter-bar {
          display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 14px;
          background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl); flex-wrap: wrap; margin-bottom: 16px;
        }
        .search-box { position: relative; display: flex; align-items: center; flex: 1; min-width: 260px; }
        .search-icon { position: absolute; left: 14px; color: #9ca3af; }
        .search-box input {
          width: 100%; padding: 11px 36px 11px 42px; border: 1px solid var(--border-color);
          border-radius: var(--radius-pill); background: #f9fafb; color: #111827; font-size: 13.5px;
        }
        .clear-search-btn { position: absolute; right: 12px; background: #e5e7eb; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .filter-selectors-grid { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .filter-select-wrapper { position: relative; display: flex; align-items: center; }
        .select-icon { position: absolute; left: 14px; color: #9ca3af; pointer-events: none; }
        .filter-select-wrapper select {
          padding: 10px 32px 10px 36px; border: 1px solid var(--border-color); border-radius: var(--radius-pill);
          background: #f9fafb; color: #374151; appearance: none; cursor: pointer; font-weight: 600; font-size: 13px;
        }
        .clear-filters-link { background: transparent; border: none; color: var(--primary); font-weight: 700; font-size: 13px; cursor: pointer; padding: 6px 12px; }

        .table-container-card { background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 20px; width: 100%; box-sizing: border-box; }
        .desktop-view-only { display: block; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .subscriptions-table { width: 100%; border-collapse: collapse; text-align: left; }
        .subscriptions-table th { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .subscriptions-table td { padding: 14px 16px; font-size: 13.5px; border-bottom: 1px solid #f3f4f6; color: #111827; }
        .sub-row { cursor: pointer; transition: var(--transition-all); }
        .sub-row:hover { background-color: #f9fafb; }
        .name-cell { display: flex; flex-direction: column; gap: 2px; }
        .opted-out-badge { font-size: 10px; font-weight: 700; color: #dc2626; background: #fee2e2; padding: 2px 6px; border-radius: 4px; width: fit-content; }

        .status-pill {
          display: inline-block; font-size: 10.5px; font-weight: 800; padding: 4px 10px; border-radius: var(--radius-pill); text-transform: uppercase;
        }
        .status-pill.paid { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .status-pill.partially_paid { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .status-pill.unpaid { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .balance-td.outstanding { color: #dc2626; font-weight: 800; }
        .balance-td.paid { color: #059669; font-weight: 800; }

        /* MOBILE CARDS */
        .mobile-cards-directory { display: none; flex-direction: column; gap: 14px; width: 100%; box-sizing: border-box; }
        .mobile-notif-card { background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; cursor: pointer; width: 100%; box-sizing: border-box; }
        .notif-title { font-size: 15px; font-weight: 800; color: #111827; }
        .notif-date { font-size: 11.5px; color: #6b7280; }
        .card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #f3f4f6; }
        .sub-id-tag { font-size: 11px; color: #9ca3af; }
        .mobile-action-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: var(--radius-pill); border: 1px solid var(--border-color); font-size: 12px; font-weight: 700; cursor: pointer; }
        .mobile-action-btn.edit { background: #ecfdf5; color: #00966b; border-color: #a7f3d0; }

        /* LEDGER DRAWER MODAL */
        .ledger-drawer-card { max-width: 720px; max-height: 85vh; display: flex; flex-direction: column; }
        .modal-body-scrollable { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }

        .accountability-toggle-card {
          background: #f9fafb; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px;
          display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
        }
        .toggle-title { font-size: 14px; font-weight: 800; color: #111827; }
        .toggle-desc { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .toggle-btn-group { display: flex; gap: 6px; }
        .accountable-btn {
          padding: 8px 14px; border-radius: var(--radius-pill); border: 1px solid var(--border-color); background: #ffffff; font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .accountable-btn.active-on { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
        .accountable-btn.active-off { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }

        .drawer-section { display: flex; flex-direction: column; gap: 10px; }
        .drawer-section-head h5 { font-size: 13px; font-weight: 800; color: #00966b; text-transform: uppercase; letter-spacing: 0.05em; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; }
        .compact-btn { padding: 6px 12px; font-size: 12px; }

        .mini-ledger-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .mini-ledger-table th { background: #f9fafb; padding: 10px; text-transform: uppercase; font-size: 10.5px; font-weight: 800; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
        .mini-ledger-table td { padding: 10px; border-bottom: 1px solid #f3f4f6; }

        .arrears-history-list { display: flex; flex-direction: column; gap: 8px; }
        .arrear-item-box { background: #f9fafb; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; display: flex; justify-content: space-between; align-items: center; }
        .arrear-item-box.payment-box { background: #ecfdf5; border-color: #a7f3d0; }
        .arr-amount { font-size: 13.5px; font-weight: 800; color: #111827; margin-right: 8px; }
        .arr-reason { font-size: 12px; color: #6b7280; }
        .arr-date { font-size: 11px; color: #9ca3af; }
        .empty-small-text { font-size: 12px; color: #9ca3af; font-style: italic; }

        /* MODALS & OVERLAYS */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; overflow-y: auto; }
        .modal-dialog-card { width: 100%; max-width: min(540px, calc(100vw - 32px)) !important; background: #ffffff; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; border: 1px solid #e2e8f0; box-sizing: border-box; margin: auto; }
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
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e5e7eb; }
        .btn-cancel { background: #f3f4f6; border: 1px solid var(--border-color); color: #374151; padding: 10px 18px; border-radius: var(--radius-pill); font-weight: 700; cursor: pointer; }
        .submit-pill-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: var(--radius-pill); background: var(--primary); color: #ffffff; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35); }

        .gen-result-body { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
        .gen-result-icon { width: 64px; height: 64px; background: #ecfdf5; border-radius: 20px; display: flex; align-items: center; justify-content: center; }
        .gen-stats-list { width: 100%; background: #f9fafb; border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 13.5px; border: 1px solid #f3f4f6; }
        .gen-stat-row { display: flex; justify-content: space-between; }
        .full-width { width: 100%; justify-content: center; }

        .empty-state-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 20px; width: 100%; box-sizing: border-box; }
        .empty-state-icon { width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .empty-state-icon.neutral { background: #f3f4f6; color: #6b7280; }
        .empty-state-card h4 { font-size: 18px; font-weight: 800; color: #111827; }
        .empty-state-card p { font-size: 13px; color: #6b7280; margin-top: 4px; max-width: 320px; }

        .years-table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .years-table-header h4 { font-size: 17px; font-weight: 800; color: #111827; }
        .years-table-header p { font-size: 12.5px; color: #6b7280; }
        .year-badge { background: #ecfdf5; color: #00966b; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: var(--radius-pill); border: 1px solid #a7f3d0; }

        /* RESPONSIVE */
        @media (max-width: 991px) {
          .stats-dashboard-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .page-header-actions { flex-direction: column; align-items: stretch; gap: 12px; }
          .header-cta-group { flex-direction: column; align-items: stretch; }
          .year-selector-pill { justify-content: space-between; }
          .filter-selectors-grid { grid-template-columns: 1fr; width: 100%; }
          .filter-select-wrapper select { width: 100%; }
        }
        @media (max-width: 640px) {
          .desktop-view-only { display: none; }
          .mobile-cards-directory { display: flex; }
          .stats-dashboard-grid { grid-template-columns: 1fr; }
          .modal-overlay { padding: 0; align-items: flex-end; }
          .modal-dialog-card { border-radius: 20px 20px 0 0; max-height: 90vh; }
        }
      `}</style>
    </div>
  );
};

export default Subscriptions;
