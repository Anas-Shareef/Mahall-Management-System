import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { 
  Household, Member, MemberSubscription, SubscriptionYear, Payment 
} from '../../services/db';
import { 
  Download, Search, Filter, Calendar, Users, Home, 
  CreditCard, AlertCircle, CheckCircle, X, 
  Sparkles, Loader2, Layers 
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { t } = useTranslation();

  // Data States
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector & Sub-Tab States ('collection' | 'household' | 'member' | 'payments' | 'arrears')
  const [selectedYearId, setSelectedYearId] = useState('');
  const [activeTab, setActiveTab] = useState<'collection' | 'household' | 'member' | 'payments' | 'arrears'>('collection');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Report Generator Modal State
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genReportType, setGenReportType] = useState<'collection' | 'household' | 'member' | 'payments' | 'arrears'>('collection');
  const [genYearId, setGenYearId] = useState('');
  const [genStartDate, setGenStartDate] = useState('');
  const [genEndDate, setGenEndDate] = useState('');
  const [genStatus, setGenStatus] = useState('');

  // Selected Detail Modal State
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [houseList, memberList, yearList, subList, payList] = await Promise.all([
        db.households.get(),
        db.members.get(),
        db.years.get(),
        db.subscriptions.get(),
        db.payments.get(),
      ]);
      setHouseholds(houseList);
      setMembers(memberList);
      setYears(yearList);
      setSubscriptions(subList);
      setPayments(payList);

      if (yearList.length > 0 && !selectedYearId) {
        const activeYr = yearList.find((y) => y.status === 'active') || yearList[0];
        setSelectedYearId(activeYr.id);
        setGenYearId(activeYr.id);
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
      showToast('error', 'Unable to load report datasets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedYearObj = useMemo(() => {
    return years.find((y) => y.id === selectedYearId) || years[0] || null;
  }, [years, selectedYearId]);

  const currentYearVal = selectedYearObj ? selectedYearObj.year : new Date().getFullYear();

  // DYNAMIC TOP SUMMARY METRICS
  const topMetrics = useMemo(() => {
    const activeMembers = members.filter((m) => m.status === 'active');
    const activeHouses = households.filter((h) => h.status === 'active');

    const yearSubs = subscriptions.filter((s) => s.subscription_year_id === selectedYearId);
    const totalExpected = yearSubs.reduce((sum, s) => sum + s.total_due, 0);
    const totalCollected = yearSubs.reduce((sum, s) => sum + s.total_paid, 0);
    const totalOutstanding = yearSubs.reduce((sum, s) => sum + s.balance, 0);

    return {
      totalMembers: activeMembers.length,
      totalHouseholds: activeHouses.length,
      totalExpected,
      totalCollected,
      totalOutstanding,
    };
  }, [members, households, subscriptions, selectedYearId]);

  // 1. COLLECTION & FINANCIAL REPORT DATA
  const collectionReportStats = useMemo(() => {
    if (!selectedYearId) return { expected: 0, collected: 0, pending: 0, arrears: 0 };
    const yearSubs = subscriptions.filter((s) => s.subscription_year_id === selectedYearId);

    return {
      expected: yearSubs.reduce((sum, s) => sum + s.total_due, 0),
      collected: yearSubs.reduce((sum, s) => sum + s.total_paid, 0),
      pending: yearSubs.reduce((sum, s) => sum + s.balance, 0),
      arrears: yearSubs.reduce((sum, s) => sum + s.previous_arrears, 0),
    };
  }, [subscriptions, selectedYearId]);

  // 2. HOUSEHOLD REPORT ROWS
  const householdReportRows = useMemo(() => {
    return households
      .map((h) => {
        const houseMembers = members.filter((m) => m.household_id === h.id);
        let totalDue = 0;
        let totalPaid = 0;
        let balance = 0;

        houseMembers.forEach((member) => {
          const sub = subscriptions.find(
            (s) => s.member_id === member.id && s.subscription_year_id === selectedYearId
          );
          if (sub) {
            totalDue += sub.total_due;
            totalPaid += sub.total_paid;
            balance += sub.balance;
          }
        });

        return {
          id: h.id,
          houseNumber: h.house_number,
          ownerName: h.house_owner_name,
          ownerPhone: h.house_owner_phone || 'N/A',
          area: h.area || 'Main Area',
          membersCount: houseMembers.length,
          totalDue,
          totalPaid,
          balance,
        };
      })
      .filter((r) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          !q ||
          r.ownerName.toLowerCase().includes(q) ||
          r.houseNumber.includes(q) ||
          r.area.toLowerCase().includes(q)
        );
      });
  }, [households, members, subscriptions, selectedYearId, searchQuery]);

  // 3. MEMBER REPORT ROWS
  const memberReportRows = useMemo(() => {
    return members
      .map((m) => {
        const house = households.find((h) => h.id === m.household_id);
        const sub = subscriptions.find(
          (s) => s.member_id === m.id && s.subscription_year_id === selectedYearId
        );

        return {
          id: m.id,
          memberName: m.name,
          houseNumber: house ? house.house_number : 'N/A',
          houseOwner: house ? house.house_owner_name : 'N/A',
          relationship: m.relationship,
          phone: m.phone || 'N/A',
          accountable: m.is_subscription_accountable !== false,
          totalDue: sub ? sub.total_due : 0,
          totalPaid: sub ? sub.total_paid : 0,
          balance: sub ? sub.balance : 0,
          status: sub ? sub.status : 'unpaid',
        };
      })
      .filter((r) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          r.memberName.toLowerCase().includes(q) ||
          r.houseNumber.includes(q) ||
          r.phone.includes(q);

        const matchesStatus = selectedStatus ? r.status === selectedStatus : true;

        return matchesSearch && matchesStatus;
      });
  }, [members, households, subscriptions, selectedYearId, searchQuery, selectedStatus]);

  // 4. PAYMENTS HISTORY REPORT ROWS
  const paymentReportRows = useMemo(() => {
    return payments
      .map((p) => {
        const m = members.find((mem) => mem.id === p.member_id);
        const house = m ? households.find((h) => h.id === m.household_id) : null;

        return {
          id: p.id,
          memberName: m ? m.name : 'Unknown Member',
          houseNumber: house ? house.house_number : 'N/A',
          amount: p.amount,
          paymentMethod: p.payment_method,
          paymentDate: p.payment_date,
          referenceNumber: p.reference_number || 'N/A',
          notes: p.notes || 'N/A',
        };
      })
      .filter((r) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          !q ||
          r.memberName.toLowerCase().includes(q) ||
          r.houseNumber.includes(q) ||
          r.referenceNumber.toLowerCase().includes(q) ||
          r.paymentMethod.toLowerCase().includes(q)
        );
      });
  }, [payments, members, households, searchQuery]);

  // 5. ARREARS REPORT ROWS
  const arrearsReportRows = useMemo(() => {
    return subscriptions
      .filter(
        (sub) =>
          sub.subscription_year_id === selectedYearId && (sub.previous_arrears > 0 || sub.balance > 0)
      )
      .map((sub) => {
        const mem = members.find((m) => m.id === sub.member_id);
        const house = mem ? households.find((h) => h.id === mem.household_id) : null;

        return {
          id: sub.id,
          memberName: mem ? mem.name : 'Unknown Member',
          houseNumber: house ? house.house_number : 'N/A',
          year: currentYearVal,
          annualFee: sub.annual_fee,
          previousArrears: sub.previous_arrears,
          currentBalance: sub.balance,
          totalOutstanding: sub.balance,
        };
      })
      .filter((r) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          !q ||
          r.memberName.toLowerCase().includes(q) ||
          r.houseNumber.includes(q)
        );
      });
  }, [subscriptions, selectedYearId, members, households, currentYearVal, searchQuery]);

  // DYNAMIC CSV EXPORTER
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = `Mahallu_${activeTab.toUpperCase()}_Report_${currentYearVal}.csv`;

    if (activeTab === 'collection') {
      headers = ['Metric Summary', 'Amount (INR)'];
      rows = [
        ['Target Subscription Year', currentYearVal],
        ['Total Expected Annual Dues', collectionReportStats.expected],
        ['Total Collections Received', collectionReportStats.collected],
        ['Total Pending Dues', collectionReportStats.pending],
        ['Rollover Previous Arrears', collectionReportStats.arrears],
      ];
    } else if (activeTab === 'household') {
      headers = ['House Number', 'House Owner Name', 'Contact Phone', 'Area', 'Active Members', 'Total Due (INR)', 'Total Paid (INR)', 'Balance (INR)'];
      rows = householdReportRows.map((h) => [
        h.houseNumber,
        h.ownerName,
        h.ownerPhone,
        h.area,
        h.membersCount,
        h.totalDue,
        h.totalPaid,
        h.balance,
      ]);
    } else if (activeTab === 'member') {
      headers = ['Member Name', 'House Number', 'Relationship', 'Phone', 'Accountability', 'Total Due (INR)', 'Total Paid (INR)', 'Balance (INR)', 'Status'];
      rows = memberReportRows.map((m) => [
        m.memberName,
        m.houseNumber,
        m.relationship,
        m.phone,
        m.accountable ? 'Accountable (ON)' : 'Non-Accountable (OFF)',
        m.totalDue,
        m.totalPaid,
        m.balance,
        m.status,
      ]);
    } else if (activeTab === 'payments') {
      headers = ['Payment ID', 'Member Name', 'House Number', 'Amount (INR)', 'Method', 'Payment Date', 'Reference No.', 'Notes'];
      rows = paymentReportRows.map((p) => [
        p.id,
        p.memberName,
        p.houseNumber,
        p.amount,
        p.paymentMethod,
        p.paymentDate,
        p.referenceNumber,
        p.notes,
      ]);
    } else if (activeTab === 'arrears') {
      headers = ['Member Name', 'House Number', 'Year', 'Annual Fee (INR)', 'Previous Arrears (INR)', 'Current Outstanding (INR)'];
      rows = arrearsReportRows.map((a) => [
        a.memberName,
        a.houseNumber,
        a.year,
        a.annualFee,
        a.previousArrears,
        a.totalOutstanding,
      ]);
    }

    if (rows.length === 0) {
      showToast('error', 'No report records available to export.');
      return;
    }

    setIsExporting(true);

    setTimeout(() => {
      try {
        const csvContent =
          'data:text/csv;charset=utf-8,' +
          [
            headers.join(','),
            ...rows.map((r) => r.map((x: any) => `"${String(x).replace(/"/g, '""')}"`).join(',')),
          ].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('success', `✓ ${filename} exported successfully!`);
      } catch (err) {
        showToast('error', 'Failed to generate CSV export.');
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  // OPEN REPORT GENERATOR MODAL
  const openReportGeneratorModal = () => {
    setGenReportType(activeTab);
    setGenYearId(selectedYearId || (years[0]?.id || ''));
    setIsGenModalOpen(true);
  };

  // HANDLE GENERATE REPORT SUBMIT
  const handleApplyReportGen = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTab(genReportType);
    if (genYearId) setSelectedYearId(genYearId);
    if (genStatus) setSelectedStatus(genStatus);
    setIsGenModalOpen(false);
    showToast('success', '✓ Custom report criteria applied successfully.');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="reports-page animate-fade-in">
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
          <h3>{t('reports.reportsTitle')}</h3>
          <p className="page-subtitle">Consolidated financial analytics, member ledgers, payment logs & arrears reports.</p>
        </div>

        <div className="header-cta-group">
          <div className="year-selector-pill">
            <Calendar size={15} className="calendar-icon" />
            <span>Target Year:</span>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="year-dropdown-select"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year} (₹{y.default_fee})
                </option>
              ))}
            </select>
          </div>

          <button className="add-btn secondary-btn" onClick={openReportGeneratorModal}>
            <Sparkles size={15} />
            <span>Generate Custom Report</span>
          </button>

          <button
            className="add-btn primary-btn"
            onClick={handleExportCSV}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="spinner-icon" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Export CSV Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* TOP DYNAMIC KPI SUMMARY CARDS */}
      <div className="reports-kpi-grid">
        <div className="kpi-card glass-card">
          <div className="kpi-icon-box emerald">
            <Users size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Members</span>
            <h3 className="kpi-val">{topMetrics.totalMembers}</h3>
            <span className="kpi-sub">Registered in Mahallu</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box blue">
            <Home size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Registered Households</span>
            <h3 className="kpi-val">{topMetrics.totalHouseholds}</h3>
            <span className="kpi-sub">Active house units</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box green">
            <CreditCard size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Collections</span>
            <h3 className="kpi-val text-success">{formatCurrency(topMetrics.totalCollected)}</h3>
            <span className="kpi-sub">Year {currentYearVal} payments</span>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon-box red">
            <AlertCircle size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Outstanding</span>
            <h3 className="kpi-val text-danger">{formatCurrency(topMetrics.totalOutstanding)}</h3>
            <span className="kpi-sub">Uncollected dues + arrears</span>
          </div>
        </div>
      </div>

      {/* CATEGORIZED SUB-TABS */}
      <div className="reports-nav-tabs">
        <button
          className={`tab-pill-btn ${activeTab === 'collection' ? 'active' : ''}`}
          onClick={() => { setActiveTab('collection'); setSearchQuery(''); }}
        >
          <Layers size={15} />
          <span>Collection & Financial</span>
        </button>

        <button
          className={`tab-pill-btn ${activeTab === 'household' ? 'active' : ''}`}
          onClick={() => { setActiveTab('household'); setSearchQuery(''); }}
        >
          <Home size={15} />
          <span>Household Summary</span>
        </button>

        <button
          className={`tab-pill-btn ${activeTab === 'member' ? 'active' : ''}`}
          onClick={() => { setActiveTab('member'); setSearchQuery(''); }}
        >
          <Users size={15} />
          <span>Member Registry</span>
        </button>

        <button
          className={`tab-pill-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
        >
          <CreditCard size={15} />
          <span>Payment Receipts</span>
        </button>

        <button
          className={`tab-pill-btn ${activeTab === 'arrears' ? 'active' : ''}`}
          onClick={() => { setActiveTab('arrears'); setSearchQuery(''); }}
        >
          <AlertCircle size={15} />
          <span>Arrears Audit</span>
        </button>
      </div>

      {/* SEARCH AND FILTER TOOLBAR (VISIBLE FOR DETAILED TABLES) */}
      {activeTab !== 'collection' && (
        <div className="filter-bar glass-card">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search report rows by name, house number, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {activeTab === 'member' && (
            <div className="filter-select-wrapper">
              <Filter size={15} className="select-icon" />
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">Status: All</option>
                <option value="paid">{t('subscription.paid')}</option>
                <option value="partially_paid">{t('subscription.partiallyPaid')}</option>
                <option value="unpaid">{t('subscription.unpaid')}</option>
              </select>
            </div>
          )}

          {(searchQuery || selectedStatus) && (
            <button
              className="clear-filters-link"
              onClick={() => { setSearchQuery(''); setSelectedStatus(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* MAIN REPORT VIEW WORKSPACE */}
      <div className="table-container-card glass-card">
        {loading ? (
          <div className="skeleton-loading-container">
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
          </div>
        ) : (
          <div className="report-content-body animate-fade-in">

            {/* 1. COLLECTION & FINANCIAL SUMMARY */}
            {activeTab === 'collection' && (
              <div className="collection-report-view">
                <div className="collection-report-header">
                  <h4>Consolidated Financial Collection Report — {currentYearVal}</h4>
                  <p>Aggregated statistics of Mahallu subscription obligations and recorded receipts.</p>
                </div>

                {/* PROGRESS TARGET TRACKER */}
                <div className="progress-bar-container margin-bottom">
                  <div className="progress-labels">
                    <span>Total Collected: {formatCurrency(collectionReportStats.collected)}</span>
                    <span>
                      {collectionReportStats.expected > 0
                        ? Math.round((collectionReportStats.collected / collectionReportStats.expected) * 100)
                        : 0}
                      % Target Achieved
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          collectionReportStats.expected > 0
                            ? Math.min(100, (collectionReportStats.collected / collectionReportStats.expected) * 100)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="report-stats-grid">
                  <div className="report-stat-card">
                    <span className="stat-label">Total Expected Dues</span>
                    <h3 className="primary-color-text">{formatCurrency(collectionReportStats.expected)}</h3>
                    <span className="stat-sub font-xs">Annual fee + previous arrears</span>
                  </div>

                  <div className="report-stat-card">
                    <span className="stat-label">Total Collections</span>
                    <h3 className="success-color-text">{formatCurrency(collectionReportStats.collected)}</h3>
                    <span className="stat-sub font-xs">Actual payments received</span>
                  </div>

                  <div className="report-stat-card">
                    <span className="stat-label">Pending Dues Balance</span>
                    <h3 className="warning-color-text">{formatCurrency(collectionReportStats.pending)}</h3>
                    <span className="stat-sub font-xs">Remaining uncollected balance</span>
                  </div>

                  <div className="report-stat-card">
                    <span className="stat-label">Rollover Arrears</span>
                    <h3 className="error-color-text">{formatCurrency(collectionReportStats.arrears)}</h3>
                    <span className="stat-sub font-xs">Prior years unpaid dues</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. HOUSEHOLD SUMMARY REPORT */}
            {activeTab === 'household' && (
              <>
                <div className="table-responsive desktop-view-only">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>House Number</th>
                        <th>Head of Household</th>
                        <th>Contact Phone</th>
                        <th>Area</th>
                        <th>Active Members</th>
                        <th>Total Due</th>
                        <th>Total Paid</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {householdReportRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="no-data-cell">No matching household records found.</td>
                        </tr>
                      ) : (
                        householdReportRows.map((h) => (
                          <tr key={h.id} className="notif-row" onClick={() => setSelectedRowDetail(h)}>
                            <td className="bold-text">House H-{h.houseNumber}</td>
                            <td>{h.ownerName}</td>
                            <td>{h.ownerPhone}</td>
                            <td>{h.area}</td>
                            <td>{h.membersCount} Members</td>
                            <td className="bold-text">{formatCurrency(h.totalDue)}</td>
                            <td className="text-success">{formatCurrency(h.totalPaid)}</td>
                            <td className={`balance-td ${h.balance > 0 ? 'outstanding' : 'paid'}`}>
                              {formatCurrency(h.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS FOR HOUSEHOLDS */}
                <div className="mobile-cards-directory">
                  {householdReportRows.map((h) => (
                    <div key={h.id} className="mobile-notif-card" onClick={() => setSelectedRowDetail(h)}>
                      <div className="card-head">
                        <div>
                          <h4 className="notif-title">House H-{h.houseNumber}</h4>
                          <span className="notif-date">{h.ownerName} ({h.membersCount} Members)</span>
                        </div>
                        <span className={`balance-td ${h.balance > 0 ? 'outstanding' : 'paid'}`}>
                          {formatCurrency(h.balance)}
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="card-info-row">
                          <span>Total Due: {formatCurrency(h.totalDue)}</span>
                          <span>Paid: {formatCurrency(h.totalPaid)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 3. MEMBER REGISTRY REPORT */}
            {activeTab === 'member' && (
              <>
                <div className="table-responsive desktop-view-only">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Member Name</th>
                        <th>Household</th>
                        <th>Relationship</th>
                        <th>Accountability</th>
                        <th>Total Due</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberReportRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="no-data-cell">No matching member records found.</td>
                        </tr>
                      ) : (
                        memberReportRows.map((m) => (
                          <tr key={m.id} className="notif-row" onClick={() => setSelectedRowDetail(m)}>
                            <td className="bold-text">{m.memberName}</td>
                            <td>House H-{m.houseNumber}</td>
                            <td>{m.relationship}</td>
                            <td>
                              <span className={`opt-tag ${m.accountable ? 'on' : 'off'}`}>
                                {m.accountable ? 'Accountable (ON)' : 'OFF'}
                              </span>
                            </td>
                            <td>{formatCurrency(m.totalDue)}</td>
                            <td className="text-success">{formatCurrency(m.totalPaid)}</td>
                            <td className={`balance-td ${m.balance > 0 ? 'outstanding' : 'paid'}`}>
                              {formatCurrency(m.balance)}
                            </td>
                            <td>
                              <span className={`status-pill ${m.status}`}>
                                {m.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS FOR MEMBERS */}
                <div className="mobile-cards-directory">
                  {memberReportRows.map((m) => (
                    <div key={m.id} className="mobile-notif-card" onClick={() => setSelectedRowDetail(m)}>
                      <div className="card-head">
                        <div>
                          <h4 className="notif-title">{m.memberName}</h4>
                          <span className="notif-date">House H-{m.houseNumber} • {m.relationship}</span>
                        </div>
                        <span className={`status-pill ${m.status}`}>
                          {m.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="card-info-row">
                          <span>Total Due: {formatCurrency(m.totalDue)}</span>
                          <span className={`balance-td ${m.balance > 0 ? 'outstanding' : 'paid'}`}>
                            Balance: {formatCurrency(m.balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 4. PAYMENT RECEIPTS REPORT */}
            {activeTab === 'payments' && (
              <>
                <div className="table-responsive desktop-view-only">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Receipt ID</th>
                        <th>Member Name</th>
                        <th>Household</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Payment Date</th>
                        <th>Reference No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentReportRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="no-data-cell">No payment receipts logged yet.</td>
                        </tr>
                      ) : (
                        paymentReportRows.map((p) => (
                          <tr key={p.id} className="notif-row" onClick={() => setSelectedRowDetail(p)}>
                            <td className="sub-id-tag">REC-{p.id.slice(0, 8)}</td>
                            <td className="bold-text">{p.memberName}</td>
                            <td>House H-{p.houseNumber}</td>
                            <td className="bold-text text-success">{formatCurrency(p.amount)}</td>
                            <td>
                              <span className="type-pill">
                                {p.paymentMethod.toUpperCase()}
                              </span>
                            </td>
                            <td>{p.paymentDate}</td>
                            <td>{p.referenceNumber}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS FOR PAYMENTS */}
                <div className="mobile-cards-directory">
                  {paymentReportRows.map((p) => (
                    <div key={p.id} className="mobile-notif-card" onClick={() => setSelectedRowDetail(p)}>
                      <div className="card-head">
                        <div>
                          <h4 className="notif-title">{p.memberName}</h4>
                          <span className="notif-date">House H-{p.houseNumber} • {p.paymentDate}</span>
                        </div>
                        <span className="bold-text text-success">{formatCurrency(p.amount)}</span>
                      </div>
                      <div className="card-body">
                        <p className="card-msg">Method: {p.paymentMethod.toUpperCase()} • Ref: {p.referenceNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 5. ARREARS AUDIT REPORT */}
            {activeTab === 'arrears' && (
              <>
                <div className="table-responsive desktop-view-only">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Member Name</th>
                        <th>Household</th>
                        <th>Year</th>
                        <th>Annual Rate</th>
                        <th>Previous Arrears</th>
                        <th>Current Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrearsReportRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="no-data-cell">No outstanding arrears records found.</td>
                        </tr>
                      ) : (
                        arrearsReportRows.map((a) => (
                          <tr key={a.id} className="notif-row" onClick={() => setSelectedRowDetail(a)}>
                            <td className="bold-text">{a.memberName}</td>
                            <td>House H-{a.houseNumber}</td>
                            <td>{a.year}</td>
                            <td>{formatCurrency(a.annualFee)}</td>
                            <td>{formatCurrency(a.previousArrears)}</td>
                            <td className="balance-td outstanding">{formatCurrency(a.totalOutstanding)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS FOR ARREARS */}
                <div className="mobile-cards-directory">
                  {arrearsReportRows.map((a) => (
                    <div key={a.id} className="mobile-notif-card" onClick={() => setSelectedRowDetail(a)}>
                      <div className="card-head">
                        <div>
                          <h4 className="notif-title">{a.memberName}</h4>
                          <span className="notif-date">House H-{a.houseNumber} • Year {a.year}</span>
                        </div>
                        <span className="balance-td outstanding">{formatCurrency(a.totalOutstanding)}</span>
                      </div>
                      <div className="card-body">
                        <div className="card-info-row">
                          <span>Annual Rate: {formatCurrency(a.annualFee)}</span>
                          <span>Prior Arrears: {formatCurrency(a.previousArrears)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          MODAL: REPORT GENERATOR / CUSTOM FILTER
      ════════════════════════════════════════════════ */}
      {isGenModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>Generate Custom Report</h4>
                <p className="modal-subtitle">Filter report datasets by type, subscription year, and status.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsGenModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyReportGen} className="modal-form">
              <div className="form-group">
                <label>Report Type *</label>
                <select
                  value={genReportType}
                  onChange={(e) => setGenReportType(e.target.value as any)}
                >
                  <option value="collection">Collection & Financial Report</option>
                  <option value="household">Household Summary Report</option>
                  <option value="member">Member Registry Report</option>
                  <option value="payments">Payment Receipts History</option>
                  <option value="arrears">Arrears & Outstanding Dues</option>
                </select>
              </div>

              <div className="form-group">
                <label>Subscription Year *</label>
                <select value={genYearId} onChange={(e) => setGenYearId(e.target.value)}>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      Year {y.year} (Annual Rate: ₹{y.default_fee})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Start Date (Optional)</label>
                  <input
                    type="date"
                    value={genStartDate}
                    onChange={(e) => setGenStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date (Optional)</label>
                  <input
                    type="date"
                    value={genEndDate}
                    onChange={(e) => setGenEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Status</label>
                <select value={genStatus} onChange={(e) => setGenStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="paid">{t('subscription.paid')}</option>
                  <option value="partially_paid">{t('subscription.partiallyPaid')}</option>
                  <option value="unpaid">{t('subscription.unpaid')}</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsGenModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn submit-pill-btn">
                  <Sparkles size={16} />
                  <span>Generate Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: ROW DETAIL SUMMARY PANEL
      ════════════════════════════════════════════════ */}
      {selectedRowDetail && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>Report Row Detail Breakdown</h4>
                <p className="modal-subtitle">Comprehensive metrics for selected record</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedRowDetail(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-form">
              <div className="details-meta-section">
                {Object.entries(selectedRowDetail).map(([key, val]) => (
                  <div key={key} className="meta-item">
                    <span className="meta-label">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="meta-value bold-text">
                      {typeof val === 'number' && key.toLowerCase().includes('due') || key.toLowerCase().includes('paid') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('arrears')
                        ? formatCurrency(val as number)
                        : String(val)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setSelectedRowDetail(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .reports-page {
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

        /* KPI GRID */
        .reports-kpi-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
        }
        .kpi-card {
          background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl);
          padding: 18px; display: flex; align-items: center; gap: 14px;
        }
        .kpi-icon-box {
          width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .kpi-icon-box.emerald { background: #ecfdf5; color: #00966b; }
        .kpi-icon-box.blue { background: #eff6ff; color: #2563eb; }
        .kpi-icon-box.green { background: #d1fae5; color: #059669; }
        .kpi-icon-box.red { background: #fee2e2; color: #dc2626; }

        .kpi-info { display: flex; flex-direction: column; gap: 2px; }
        .kpi-label { font-size: 11px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .kpi-val { font-size: 20px; font-weight: 800; color: #111827; }
        .kpi-sub { font-size: 11px; color: #9ca3af; }

        .text-success { color: #059669 !important; }
        .text-danger { color: #dc2626 !important; }

        /* TABS */
        .reports-nav-tabs {
          display: flex; gap: 8px; background: #ffffff; padding: 6px;
          border-radius: var(--radius-pill); border: 1px solid var(--border-color);
          width: fit-content; flex-wrap: wrap;
        }
        .tab-pill-btn {
          display: flex; align-items: center; gap: 8px; padding: 9px 16px;
          border-radius: var(--radius-pill); border: none; background: transparent;
          color: #4b5563; font-weight: 700; font-size: 13px; cursor: pointer; transition: var(--transition-all);
        }
        .tab-pill-btn.active {
          background: #ecfdf5; color: #00966b; box-shadow: 0 2px 8px rgba(0, 150, 107, 0.15);
        }

        /* FILTER BAR & TABLES */
        .filter-bar {
          display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; gap: 14px;
          background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl); flex-wrap: wrap;
        }
        .search-box { position: relative; display: flex; align-items: center; flex: 1; min-width: 260px; }
        .search-icon { position: absolute; left: 14px; color: #9ca3af; }
        .search-box input {
          width: 100%; padding: 10px 36px 10px 42px; border: 1px solid var(--border-color);
          border-radius: var(--radius-pill); background: #f9fafb; color: #111827; font-size: 13px;
        }
        .clear-search-btn { position: absolute; right: 12px; background: #e5e7eb; border: none; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .filter-select-wrapper { position: relative; display: flex; align-items: center; }
        .select-icon { position: absolute; left: 14px; color: #9ca3af; pointer-events: none; }
        .filter-select-wrapper select {
          padding: 9px 32px 9px 36px; border: 1px solid var(--border-color); border-radius: var(--radius-pill);
          background: #f9fafb; color: #374151; appearance: none; cursor: pointer; font-weight: 600; font-size: 13px;
        }
        .clear-filters-link { background: transparent; border: none; color: var(--primary); font-weight: 700; font-size: 13px; cursor: pointer; padding: 6px 12px; }

        .table-container-card { background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 20px; width: 100%; box-sizing: border-box; }
        .desktop-view-only { display: block; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .reports-table { width: 100%; border-collapse: collapse; text-align: left; }
        .reports-table th { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .reports-table td { padding: 14px 16px; font-size: 13.5px; border-bottom: 1px solid #f3f4f6; color: #111827; }
        .notif-row { cursor: pointer; transition: var(--transition-all); }
        .notif-row:hover { background-color: #f9fafb; }

        .balance-td.outstanding { color: #dc2626; font-weight: 800; }
        .balance-td.paid { color: #059669; font-weight: 800; }

        .status-pill { display: inline-block; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: var(--radius-pill); text-transform: uppercase; }
        .status-pill.paid { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .status-pill.partially_paid { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .status-pill.unpaid { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .opt-tag { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; }
        .opt-tag.on { background: #ecfdf5; color: #00966b; }
        .opt-tag.off { background: #fee2e2; color: #dc2626; }

        .sub-id-tag { font-size: 11px; color: #9ca3af; font-family: monospace; }
        .type-pill { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #e0e7ff; color: #4338ca; }

        /* COLLECTION REPORT CARDS */
        .collection-report-view { display: flex; flex-direction: column; gap: 20px; }
        .collection-report-header h4 { font-size: 17px; font-weight: 800; color: #111827; }
        .collection-report-header p { font-size: 12.5px; color: #6b7280; }

        .progress-bar-container { display: flex; flex-direction: column; gap: 8px; }
        .progress-labels { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; color: #374151; }
        .progress-track { width: 100%; height: 12px; background: #e5e7eb; border-radius: var(--radius-pill); overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #00966b 0%, #10b981 100%); border-radius: var(--radius-pill); transition: width 0.5s ease; }

        .report-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .report-stat-card { background: #f9fafb; padding: 18px; border-radius: var(--radius-lg); border: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 4px; }
        .stat-label { font-size: 11px; font-weight: 800; color: #6b7280; text-transform: uppercase; }
        .primary-color-text { color: #00966b; font-size: 22px; font-weight: 800; }
        .success-color-text { color: #059669; font-size: 22px; font-weight: 800; }
        .warning-color-text { color: #d97706; font-size: 22px; font-weight: 800; }
        .error-color-text { color: #dc2626; font-size: 22px; font-weight: 800; }
        .stat-sub { color: #9ca3af; }

        /* MOBILE CARDS DIRECTORY */
        .mobile-cards-directory { display: none; flex-direction: column; gap: 14px; width: 100%; box-sizing: border-box; }
        .mobile-notif-card { background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 10px; cursor: pointer; width: 100%; box-sizing: border-box; }
        .notif-title { font-size: 14.5px; font-weight: 800; color: #111827; }
        .notif-date { font-size: 11.5px; color: #6b7280; }
        .card-body { font-size: 12.5px; color: #4b5563; }
        .card-info-row { display: flex; justify-content: space-between; gap: 8px; }

        /* MODALS */
        .modal-overlay { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.55); backdrop-filter: blur(4px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
        .modal-dialog-card { width: 100%; max-width: 540px; background: #ffffff; border-radius: var(--radius-xl); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); overflow: hidden; border: 1px solid var(--border-color); box-sizing: border-box; }
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

        .details-meta-section { background: #f9fafb; border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 10px; border: 1px solid #f3f4f6; }
        .meta-item { display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px dashed #e5e7eb; padding-bottom: 6px; }
        .meta-label { text-transform: capitalize; color: #6b7280; font-weight: 600; }

        .no-data-cell { text-align: center; color: #9ca3af; padding: 40px !important; font-size: 13.5px; }
        .margin-bottom { margin-bottom: 16px; }

        /* RESPONSIVE */
        @media (max-width: 991px) {
          .reports-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .report-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .page-header-actions { flex-direction: column; align-items: stretch; gap: 12px; }
          .header-cta-group { flex-direction: column; align-items: stretch; }
          .year-selector-pill { justify-content: space-between; }
        }

        @media (max-width: 640px) {
          .desktop-view-only { display: none; }
          .mobile-cards-directory { display: flex; }
          .reports-kpi-grid { grid-template-columns: 1fr; }
          .report-stats-grid { grid-template-columns: 1fr; }
          .form-row-grid { grid-template-columns: 1fr; }
          .modal-overlay { padding: 0; align-items: flex-end; }
          .modal-dialog-card { border-radius: 20px 20px 0 0; max-height: 90vh; }
        }
      `}</style>
    </div>
  );
};

export default Reports;
