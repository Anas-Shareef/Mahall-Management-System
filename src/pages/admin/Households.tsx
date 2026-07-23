import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { Household, Member, MemberSubscription, SubscriptionYear } from '../../services/db';
import { Plus, Edit2, Search, Filter, Home, Users, X, AlertCircle } from 'lucide-react';

export const Households: React.FC = () => {
  const { t } = useTranslation();
  
  // Data States
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Fields
  const [houseNumber, setHouseNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState('');

  // Household Details Panel
  const [selectedHouseholdDetails, setSelectedHouseholdDetails] = useState<Household | null>(null);
  const [householdMembersDetails, setHouseholdMembersDetails] = useState<any[]>([]);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [houseList, memberList, subList, yearList] = await Promise.all([
        db.households.get(),
        db.members.get(),
        db.subscriptions.get(),
        db.years.get(),
      ]);
      setHouseholds(houseList);
      setMembers(memberList);
      setSubscriptions(subList);
      setYears(yearList);
    } catch (err) {
      console.error('Failed to load household page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate Consolidated financials for a household
  const getHouseholdFinancials = (householdId: string) => {
    const houseMembers = members.filter((m) => m.household_id === householdId);
    let totalDue = 0;
    let totalPaid = 0;
    let balance = 0;

    houseMembers.forEach((member) => {
      const memberSubs = subscriptions.filter((s) => s.member_id === member.id);
      memberSubs.forEach((sub) => {
        totalDue += sub.total_due;
        totalPaid += sub.total_paid;
        balance += sub.balance;
      });
    });

    return {
      membersCount: houseMembers.length,
      totalDue,
      totalPaid,
      balance,
    };
  };

  // Open Modal
  const openAddModal = () => {
    setModalMode('add');
    setCurrentId(null);
    setHouseNumber('');
    setOwnerName('');
    setOwnerPhone('');
    setAddress('');
    setArea('');
    setStatus('active');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (h: Household) => {
    setModalMode('edit');
    setCurrentId(h.id);
    setHouseNumber(h.house_number);
    setOwnerName(h.house_owner_name);
    setOwnerPhone(h.house_owner_phone || '');
    setAddress(h.address || '');
    setArea(h.area || '');
    setStatus(h.status);
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!houseNumber || !ownerName) {
      setFormError('House number and owner name are required.');
      return;
    }

    try {
      const data = {
        house_number: houseNumber,
        house_owner_name: ownerName,
        house_owner_phone: ownerPhone || null,
        address: address || null,
        area: area || null,
        status,
      };

      if (modalMode === 'add') {
        await db.households.create(data);
      } else if (currentId) {
        await db.households.update(currentId, data);
      }

      setIsModalOpen(false);
      loadData();
      
      // Refresh details if the currently viewed household was updated
      if (selectedHouseholdDetails && selectedHouseholdDetails.id === currentId) {
        const updatedH = await db.households.getById(currentId);
        setSelectedHouseholdDetails(updatedH);
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    }
  };

  // Show detailed panel
  const handleViewDetails = (h: Household) => {
    setSelectedHouseholdDetails(h);
    const houseMembers = members.filter((m) => m.household_id === h.id);
    
    // Latest active year
    const activeYear = years.find(y => y.status === 'active') || years[0];
    
    const details = houseMembers.map((m) => {
      // Find sub for latest year
      const sub = activeYear 
        ? subscriptions.find(s => s.member_id === m.id && s.subscription_year_id === activeYear.id)
        : null;

      return {
        id: m.id,
        name: m.name,
        relationship: m.relationship,
        totalDue: sub ? sub.total_due : 0,
        totalPaid: sub ? sub.total_paid : 0,
        balance: sub ? sub.balance : 0,
      };
    });

    setHouseholdMembersDetails(details);
  };

  // Filters calculation
  const uniqueAreas = Array.from(new Set(households.map((h) => h.area).filter(Boolean)));

  const filteredHouseholds = households.filter((h) => {
    const matchesSearch =
      h.house_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.house_owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.house_owner_phone && h.house_owner_phone.includes(searchQuery));
    const matchesArea = selectedArea ? h.area === selectedArea : true;
    const matchesStatus = selectedStatus ? h.status === selectedStatus : true;

    return matchesSearch && matchesArea && matchesStatus;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="households-page">
      <div className="page-header-actions">
        <h3>{t('household.householdsTitle')}</h3>
        <button className="add-btn primary-btn" onClick={openAddModal}>
          <Plus size={16} />
          <span>{t('household.addHousehold')}</span>
        </button>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="filter-bar glass-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-selectors">
          <div className="filter-select-wrapper">
            <Filter size={16} className="select-icon" />
            <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {uniqueAreas.map((a) => (
                <option key={a} value={a as string}>{a}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Filter size={16} className="select-icon" />
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Status: All</option>
              <option value="active">{t('household.active')}</option>
              <option value="inactive">{t('household.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT SPLIT */}
      <div className="households-content-split">
        {/* HOUSEHOLDS TABLE */}
        <div className={`table-container-card glass-card ${selectedHouseholdDetails ? 'narrow' : ''}`}>
          {loading ? (
            <div className="loading-text">{t('common.loading')}</div>
          ) : (
            <div className="table-responsive">
              <table className="households-table">
                <thead>
                  <tr>
                    <th>{t('household.houseNumber')}</th>
                    <th>{t('household.houseOwner')}</th>
                    <th>{t('household.area')}</th>
                    <th>{t('household.membersCount')}</th>
                    <th>{t('household.balance')}</th>
                    <th>{t('household.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHouseholds.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="no-data-cell">{t('common.noData')}</td>
                    </tr>
                  ) : (
                    filteredHouseholds.map((h) => {
                      const financials = getHouseholdFinancials(h.id);
                      return (
                        <tr 
                          key={h.id} 
                          className={`household-row ${selectedHouseholdDetails?.id === h.id ? 'selected' : ''}`}
                          onClick={() => handleViewDetails(h)}
                        >
                          <td className="bold-text">House No. {h.house_number}</td>
                          <td>
                            <div className="owner-profile-td">
                              <span>{h.house_owner_name}</span>
                              <span className="owner-phone-sub">{h.house_owner_phone || 'No phone'}</span>
                            </div>
                          </td>
                          <td>{h.area || 'N/A'}</td>
                          <td>
                            <span className="members-badge">
                              <Users size={12} />
                              {financials.membersCount}
                            </span>
                          </td>
                          <td className={`balance-td ${financials.balance > 0 ? 'outstanding' : 'paid'}`}>
                            {formatCurrency(financials.balance)}
                          </td>
                          <td>
                            <span className={`status-pill ${h.status}`}>
                              {t(`household.${h.status}`)}
                            </span>
                          </td>
                          <td>
                            <div className="actions-button-wrapper" onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="action-icon-btn edit" 
                                onClick={() => openEditModal(h)}
                                title={t('common.edit')}
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

        {/* HOUSEHOLD DETAILS FINANCIAL SUMMARY SIDE PANEL */}
        {selectedHouseholdDetails && (
          <div className="details-panel-card glass-card">
            <div className="panel-header">
              <div className="panel-title-wrapper">
                <Home size={20} className="panel-title-icon" />
                <div>
                  <h4>House No. {selectedHouseholdDetails.house_number}</h4>
                  <p>{selectedHouseholdDetails.house_owner_name}</p>
                </div>
              </div>
              <button className="panel-close-btn" onClick={() => setSelectedHouseholdDetails(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="panel-body">
              <div className="details-meta-section">
                <div className="meta-item">
                  <span className="meta-label">Phone</span>
                  <span className="meta-value">{selectedHouseholdDetails.house_owner_phone || 'N/A'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Area/Ward</span>
                  <span className="meta-value">{selectedHouseholdDetails.area || 'N/A'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Address</span>
                  <span className="meta-value font-sm">{selectedHouseholdDetails.address || 'N/A'}</span>
                </div>
              </div>

              <div className="financials-breakdown">
                <h5>{t('household.financialSummary')}</h5>
                <div className="members-ledger-table-wrapper">
                  <table className="mini-ledger-table">
                    <thead>
                      <tr>
                        <th>{t('member.memberName')}</th>
                        <th>{t('subscription.totalDue')}</th>
                        <th>{t('subscription.totalPaid')}</th>
                        <th>{t('subscription.outstandingBalance')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {householdMembersDetails.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="no-data-cell">No members in household</td>
                        </tr>
                      ) : (
                        <>
                          {householdMembersDetails.map((m) => (
                            <tr key={m.id}>
                              <td className="bold-text">{m.name} <span className="rel-tag">({m.relationship})</span></td>
                              <td>{formatCurrency(m.totalDue)}</td>
                              <td>{formatCurrency(m.totalPaid)}</td>
                              <td className={m.balance > 0 ? 'outstanding' : ''}>{formatCurrency(m.balance)}</td>
                            </tr>
                          ))}
                          {/* House Consolidated Total Row */}
                          <tr className="consolidated-total-row">
                            <td>House Total</td>
                            <td>{formatCurrency(householdMembersDetails.reduce((sum, m) => sum + m.totalDue, 0))}</td>
                            <td>{formatCurrency(householdMembersDetails.reduce((sum, m) => sum + m.totalPaid, 0))}</td>
                            <td className="grand-balance">
                              {formatCurrency(householdMembersDetails.reduce((sum, m) => sum + m.balance, 0))}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL DIALOG */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-fade-in">
            <div className="modal-header">
              <h4>{modalMode === 'add' ? t('household.addHousehold') : t('household.editHousehold')}</h4>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="modal-form">
              {formError && (
                <div className="form-alert error">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="house-no-input">{t('household.houseNumber')} *</label>
                  <input
                    id="house-no-input"
                    type="text"
                    required
                    placeholder={t('household.enterHouseNumber')}
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="owner-name-input">{t('household.houseOwner')} *</label>
                  <input
                    id="owner-name-input"
                    type="text"
                    required
                    placeholder={t('household.enterOwnerName')}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="phone-input">{t('household.houseOwnerPhone')}</label>
                  <input
                    id="phone-input"
                    type="tel"
                    placeholder={t('household.enterOwnerPhone')}
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="area-input">{t('household.area')}</label>
                  <input
                    id="area-input"
                    type="text"
                    placeholder={t('household.enterArea')}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address-input">{t('household.address')}</label>
                <textarea
                  id="address-input"
                  rows={3}
                  placeholder={t('household.enterAddress')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{t('household.status')}</label>
                <div className="status-pill-toggle-group">
                  <button
                    type="button"
                    className={`status-toggle-pill active-pill ${status === 'active' ? 'selected' : ''}`}
                    onClick={() => setStatus('active')}
                  >
                    <span className="dot active-dot"></span>
                    <span>{t('household.active')}</span>
                  </button>
                  <button
                    type="button"
                    className={`status-toggle-pill inactive-pill ${status === 'inactive' ? 'selected' : ''}`}
                    onClick={() => setStatus('inactive')}
                  >
                    <span className="dot inactive-dot"></span>
                    <span>{t('household.inactive')}</span>
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="primary-btn">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .households-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .page-header-actions h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
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

        /* WORKSPACE SPLIT */
        .households-content-split {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .table-container-card {
          flex: 1;
          padding: 24px;
          transition: var(--transition-all);
        }

        .table-container-card.narrow {
          flex: 1.4;
        }

        .details-panel-card {
          flex: 1;
          padding: 24px;
          position: sticky;
          top: 94px;
          animation: slideInLeft 0.3s ease;
        }

        .households-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .households-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          background-color: var(--bg-app);
          border-bottom: 1px solid var(--border-color);
        }

        .households-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .household-row {
          cursor: pointer;
          transition: var(--transition-all);
        }

        .household-row:hover {
          background-color: var(--primary-10);
        }

        .household-row.selected {
          background-color: var(--primary-20);
          border-left: 3px solid var(--primary);
        }

        .owner-profile-td {
          display: flex;
          flex-direction: column;
        }

        .owner-phone-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .members-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background-color: var(--primary-10);
          color: var(--primary);
          border-radius: var(--radius-sm);
          font-size: 12px;
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

        .status-pill.active { background-color: var(--success-bg); color: var(--success); }
        .status-pill.inactive { background-color: var(--error-bg); color: var(--error); }

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

        /* DETAILS SIDE PANEL */
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .panel-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .panel-title-icon {
          color: var(--gold);
        }

        .panel-title-wrapper h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        .panel-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .details-meta-section {
          background: var(--bg-app);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .meta-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .meta-value {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .meta-value.font-sm {
          font-size: 12px;
          text-align: right;
          max-width: 60%;
        }

        .financials-breakdown h5 {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--primary);
        }

        .members-ledger-table-wrapper {
          overflow-x: auto;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .mini-ledger-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          text-align: left;
        }

        .mini-ledger-table th {
          padding: 10px 12px;
          background: var(--bg-app);
          color: var(--text-muted);
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
        }

        .mini-ledger-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .rel-tag {
          font-size: 9px;
          color: var(--text-muted);
          font-weight: normal;
        }

        .mini-ledger-table td.outstanding {
          color: var(--error);
          font-weight: 700;
        }

        .consolidated-total-row {
          background-color: var(--primary-10);
          font-weight: 700;
        }

        .consolidated-total-row td {
          border-bottom: none;
        .households-table th {
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
        }

        .households-table td {
          padding: 14px;
          font-size: 13.5px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
        }

        .clickable-row {
          cursor: pointer;
          transition: var(--transition-all);
        }

        .clickable-row:hover {
          background: #f9fafb;
        }

        .clickable-row.selected {
          background: #ecfdf5;
        }

        .bold-text {
          font-weight: 700;
          color: #111827;
        }

        .amount-text {
          font-weight: 800;
          color: var(--primary);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: var(--radius-pill);
          font-size: 11.5px;
          font-weight: 600;
        }

        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-action-btn {
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: var(--transition-all);
        }

        .icon-action-btn:hover {
          color: var(--primary);
          background: #f3f4f6;
        }

        .no-data-cell {
          text-align: center;
          color: #9ca3af;
          padding: 24px;
        }

        /* DETAILS PANEL */
        .details-panel-card {
          width: 360px;
          padding: 24px;
          position: sticky;
          top: 90px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid #e5e7eb;
        }

        .panel-header-title h4 {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
        }

        .panel-header-title p {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .panel-close-btn {
          background: transparent;
          border: none;
          color: #9ca3af;
          cursor: pointer;
        }

        .panel-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-item .label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 600;
        }

        .info-item .value {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
        }

        .panel-section-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 10px;
        }

        .panel-members-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .panel-member-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: #f9fafb;
          border-radius: var(--radius-md);
          border: 1px solid #f3f4f6;
        }

        .member-name-tag h5 {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
        }

        .member-name-tag p {
          font-size: 11px;
          color: #6b7280;
        }

        /* MODAL DIALOG */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        .modal-dialog-card {
          width: 100%;
          max-width: 540px;
          background: #ffffff;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-floating);
          overflow: hidden;
        }

        .modal-header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .modal-header h4 {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: #9ca3af;
          cursor: pointer;
        }

        .modal-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
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
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
        }

        .form-group input, .form-group textarea {
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
          transition: var(--transition-all);
        }

        .status-pill-toggle-group {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }

        .status-toggle-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-color);
          background: #f9fafb;
          color: #4b5563;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .status-toggle-pill .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9ca3af;
        }

        .status-toggle-pill.active-pill.selected {
          background: #d1fae5;
          color: #065f46;
          border-color: #a7f3d0;
        }
        .status-toggle-pill.active-pill.selected .dot {
          background: #10b981;
        }

        .status-toggle-pill.inactive-pill.selected {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fca5a5;
        }
        .status-toggle-pill.inactive-pill.selected .dot {
          background: #ef4444;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-cancel {
          background: #f3f4f6;
          border: 1px solid var(--border-color);
          color: #374151;
          padding: 10px 20px;
          border-radius: var(--radius-pill);
          font-weight: 600;
          cursor: pointer;
        }

        /* RESPONSIVE */
        @media (max-width: 991px) {
          .households-content-split {
            flex-direction: column;
          }
          
          .details-panel-card {
            width: 100%;
            position: relative;
            top: 0;
          }
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
export default Households;
