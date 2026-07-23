import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { Household, Member, MemberSubscription, SubscriptionYear } from '../../services/db';
import { Plus, Edit2, Search, Filter, Calendar, X, AlertCircle } from 'lucide-react';

export const Subscriptions: React.FC = () => {
  const { t } = useTranslation();

  // Data States
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals States
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);

  // Year Form Fields
  const [yearVal, setYearVal] = useState<number>(new Date().getFullYear());
  const [defaultFee, setDefaultFee] = useState<number>(1000);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [yearError, setYearError] = useState('');

  // Subscription Edit Fields
  const [currentSub, setCurrentSub] = useState<MemberSubscription | null>(null);
  const [editAnnualFee, setEditAnnualFee] = useState<number>(0);
  const [editArrears, setEditArrears] = useState<number>(0);
  const [subError, setSubError] = useState('');

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [yearList, memberList, houseList] = await Promise.all([
        db.years.get(),
        db.members.get(),
        db.households.get(),
      ]);
      setYears(yearList);
      setMembers(memberList);
      setHouseholds(houseList);

      if (yearList.length > 0) {
        // Find active year or default to first
        const activeYr = yearList.find(y => y.status === 'active') || yearList[0];
        setSelectedYearId(activeYr.id);
      }
    } catch (err) {
      console.error('Failed to load subscriptions setup:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch subscription records when selectedYearId changes
  const fetchSubscriptions = async () => {
    if (!selectedYearId) return;
    try {
      const allSubs = await db.subscriptions.get();
      const filtered = allSubs.filter((s) => s.subscription_year_id === selectedYearId);
      setSubscriptions(filtered);
    } catch (err) {
      console.error('Failed to load subscriptions for year:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [selectedYearId]);

  // Handle year configuration save
  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setYearError('');

    if (!yearVal || !defaultFee || !startDate || !endDate) {
      setYearError('All fields are required.');
      return;
    }

    try {
      const newYear = await db.years.create({
        year: Number(yearVal),
        default_fee: Number(defaultFee),
        start_date: startDate,
        end_date: endDate,
        status: 'active',
      });

      setIsYearModalOpen(false);
      
      // Refresh list and select the new year
      const updatedYears = await db.years.get();
      setYears(updatedYears);
      setSelectedYearId(newYear.id);
      
      // Reload members and subscriptions since creation auto-generates ledgers
      const [memberList, subList] = await Promise.all([
        db.members.get(),
        db.subscriptions.get(),
      ]);
      setMembers(memberList);
      const filtered = subList.filter((s) => s.subscription_year_id === newYear.id);
      setSubscriptions(filtered);
    } catch (err: any) {
      setYearError(err.message || 'Failed to create subscription year.');
    }
  };

  // Open Edit Subscription Modal
  const openEditSubModal = (sub: MemberSubscription) => {
    setCurrentSub(sub);
    setEditAnnualFee(sub.annual_fee);
    setEditArrears(sub.previous_arrears);
    setSubError('');
    setIsEditSubModalOpen(true);
  };

  // Save Subscription details update
  const handleSaveSubUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError('');

    if (!currentSub) return;

    try {
      await db.subscriptions.update(currentSub.id, {
        annual_fee: Number(editAnnualFee),
        previous_arrears: Number(editArrears),
      });

      setIsEditSubModalOpen(false);
      fetchSubscriptions();
    } catch (err: any) {
      setSubError(err.message || 'Failed to update subscription.');
    }
  };

  // Filtered Ledgers
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const mem = members.find((m) => m.id === sub.member_id);
    const house = mem ? households.find((h) => h.id === mem.household_id) : null;
    
    const matchesSearch =
      (mem && mem.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (house && house.house_number.includes(searchQuery));
      
    const matchesStatus = selectedStatus ? sub.status === selectedStatus : true;

    return matchesSearch && matchesStatus;
  });



  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="subscriptions-page">
      <div className="page-header-actions">
        <div className="year-selector-header">
          <h3>{t('subscription.subscriptionsTitle')}</h3>
          <div className="select-year-wrapper">
            <label htmlFor="year-select">{t('subscription.yearLabel')}:</label>
            <select
              id="year-select"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year} (Fee: {formatCurrency(y.default_fee)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="add-btn primary-btn" onClick={() => {
          setYearVal(new Date().getFullYear());
          setDefaultFee(1000);
          setStartDate(`${new Date().getFullYear()}-01-01`);
          setEndDate(`${new Date().getFullYear()}-12-31`);
          setYearError('');
          setIsYearModalOpen(true);
        }}>
          <Plus size={16} />
          <span>{t('subscription.configureYear')}</span>
        </button>
      </div>

      {/* FILTER AND SEARCH BAR */}
      <div className="filter-bar glass-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by member name, house number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-selectors">
          <div className="filter-select-wrapper">
            <Filter size={16} className="select-icon" />
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Status: All</option>
              <option value="paid">{t('subscription.paid')}</option>
              <option value="partially_paid">{t('subscription.partiallyPaid')}</option>
              <option value="unpaid">{t('subscription.unpaid')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* LEDGER DETAILS CARD */}
      <div className="table-container-card glass-card">
        {loading ? (
          <div className="loading-text">{t('common.loading')}</div>
        ) : (
          <div className="table-responsive">
            <table className="subscriptions-table">
              <thead>
                <tr>
                  <th>{t('member.memberName')}</th>
                  <th>{t('household.houseNumber')}</th>
                  <th>{t('subscription.annualSubscription')}</th>
                  <th>{t('subscription.previousArrears')}</th>
                  <th>{t('subscription.totalDue')}</th>
                  <th>{t('subscription.totalPaid')}</th>
                  <th>{t('subscription.outstandingBalance')}</th>
                  <th>{t('subscription.paymentStatus')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data-cell">{t('common.noData')}</td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => {
                    const mem = members.find((m) => m.id === sub.member_id);
                    const house = mem ? households.find((h) => h.id === mem.household_id) : null;
                    return (
                      <tr key={sub.id}>
                        <td className="bold-text">{mem ? mem.name : 'Unknown'}</td>
                        <td>{house ? `House No. ${house.house_number}` : 'N/A'}</td>
                        <td>{formatCurrency(sub.annual_fee)}</td>
                        <td className={sub.previous_arrears > 0 ? 'has-arrears-text' : ''}>
                          {formatCurrency(sub.previous_arrears)}
                        </td>
                        <td>{formatCurrency(sub.total_due)}</td>
                        <td>{formatCurrency(sub.total_paid)}</td>
                        <td className={`balance-td ${sub.balance > 0 ? 'outstanding' : 'paid'}`}>
                          {formatCurrency(sub.balance)}
                        </td>
                        <td>
                          <span className={`status-pill ${sub.status}`}>
                            {t(`subscription.${sub.status === 'paid' ? 'paid' : sub.status === 'partially_paid' ? 'partiallyPaid' : 'unpaid'}`)}
                          </span>
                        </td>
                        <td>
                          <div className="actions-button-wrapper">
                            <button 
                              className="action-icon-btn edit" 
                              onClick={() => openEditSubModal(sub)}
                              title="Modify Fee / Arrears"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIGURE YEAR MODAL */}
      {isYearModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container animate-fade-in">
            <div className="modal-header">
              <h4>{t('subscription.configureYear')}</h4>
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

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="year-val-input">{t('subscription.yearLabel')} *</label>
                  <input
                    id="year-val-input"
                    type="number"
                    required
                    placeholder="e.g., 2026"
                    value={yearVal}
                    onChange={(e) => setYearVal(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="default-fee-input">{t('subscription.defaultFeeLabel')} *</label>
                  <input
                    id="default-fee-input"
                    type="number"
                    required
                    placeholder="e.g., 1000"
                    value={defaultFee}
                    onChange={(e) => setDefaultFee(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="start-date-input">{t('subscription.startDate')} *</label>
                  <input
                    id="start-date-input"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end-date-input">{t('subscription.endDate')} *</label>
                  <input
                    id="end-date-input"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="ledger-generation-notice">
                <Calendar size={20} className="notice-icon" />
                <div>
                  <h5>Automated Ledger Generation</h5>
                  <p>Adding this year will automatically generate subscription ledger sheets for all active members. Any outstanding balances from previous years will roll over as arrears.</p>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel back-btn" onClick={() => setIsYearModalOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-submit primary-btn">
                  {t('subscription.createYear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBSCRIPTION DETAILS MODAL */}
      {isEditSubModalOpen && currentSub && (
        <div className="modal-backdrop">
          <div className="modal-container animate-fade-in">
            <div className="modal-header">
              <h4>Modify Member Ledger Settings</h4>
              <button className="modal-close-btn" onClick={() => setIsEditSubModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSubUpdate} className="modal-form">
              {subError && (
                <div className="form-alert error">
                  <AlertCircle size={16} />
                  <span>{subError}</span>
                </div>
              )}

              <div className="member-sub-info-block">
                <h5>{members.find(m => m.id === currentSub.member_id)?.name}</h5>
                <p>House No. {households.find(h => h.id === members.find(m => m.id === currentSub.member_id)?.household_id)?.house_number}</p>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="custom-fee-input">{t('subscription.annualSubscription')} (₹) *</label>
                  <input
                    id="custom-fee-input"
                    type="number"
                    required
                    value={editAnnualFee}
                    onChange={(e) => setEditAnnualFee(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="custom-arrears-input">{t('subscription.previousArrears')} (₹) *</label>
                  <input
                    id="custom-arrears-input"
                    type="number"
                    required
                    value={editArrears}
                    onChange={(e) => setEditArrears(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="ledger-recalc-preview">
                <div className="preview-item">
                  <span>Current Paid:</span>
                  <b>{formatCurrency(currentSub.total_paid)}</b>
                </div>
                <div className="preview-item">
                  <span>New Total Due:</span>
                  <b>{formatCurrency(editAnnualFee + editArrears)}</b>
                </div>
                <div className="preview-item">
                  <span>New Balance:</span>
                  <b className={editAnnualFee + editArrears - currentSub.total_paid > 0 ? 'outstanding' : ''}>
                    {formatCurrency(editAnnualFee + editArrears - currentSub.total_paid)}
                  </b>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel back-btn" onClick={() => setIsEditSubModalOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-submit primary-btn">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .subscriptions-page {
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

        /* FILTER BAR */
        .filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 250px;
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

        .filter-selectors {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .filter-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .filter-select-wrapper select {
          padding: 10px 32px 10px 36px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-app);
          color: var(--text-main);
          appearance: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }

        /* TABLE */
        .table-container-card {
          padding: 24px;
        }

        .subscriptions-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .subscriptions-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          background-color: var(--bg-app);
          border-bottom: 1px solid var(--border-color);
        }

        .subscriptions-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .bold-text {
          font-weight: 600;
        }

        .has-arrears-text {
          color: var(--error);
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

        .actions-button-wrapper {
          display: flex;
          gap: 8px;
        }

        .action-icon-btn {
          border: none;
          background: var(--bg-app);
          color: var(--text-muted);
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .action-icon-btn:hover {
          background: var(--primary-10);
          color: var(--primary);
        }

        /* NOTICE BOX */
        .ledger-generation-notice {
          display: flex;
          gap: 16px;
          background-color: var(--info-bg);
          color: var(--info);
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 16px;
          border-radius: var(--radius-md);
        }

        .notice-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .ledger-generation-notice h5 {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .ledger-generation-notice p {
          font-size: 11px;
          line-height: 1.4;
          color: var(--text-muted);
        }

        /* MEMBER SUB MODAL INFO */
        .member-sub-info-block {
          background-color: var(--bg-app);
          padding: 16px;
          border-radius: var(--radius-md);
          margin-bottom: 8px;
        }

        .member-sub-info-block h5 {
          font-size: 15px;
          font-weight: 700;
          color: var(--primary);
        }

        .member-sub-info-block p {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* RECALC PREVIEW */
        .ledger-recalc-preview {
          background-color: var(--bg-app);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }

        .preview-item {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        .preview-item b {
          font-size: 13px;
          color: var(--text-main);
        }

        .preview-item b.outstanding {
          color: var(--error);
        }

        /* MODAL */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-container {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 600px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .modal-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
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

        .form-group input, .form-group select {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-card);
          color: var(--text-main);
          transition: var(--transition-all);
        }

        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-10);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
        }

        .modal-actions button {
          min-width: 100px;
          padding: 10px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
        }

        @media (max-width: 576px) {
          .form-row-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
export default Subscriptions;
