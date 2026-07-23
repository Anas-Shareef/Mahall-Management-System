import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { Household, Member, MemberSubscription, SubscriptionYear } from '../../services/db';
import { Download, Search } from 'lucide-react';

export const Reports: React.FC = () => {
  const { t } = useTranslation();

  // Data States
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector / Filter States
  const [selectedYearId, setSelectedYearId] = useState('');
  const [activeTab, setActiveTab] = useState<'collection' | 'household' | 'member' | 'arrears'>('collection');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [houseList, memberList, yearList, subList] = await Promise.all([
        db.households.get(),
        db.members.get(),
        db.years.get(),
        db.subscriptions.get(),
      ]);
      setHouseholds(houseList);
      setMembers(memberList);
      setYears(yearList);
      setSubscriptions(subList);

      if (yearList.length > 0) {
        const activeYr = yearList.find(y => y.status === 'active') || yearList[0];
        setSelectedYearId(activeYr.id);
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedYearObj = years.find(y => y.id === selectedYearId);
  const currentYearVal = selectedYearObj ? selectedYearObj.year : new Date().getFullYear();

  // CALCULATE SUMS FOR COLLECTION REPORT
  const getCollectionReportData = () => {
    if (!selectedYearId) return { expected: 0, collected: 0, pending: 0, arrears: 0 };
    const yearSubs = subscriptions.filter(s => s.subscription_year_id === selectedYearId);
    
    return {
      expected: yearSubs.reduce((sum, s) => sum + s.annual_fee, 0),
      collected: yearSubs.reduce((sum, s) => sum + s.total_paid, 0),
      pending: yearSubs.reduce((sum, s) => sum + s.balance, 0),
      arrears: yearSubs.reduce((sum, s) => sum + s.previous_arrears, 0),
    };
  };

  // GENERATE HOUSEHOLD REPORT ROW ITEMS
  const getHouseholdReportData = () => {
    return households.map((h) => {
      const houseMembers = members.filter((m) => m.household_id === h.id);
      let totalDue = 0;
      let totalPaid = 0;
      let balance = 0;

      houseMembers.forEach((member) => {
        const sub = subscriptions.find(s => s.member_id === member.id && s.subscription_year_id === selectedYearId);
        if (sub) {
          totalDue += sub.total_due;
          totalPaid += sub.total_paid;
          balance += sub.balance;
        }
      });

      return {
        houseNumber: h.house_number,
        ownerName: h.house_owner_name,
        membersCount: houseMembers.length,
        totalDue,
        totalPaid,
        balance,
      };
    }).filter((r) => 
      r.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.houseNumber.includes(searchQuery)
    );
  };

  // GENERATE MEMBER REPORT ROW ITEMS
  const getMemberReportData = () => {
    return members.map((m) => {
      const house = households.find(h => h.id === m.household_id);
      const sub = subscriptions.find(s => s.member_id === m.id && s.subscription_year_id === selectedYearId);

      return {
        memberName: m.name,
        houseNumber: house ? house.house_number : 'N/A',
        relationship: m.relationship,
        totalDue: sub ? sub.total_due : 0,
        totalPaid: sub ? sub.total_paid : 0,
        balance: sub ? sub.balance : 0,
        status: sub ? sub.status : 'unpaid'
      };
    }).filter((r) => 
      r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.houseNumber.includes(searchQuery)
    );
  };

  // GENERATE ARREARS REPORT ROW ITEMS
  const getArrearsReportData = () => {
    // Find all subscriptions with arrears > 0 OR outstanding balance > 0
    return subscriptions
      .filter((sub) => sub.subscription_year_id === selectedYearId && (sub.previous_arrears > 0 || sub.balance > 0))
      .map((sub) => {
        const mem = members.find(m => m.id === sub.member_id);
        const house = mem ? households.find(h => h.id === mem.household_id) : null;

        return {
          memberName: mem ? mem.name : 'Unknown',
          houseNumber: house ? house.house_number : 'N/A',
          year: currentYearVal,
          arrears: sub.previous_arrears,
          balance: sub.balance,
          totalOutstanding: sub.previous_arrears + sub.balance
        };
      })
      .filter((r) => 
        r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.houseNumber.includes(searchQuery)
      );
  };

  const collectionStats = getCollectionReportData();
  const householdRows = getHouseholdReportData();
  const memberRows = getMemberReportData();
  const arrearsRows = getArrearsReportData();

  // CSV EXPORTER
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = `Report_${activeTab}_${currentYearVal}.csv`;

    if (activeTab === 'collection') {
      headers = ['Metric', 'Amount (INR)'];
      rows = [
        ['Year', currentYearVal],
        ['Expected annual subscriptions', collectionStats.expected],
        ['Total collections received', collectionStats.collected],
        ['Total pending balance', collectionStats.pending],
        ['Rollover arrears', collectionStats.arrears],
      ];
    } else if (activeTab === 'household') {
      headers = ['House Number', 'House Owner Name', 'Active Members', 'Total Due (INR)', 'Total Paid (INR)', 'Balance (INR)'];
      rows = householdRows.map((h) => [
        h.houseNumber,
        h.ownerName,
        h.membersCount,
        h.totalDue,
        h.totalPaid,
        h.balance,
      ]);
    } else if (activeTab === 'member') {
      headers = ['Member Name', 'House Number', 'Relationship', 'Total Due (INR)', 'Total Paid (INR)', 'Outstanding Balance (INR)', 'Status'];
      rows = memberRows.map((m) => [
        m.memberName,
        m.houseNumber,
        m.relationship,
        m.totalDue,
        m.totalPaid,
        m.balance,
        m.status,
      ]);
    } else if (activeTab === 'arrears') {
      headers = ['Member Name', 'House Number', 'Year', 'Rollover Arrears (INR)', 'Current Outstanding (INR)', 'Total Pending Dues (INR)'];
      rows = arrearsRows.map((a) => [
        a.memberName,
        a.houseNumber,
        a.year,
        a.arrears,
        a.balance,
        a.totalOutstanding,
      ]);
    }

    // Generate CSV string
    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map((x: any) => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="reports-page">
      <div className="page-header-actions">
        <div className="year-selector-header">
          <h3>{t('reports.reportsTitle')}</h3>
          <div className="select-year-wrapper">
            <label htmlFor="report-year-select">{t('subscription.yearLabel')}:</label>
            <select
              id="report-year-select"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.year}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="add-btn primary-btn export-btn" onClick={handleExportCSV}>
          <Download size={16} />
          <span>{t('reports.exportCsv')}</span>
        </button>
      </div>

      {/* REPORT SELECTION TABS */}
      <div className="reports-tabs">
        <button 
          className={`report-tab-btn ${activeTab === 'collection' ? 'active' : ''}`}
          onClick={() => { setActiveTab('collection'); setSearchQuery(''); }}
        >
          {t('reports.collectionReport')}
        </button>
        <button 
          className={`report-tab-btn ${activeTab === 'household' ? 'active' : ''}`}
          onClick={() => { setActiveTab('household'); setSearchQuery(''); }}
        >
          {t('reports.householdReport')}
        </button>
        <button 
          className={`report-tab-btn ${activeTab === 'member' ? 'active' : ''}`}
          onClick={() => { setActiveTab('member'); setSearchQuery(''); }}
        >
          {t('reports.memberReport')}
        </button>
        <button 
          className={`report-tab-btn ${activeTab === 'arrears' ? 'active' : ''}`}
          onClick={() => { setActiveTab('arrears'); setSearchQuery(''); }}
        >
          {t('reports.arrearsReport')}
        </button>
      </div>

      {/* SEARCH BAR (Visible except for collection summary) */}
      {activeTab !== 'collection' && (
        <div className="filter-bar glass-card">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Filter report rows by name or house number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* REPORT CONTENT VIEW */}
      <div className="table-container-card glass-card">
        {loading ? (
          <div className="loading-text">{t('common.loading')}</div>
        ) : (
          <div className="report-content-body animate-fade-in">
            
            {/* 1. COLLECTION SUMMARY */}
            {activeTab === 'collection' && (
              <div className="collection-report-view">
                <div className="collection-report-header">
                  <h4>Annual Collection Summary - {currentYearVal}</h4>
                  <p>Consolidated statistics of expecting Mahallu subscriptions and recorded offline collections.</p>
                </div>
                <div className="report-stats-grid">
                  <div className="report-stat-card">
                    <span className="stat-label">{t('reports.expected')}</span>
                    <h3 className="primary-color-text">{formatCurrency(collectionStats.expected)}</h3>
                  </div>
                  <div className="report-stat-card">
                    <span className="stat-label">{t('reports.collected')}</span>
                    <h3 className="success-color-text">{formatCurrency(collectionStats.collected)}</h3>
                  </div>
                  <div className="report-stat-card">
                    <span className="stat-label">{t('reports.pending')}</span>
                    <h3 className="warning-color-text">{formatCurrency(collectionStats.pending)}</h3>
                  </div>
                  <div className="report-stat-card">
                    <span className="stat-label">{t('reports.arrears')}</span>
                    <h3 className="error-color-text">{formatCurrency(collectionStats.arrears)}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* 2. HOUSEHOLD REPORT */}
            {activeTab === 'household' && (
              <div className="table-responsive">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>{t('household.houseNumber')}</th>
                      <th>{t('household.houseOwner')}</th>
                      <th>{t('household.membersCount')}</th>
                      <th>{t('household.totalDue')}</th>
                      <th>{t('household.totalPaid')}</th>
                      <th>{t('household.balance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {householdRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="no-data-cell">{t('common.noData')}</td>
                      </tr>
                    ) : (
                      householdRows.map((h, i) => (
                        <tr key={i}>
                          <td className="bold-text">House No. {h.houseNumber}</td>
                          <td>{h.ownerName}</td>
                          <td>{h.membersCount} Members</td>
                          <td>{formatCurrency(h.totalDue)}</td>
                          <td>{formatCurrency(h.totalPaid)}</td>
                          <td className={`balance-td ${h.balance > 0 ? 'outstanding' : 'paid'}`}>
                            {formatCurrency(h.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. MEMBER REPORT */}
            {activeTab === 'member' && (
              <div className="table-responsive">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>{t('member.memberName')}</th>
                      <th>{t('household.houseNumber')}</th>
                      <th>{t('member.relationship')}</th>
                      <th>{t('subscription.totalDue')}</th>
                      <th>{t('subscription.totalPaid')}</th>
                      <th>{t('subscription.outstandingBalance')}</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="no-data-cell">{t('common.noData')}</td>
                      </tr>
                    ) : (
                      memberRows.map((m, i) => (
                        <tr key={i}>
                          <td className="bold-text">{m.memberName}</td>
                          <td>House No. {m.houseNumber}</td>
                          <td>{m.relationship}</td>
                          <td>{formatCurrency(m.totalDue)}</td>
                          <td>{formatCurrency(m.totalPaid)}</td>
                          <td className={`balance-td ${m.balance > 0 ? 'outstanding' : 'paid'}`}>
                            {formatCurrency(m.balance)}
                          </td>
                          <td>
                            <span className={`status-pill ${m.status}`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. ARREARS REPORT */}
            {activeTab === 'arrears' && (
              <div className="table-responsive">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>{t('member.memberName')}</th>
                      <th>{t('household.houseNumber')}</th>
                      <th>Year</th>
                      <th>{t('subscription.previousArrears')}</th>
                      <th>Current Unpaid</th>
                      <th>Total Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrearsRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="no-data-cell">{t('common.noData')}</td>
                      </tr>
                    ) : (
                      arrearsRows.map((a, i) => (
                        <tr key={i}>
                          <td className="bold-text">{a.memberName}</td>
                          <td>House No. {a.houseNumber}</td>
                          <td>{a.year}</td>
                          <td>{formatCurrency(a.arrears)}</td>
                          <td>{formatCurrency(a.balance)}</td>
                          <td className="balance-td outstanding">{formatCurrency(a.totalOutstanding)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </div>

      <style>{`
        .reports-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .year-selector-header {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .year-selector-header h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
        }

        .select-year-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .select-year-wrapper label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .select-year-wrapper select {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-card);
          color: var(--text-main);
          font-weight: 700;
          cursor: pointer;
        }

        .export-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* REPORTS TABS */
        .reports-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 2px solid var(--border-color);
          overflow-x: auto;
        }

        .report-tab-btn {
          padding: 12px 24px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: var(--transition-all);
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          white-space: nowrap;
        }

        .report-tab-btn:hover {
          color: var(--primary);
        }

        .report-tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        [data-theme="dark"] .report-tab-btn.active {
          color: var(--gold-light);
          border-bottom-color: var(--gold);
        }

        /* FILTER BAR */
        .filter-bar {
          padding: 16px 24px;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
        }

        .search-box input {
          width: 100%;
          padding: 10px 10px 10px 42px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-app);
          color: var(--text-main);
          transition: var(--transition-all);
        }

        .search-box input:focus {
          outline: none;
          border-color: var(--primary);
          background: var(--bg-card);
        }

        /* CONTENT CARD */
        .table-container-card {
          padding: 24px;
        }

        /* COLLECTION SUMMARY REPORT */
        .collection-report-view {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .collection-report-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        .collection-report-header p {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .report-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .report-stat-card {
          background-color: var(--bg-app);
          padding: 24px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          text-align: center;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .report-stat-card h3 {
          font-size: 24px;
          font-weight: 700;
          margin-top: 8px;
        }

        .primary-color-text { color: var(--primary); }
        .success-color-text { color: var(--success); }
        .warning-color-text { color: var(--warning); }
        .error-color-text { color: var(--error); }

        /* TABLES */
        .reports-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .reports-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          background-color: var(--bg-app);
          border-bottom: 1px solid var(--border-color);
        }

        .reports-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .reports-table tr:last-child td {
          border-bottom: none;
        }

        .bold-text {
          font-weight: 600;
        }

        .balance-td {
          font-weight: 700;
        }

        .balance-td.outstanding { color: var(--error); }
        .balance-td.paid { color: var(--success); }

        .status-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .status-pill.paid { background-color: var(--success-bg); color: var(--success); }
        .status-pill.partially_paid { background-color: var(--warning-bg); color: var(--warning); }
        .status-pill.unpaid { background-color: var(--error-bg); color: var(--error); }

        .no-data-cell {
          text-align: center;
          color: var(--text-muted);
          padding: 40px !important;
        }

        @media (max-width: 991px) {
          .report-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 576px) {
          .report-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
export default Reports;
