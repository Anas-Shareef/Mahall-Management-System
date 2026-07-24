import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { Household, Member, MemberSubscription, SubscriptionYear } from '../../services/db';
import { 
  Plus, Edit2, Trash2, Search, Filter, Calendar, X, AlertCircle, 
  CheckCircle, FileText, Download, Loader2, Home, CreditCard 
} from 'lucide-react';

export const Subscriptions: React.FC = () => {
  const { t } = useTranslation();

  // Data States
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('all');
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');

  // Add / Edit Subscription Modal States
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalMode, setSubModalMode] = useState<'add' | 'edit'>('add');
  const [currentSubId, setCurrentSubId] = useState<string | null>(null);

  // Form Fields
  const [memberId, setMemberId] = useState('');
  const [yearId, setYearId] = useState('');
  const [annualFee, setAnnualFee] = useState<number>(1000);
  const [previousArrears, setPreviousArrears] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [subStatus, setSubStatus] = useState<'paid' | 'partially_paid' | 'unpaid'>('unpaid');

  // Form Validation & Saving States
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Configure Year Modal State
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [yearVal, setYearVal] = useState<number>(new Date().getFullYear());
  const [defaultFee, setDefaultFee] = useState<number>(1000);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [yearError, setYearError] = useState('');
  const [isSavingYear, setIsSavingYear] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subToDelete, setSubToDelete] = useState<MemberSubscription | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Subscription Details Panel
  const [selectedSubDetails, setSelectedSubDetails] = useState<MemberSubscription | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [yearList, memberList, houseList, subList] = await Promise.all([
        db.years.get(),
        db.members.get(),
        db.households.get(),
        db.subscriptions.get(),
      ]);
      setYears(yearList);
      setMembers(memberList);
      setHouseholds(houseList);
      setSubscriptions(subList);

      const activeYr = yearList.find(y => y.status === 'active') || yearList[0];
      if (activeYr && selectedYearId === 'all') {
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

  // Open Add Subscription Modal
  const openAddSubModal = () => {
    setSubModalMode('add');
    setCurrentSubId(null);
    setMemberId(members[0]?.id || '');
    setYearId(selectedYearId !== 'all' ? selectedYearId : (years[0]?.id || ''));
    setAnnualFee(years.find((y) => y.id === (selectedYearId !== 'all' ? selectedYearId : years[0]?.id))?.default_fee || 1000);
    setPreviousArrears(0);
    setTotalPaid(0);
    setSubStatus('unpaid');
    setFieldErrors({});
    setFormError('');
    setIsSubModalOpen(true);
  };

  // Open Edit Subscription Modal
  const openEditSubModal = (sub: MemberSubscription, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSubModalMode('edit');
    setCurrentSubId(sub.id);
    setMemberId(sub.member_id);
    setYearId(sub.subscription_year_id);
    setAnnualFee(sub.annual_fee);
    setPreviousArrears(sub.previous_arrears);
    setTotalPaid(sub.total_paid);
    setSubStatus(sub.status);
    setFieldErrors({});
    setFormError('');
    setIsSubModalOpen(true);
  };

  // Open Delete Subscription Modal
  const openDeleteSubModal = (sub: MemberSubscription, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubToDelete(sub);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Subscription
  const handleConfirmDelete = async () => {
    if (!subToDelete) return;
    setIsDeleting(true);
    try {
      await db.subscriptions.delete(subToDelete.id);
      showToast('success', '✓ Subscription record deleted successfully.');
      setIsDeleteModalOpen(false);
      setSubToDelete(null);
      if (selectedSubDetails?.id === subToDelete.id) {
        setSelectedSubDetails(null);
      }
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete subscription.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Validate Subscription Form
  const validateSubForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!memberId) {
      errors.memberId = 'Please select a member.';
    }

    if (!yearId) {
      errors.yearId = 'Please select a subscription year.';
    }

    if (annualFee < 0) {
      errors.annualFee = 'Annual fee cannot be negative.';
    }

    if (previousArrears < 0) {
      errors.previousArrears = 'Arrears cannot be negative.';
    }

    if (totalPaid < 0) {
      errors.totalPaid = 'Total paid cannot be negative.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Subscription Form
  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateSubForm()) return;

    setIsSaving(true);

    try {
      const data = {
        member_id: memberId,
        subscription_year_id: yearId,
        annual_fee: Number(annualFee),
        previous_arrears: Number(previousArrears),
        total_paid: Number(totalPaid),
        total_due: Number(annualFee) + Number(previousArrears),
        balance: Number(annualFee) + Number(previousArrears) - Number(totalPaid),
        status: subStatus,
      };

      if (subModalMode === 'add') {
        await db.subscriptions.create(data);
        showToast('success', '✓ Subscription created successfully.');
      } else if (currentSubId) {
        await db.subscriptions.update(currentSubId, data);
        showToast('success', '✓ Subscription updated successfully.');
      }

      setIsSubModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Unable to save subscription. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Configure Year Save
  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setYearError('');

    if (!yearVal || !defaultFee || !startDate || !endDate) {
      setYearError('All fields are required.');
      return;
    }

    setIsSavingYear(true);

    try {
      const newYear = await db.years.create({
        year: Number(yearVal),
        default_fee: Number(defaultFee),
        start_date: startDate,
        end_date: endDate,
        status: 'active',
      });

      showToast('success', `✓ Subscription year ${yearVal} configured successfully.`);
      setIsYearModalOpen(false);
      setSelectedYearId(newYear.id);
      loadData();
    } catch (err: any) {
      setYearError(err.message || 'Failed to configure subscription year.');
    } finally {
      setIsSavingYear(false);
    }
  };

  // Dynamic CSV Report Export
  const handleDownloadReport = () => {
    if (filteredSubscriptions.length === 0) {
      showToast('error', 'No subscription records to export.');
      return;
    }

    setIsExporting(true);

    setTimeout(() => {
      try {
        const selectedYearObj = years.find((y) => y.id === selectedYearId);
        const yearLabel = selectedYearObj ? selectedYearObj.year : 'All_Years';

        const headers = [
          'Subscription ID',
          'Member Name',
          'House Number',
          'Year',
          'Annual Fee (INR)',
          'Previous Arrears (INR)',
          'Total Due (INR)',
          'Total Paid (INR)',
          'Outstanding Balance (INR)',
          'Payment Status',
          'Created Date',
        ];

        const rows = filteredSubscriptions.map((sub) => {
          const mem = members.find((m) => m.id === sub.member_id);
          const house = mem ? households.find((h) => h.id === mem.household_id) : null;
          const yrObj = years.find((y) => y.id === sub.subscription_year_id);

          return [
            `"${sub.id}"`,
            `"${(mem ? mem.name : 'Unknown').replace(/"/g, '""')}"`,
            `"${house ? `H-${house.house_number}` : 'N/A'}"`,
            `"${yrObj ? yrObj.year : 'N/A'}"`,
            sub.annual_fee,
            sub.previous_arrears,
            sub.total_due,
            sub.total_paid,
            sub.balance,
            `"${sub.status.toUpperCase()}"`,
            `"${new Date(sub.created_at).toLocaleDateString()}"`,
          ];
        });

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Mahallu_Subscriptions_Report_${yearLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('success', '✓ Subscriptions Report downloaded successfully!');
      } catch (err) {
        showToast('error', 'Failed to generate report.');
      } finally {
        setIsExporting(false);
      }
    }, 600);
  };

  // Filtered subscriptions list
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const mem = members.find((m) => m.id === sub.member_id);
      const house = mem ? households.find((h) => h.id === mem.household_id) : null;
      const q = searchQuery.toLowerCase().trim();
      
      const matchesSearch =
        !q ||
        (mem && mem.name.toLowerCase().includes(q)) ||
        (house && house.house_number.toLowerCase().includes(q)) ||
        (house && house.house_owner_name.toLowerCase().includes(q));

      const matchesYear = selectedYearId !== 'all' ? sub.subscription_year_id === selectedYearId : true;
      const matchesStatus = selectedStatus ? sub.status === selectedStatus : true;
      const matchesHouse = selectedHouseholdId ? (mem && mem.household_id === selectedHouseholdId) : true;

      return matchesSearch && matchesYear && matchesStatus && matchesHouse;
    });
  }, [subscriptions, members, households, searchQuery, selectedYearId, selectedStatus, selectedHouseholdId]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedHouseholdId('');
  };

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
          <h3>{t('subscription.subscriptionsTitle')}</h3>
          <p className="page-subtitle">Manage annual subscriptions, member ledgers, and rolling arrears balances.</p>
        </div>

        <div className="header-cta-group">
          <button className="configure-btn secondary-btn" onClick={() => {
            setYearVal(new Date().getFullYear());
            setDefaultFee(1000);
            setStartDate(`${new Date().getFullYear()}-01-01`);
            setEndDate(`${new Date().getFullYear()}-12-31`);
            setYearError('');
            setIsYearModalOpen(true);
          }}>
            <Calendar size={16} />
            <span>{t('subscription.configureYear')}</span>
          </button>
          
          <button className="add-btn primary-btn" onClick={openAddSubModal}>
            <Plus size={16} />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="filter-bar glass-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by member name or house number..."
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
            <Calendar size={15} className="select-icon" />
            <select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}>
              <option value="all">Subscription Year: All</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  Year: {y.year} {y.status === 'active' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Home size={15} className="select-icon" />
            <select value={selectedHouseholdId} onChange={(e) => setSelectedHouseholdId(e.target.value)}>
              <option value="">Household: All</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  House No. H-{h.house_number}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Filter size={15} className="select-icon" />
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Status: All</option>
              <option value="paid">{t('subscription.paid')}</option>
              <option value="partially_paid">{t('subscription.partiallyPaid')}</option>
              <option value="unpaid">{t('subscription.unpaid')}</option>
            </select>
          </div>

          <button 
            className="report-export-btn" 
            onClick={handleDownloadReport} 
            disabled={isExporting}
            title="Download Subscriptions CSV Report"
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="spinner-icon" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="subscriptions-content-split">
        {/* SUBSCRIPTIONS TABLE & MOBILE DIRECTORY */}
        <div className={`table-container-card glass-card ${selectedSubDetails ? 'narrow' : ''}`}>
          {loading ? (
            <div className="skeleton-loading-container">
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          ) : subscriptions.length === 0 ? (
            /* EMPTY STATE 1: NO SUBSCRIPTIONS IN DATABASE */
            <div className="empty-state-card">
              <div className="empty-state-icon emerald">
                <FileText size={32} />
              </div>
              <h4>No subscriptions yet</h4>
              <p>Start managing subscription records by creating your first subscription.</p>
              <button className="add-btn primary-btn margin-top" onClick={openAddSubModal}>
                <Plus size={16} />
                <span>Add Subscription</span>
              </button>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            /* EMPTY STATE 2: SEARCH / FILTER RETURNS 0 RESULTS */
            <div className="empty-state-card">
              <div className="empty-state-icon neutral">
                <Search size={32} />
              </div>
              <h4>No matching subscriptions</h4>
              <p>Try changing your search keywords or filter criteria.</p>
              <button className="btn-cancel margin-top" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP & TABLET DATA TABLE */}
              <div className="table-responsive desktop-view-only">
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
                      <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.map((sub) => {
                      const mem = members.find((m) => m.id === sub.member_id);
                      const house = mem ? households.find((h) => h.id === mem.household_id) : null;
                      const isSelected = selectedSubDetails?.id === sub.id;
                      return (
                        <tr
                          key={sub.id}
                          className={`sub-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedSubDetails(sub)}
                        >
                          <td className="bold-text">
                            <div className="member-name-td">
                              <span className="name-text">{mem ? mem.name : 'Unknown'}</span>
                              <span className="rel-sub">{mem ? mem.relationship : ''}</span>
                            </div>
                          </td>
                          <td>
                            {house ? (
                              <span className="house-tag">H-{house.house_number}</span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td>{formatCurrency(sub.annual_fee)}</td>
                          <td className={sub.previous_arrears > 0 ? 'has-arrears-text' : ''}>
                            {formatCurrency(sub.previous_arrears)}
                          </td>
                          <td className="bold-text">{formatCurrency(sub.total_due)}</td>
                          <td className="paid-text">{formatCurrency(sub.total_paid)}</td>
                          <td className={`balance-td ${sub.balance > 0 ? 'outstanding' : 'paid'}`}>
                            {formatCurrency(sub.balance)}
                          </td>
                          <td>
                            <span className={`status-pill ${sub.status}`}>
                              <span className="dot"></span>
                              {t(`subscription.${sub.status === 'paid' ? 'paid' : sub.status === 'partially_paid' ? 'partiallyPaid' : 'unpaid'}`)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="actions-button-wrapper" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="action-icon-btn edit"
                                onClick={(e) => openEditSubModal(sub, e)}
                                title="Edit Subscription"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="action-icon-btn delete"
                                onClick={(e) => openDeleteSubModal(sub, e)}
                                title="Delete Record"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE SUBSCRIPTION CARDS DIRECTORY VIEW */}
              <div className="mobile-cards-directory">
                {filteredSubscriptions.map((sub) => {
                  const mem = members.find((m) => m.id === sub.member_id);
                  const house = mem ? households.find((h) => h.id === mem.household_id) : null;
                  const yrObj = years.find((y) => y.id === sub.subscription_year_id);
                  const isSelected = selectedSubDetails?.id === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className={`mobile-sub-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedSubDetails(sub)}
                    >
                      <div className="card-head">
                        <div className="member-head-info">
                          <h4 className="member-name">{mem ? mem.name : 'Unknown'}</h4>
                          <div className="badges-group">
                            {house && <span className="house-tag">H-{house.house_number}</span>}
                            {yrObj && <span className="year-pill">{yrObj.year}</span>}
                          </div>
                        </div>
                        <span className={`status-pill ${sub.status}`}>
                          <span className="dot"></span>
                          {t(`subscription.${sub.status === 'paid' ? 'paid' : sub.status === 'partially_paid' ? 'partiallyPaid' : 'unpaid'}`)}
                        </span>
                      </div>

                      <div className="card-body">
                        <div className="financial-grid">
                          <div className="fin-item">
                            <span className="fin-label">Annual Fee</span>
                            <span className="fin-val">{formatCurrency(sub.annual_fee)}</span>
                          </div>
                          <div className="fin-item">
                            <span className="fin-label">Arrears</span>
                            <span className={`fin-val ${sub.previous_arrears > 0 ? 'has-arrears-text' : ''}`}>
                              {formatCurrency(sub.previous_arrears)}
                            </span>
                          </div>
                          <div className="fin-item">
                            <span className="fin-label">Paid Amount</span>
                            <span className="fin-val paid-text">{formatCurrency(sub.total_paid)}</span>
                          </div>
                          <div className="fin-item">
                            <span className="fin-label">Outstanding Balance</span>
                            <span className={`fin-val bold-text ${sub.balance > 0 ? 'outstanding' : 'paid'}`}>
                              {formatCurrency(sub.balance)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="card-footer">
                        <span className="sub-id-tag">ID: {sub.id.slice(0, 12)}</span>
                        <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="mobile-action-btn edit" onClick={(e) => openEditSubModal(sub, e)}>
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button className="mobile-action-btn delete" onClick={(e) => openDeleteSubModal(sub, e)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* SELECTED SUBSCRIPTION SUMMARY SIDE PANEL */}
        {selectedSubDetails && (
          <div className="details-panel-card glass-card">
            <div className="panel-header">
              <div className="panel-title-wrapper">
                <div className="panel-icon-box">
                  <CreditCard size={20} color="#00966b" />
                </div>
                <div>
                  <h4>
                    {members.find((m) => m.id === selectedSubDetails.member_id)?.name || 'Subscription Details'}
                  </h4>
                  <p>
                    Year:{' '}
                    {years.find((y) => y.id === selectedSubDetails.subscription_year_id)?.year || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                className="panel-close-btn"
                onClick={() => setSelectedSubDetails(null)}
                aria-label="Close subscription details panel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="panel-body">
              <div className="details-meta-section">
                <div className="meta-item">
                  <span className="meta-label">Annual Fee</span>
                  <span className="meta-value">{formatCurrency(selectedSubDetails.annual_fee)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Previous Arrears</span>
                  <span className="meta-value">{formatCurrency(selectedSubDetails.previous_arrears)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Total Due</span>
                  <span className="meta-value bold-text">{formatCurrency(selectedSubDetails.total_due)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Total Paid</span>
                  <span className="meta-value paid-text">{formatCurrency(selectedSubDetails.total_paid)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Balance Outstanding</span>
                  <span className={`meta-value bold-text ${selectedSubDetails.balance > 0 ? 'outstanding' : 'paid'}`}>
                    {formatCurrency(selectedSubDetails.balance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT SUBSCRIPTION MODAL DIALOG */}
      {isSubModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>{subModalMode === 'add' ? 'Add Subscription' : 'Edit Subscription'}</h4>
                <p className="modal-subtitle">
                  {subModalMode === 'add'
                    ? 'Record an annual subscription ledger entry for a member.'
                    : 'Update subscription fee, arrears, and payment amounts.'}
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsSubModalOpen(false)}
                aria-label="Close Add Subscription dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSub} className="modal-form">
              <div className="form-section-title">Subscription & Member Link</div>

              {formError && (
                <div className="form-alert error">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="sub-year-select">Subscription Year *</label>
                  <select
                    id="sub-year-select"
                    value={yearId}
                    className={fieldErrors.yearId ? 'input-error' : ''}
                    onChange={(e) => {
                      setYearId(e.target.value);
                      if (fieldErrors.yearId) setFieldErrors({ ...fieldErrors, yearId: '' });
                      const yrObj = years.find((y) => y.id === e.target.value);
                      if (yrObj) setAnnualFee(yrObj.default_fee);
                    }}
                  >
                    <option value="">-- Select Year --</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        Year: {y.year} (Fee: ₹{y.default_fee})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.yearId && (
                    <span className="field-error-text">⚠ {fieldErrors.yearId}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="sub-member-select">Member *</label>
                  <select
                    id="sub-member-select"
                    value={memberId}
                    className={fieldErrors.memberId ? 'input-error' : ''}
                    onChange={(e) => {
                      setMemberId(e.target.value);
                      if (fieldErrors.memberId) setFieldErrors({ ...fieldErrors, memberId: '' });
                    }}
                  >
                    <option value="">-- Select Member --</option>
                    {members.map((m) => {
                      const h = households.find((house) => house.id === m.household_id);
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} {h ? `(House H-${h.house_number})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {fieldErrors.memberId && (
                    <span className="field-error-text">⚠ {fieldErrors.memberId}</span>
                  )}
                </div>
              </div>

              <div className="form-section-title margin-top-sm">Financial Amounts</div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="annual-fee-input">Annual Fee (₹) *</label>
                  <input
                    id="annual-fee-input"
                    type="number"
                    required
                    min={0}
                    value={annualFee}
                    className={fieldErrors.annualFee ? 'input-error' : ''}
                    onChange={(e) => setAnnualFee(Number(e.target.value))}
                  />
                  {fieldErrors.annualFee && (
                    <span className="field-error-text">⚠ {fieldErrors.annualFee}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="arrears-input">Previous Arrears (₹)</label>
                  <input
                    id="arrears-input"
                    type="number"
                    min={0}
                    value={previousArrears}
                    className={fieldErrors.previousArrears ? 'input-error' : ''}
                    onChange={(e) => setPreviousArrears(Number(e.target.value))}
                  />
                  {fieldErrors.previousArrears && (
                    <span className="field-error-text">⚠ {fieldErrors.previousArrears}</span>
                  )}
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="paid-input">Total Paid Amount (₹)</label>
                  <input
                    id="paid-input"
                    type="number"
                    min={0}
                    value={totalPaid}
                    className={fieldErrors.totalPaid ? 'input-error' : ''}
                    onChange={(e) => setTotalPaid(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="status-select">Payment Status</label>
                  <select
                    id="status-select"
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value as any)}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsSubModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn submit-pill-btn" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Saving Subscription...</span>
                    </>
                  ) : (
                    <span>{subModalMode === 'add' ? 'Save Subscription' : 'Update Subscription'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE YEAR MODAL DIALOG */}
      {isYearModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>Configure Subscription Year</h4>
                <p className="modal-subtitle">Set up a new active financial period and auto-generate member ledgers.</p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsYearModalOpen(false)}
                aria-label="Close year configuration dialog"
              >
                <X size={20} />
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
                  <label htmlFor="year-val-input">Subscription Year *</label>
                  <input
                    id="year-val-input"
                    type="number"
                    required
                    placeholder="e.g. 2026"
                    value={yearVal}
                    onChange={(e) => setYearVal(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="default-fee-input">Default Annual Fee (₹) *</label>
                  <input
                    id="default-fee-input"
                    type="number"
                    required
                    placeholder="e.g. 1000"
                    value={defaultFee}
                    onChange={(e) => setDefaultFee(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="start-date-input">Start Date *</label>
                  <input
                    id="start-date-input"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end-date-input">End Date *</label>
                  <input
                    id="end-date-input"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
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
                  {isSavingYear ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Configuring Year...</span>
                    </>
                  ) : (
                    <span>Create Subscription Year</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && subToDelete && (
        <div className="modal-overlay">
          <div className="modal-dialog-card delete-card animate-scale-up">
            <div className="modal-header delete-header">
              <div className="delete-badge-icon">
                <Trash2 size={22} color="#dc2626" />
              </div>
              <div>
                <h4>Delete Subscription?</h4>
                <p className="modal-subtitle">
                  Are you sure you want to delete this subscription record for{' '}
                  <strong>{members.find((m) => m.id === subToDelete.member_id)?.name}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-danger-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Subscription</span>
                )}
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
          max-width: 100%;
          box-sizing: border-box;
        }

        /* TOAST NOTIFICATION */
        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 13.5px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        .toast-notification.success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .toast-notification.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .page-header-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          width: 100%;
          box-sizing: border-box;
        }

        .page-header-actions h3 { font-size: 22px; font-weight: 800; color: #111827; }
        .page-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

        .header-cta-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .add-btn.primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: var(--radius-pill);
          background: var(--primary);
          color: #ffffff;
          font-weight: 700;
          font-size: 13.5px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35);
          transition: var(--transition-all);
        }

        .add-btn.primary-btn:hover { background: var(--primary-light); }

        .configure-btn.secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-pill);
          background: #ffffff;
          color: #374151;
          font-weight: 700;
          font-size: 13px;
          border: 1px solid var(--border-color);
          cursor: pointer;
        }

        .configure-btn.secondary-btn:hover { background: #f9fafb; border-color: #d1d5db; }

        /* FILTER BAR */
        .filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          gap: 14px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          flex-wrap: wrap;
          width: 100%;
          box-sizing: border-box;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 260px;
        }

        .search-icon { position: absolute; left: 14px; color: #9ca3af; }

        .search-box input {
          width: 100%;
          padding: 11px 36px 11px 42px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
          transition: var(--transition-all);
        }

        .search-box input:focus {
          outline: none;
          border-color: var(--primary);
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12);
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          background: #e5e7eb;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
          cursor: pointer;
        }

        .filter-selectors-grid {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-icon { position: absolute; left: 14px; color: #9ca3af; pointer-events: none; }

        .filter-select-wrapper select {
          padding: 10px 32px 10px 36px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          background: #f9fafb;
          color: #374151;
          appearance: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }

        .report-export-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: var(--radius-pill);
          background: #ecfdf5;
          color: #00966b;
          border: 1px solid #a7f3d0;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .report-export-btn:hover { background: #d1fae5; }

        /* MAIN CONTENT SPLIT */
        .subscriptions-content-split {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          width: 100%;
          box-sizing: border-box;
        }

        .table-container-card {
          flex: 1;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 20px;
          transition: var(--transition-all);
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .table-container-card.narrow { flex: 1.4; }

        /* DESKTOP TABLE STYLES */
        .desktop-view-only { display: block; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .subscriptions-table { width: 100%; border-collapse: collapse; text-align: left; }

        .subscriptions-table th {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 14px 16px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .subscriptions-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          border-bottom: 1px solid #f3f4f6;
          color: #111827;
        }

        .sub-row { cursor: pointer; transition: var(--transition-all); }
        .sub-row:hover { background-color: #f9fafb; }
        .sub-row.selected { background-color: #ecfdf5; }

        .member-name-td { display: flex; flex-direction: column; }
        .name-text { font-weight: 700; color: #111827; }
        .rel-sub { font-size: 11px; color: #6b7280; margin-top: 1px; }

        .house-tag {
          font-weight: 800;
          color: #00966b;
          background: #ecfdf5;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #a7f3d0;
          font-size: 12.5px;
        }

        .has-arrears-text { color: #dc2626; font-weight: 700; }
        .paid-text { color: #059669; font-weight: 700; }
        .balance-td { font-weight: 800; }
        .balance-td.outstanding { color: #dc2626; }
        .balance-td.paid { color: #059669; }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          text-transform: uppercase;
        }

        .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; }
        .status-pill.paid { background-color: #d1fae5; color: #065f46; }
        .status-pill.paid .dot { background-color: #10b981; }

        .status-pill.partially_paid { background-color: #fef3c7; color: #92400e; }
        .status-pill.partially_paid .dot { background-color: #f59e0b; }

        .status-pill.unpaid { background-color: #fee2e2; color: #991b1b; }
        .status-pill.unpaid .dot { background-color: #ef4444; }

        .actions-button-wrapper { display: flex; gap: 6px; justify-content: flex-end; }

        .action-icon-btn {
          border: 1px solid var(--border-color);
          background: #ffffff;
          color: #6b7280;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .action-icon-btn.edit:hover { background: #ecfdf5; color: #00966b; border-color: #a7f3d0; }
        .action-icon-btn.delete:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        /* MOBILE SUBSCRIPTION CARDS DIRECTORY VIEW */
        .mobile-cards-directory {
          display: none;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
        }

        .mobile-sub-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          box-sizing: border-box;
          width: 100%;
        }

        .mobile-sub-card.selected { border-color: var(--primary); background: #f0fdf4; }
        .mobile-sub-card .card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }

        .member-head-info { display: flex; flex-direction: column; gap: 4px; }
        .badges-group { display: flex; gap: 6px; align-items: center; margin-top: 2px; }

        .year-pill {
          font-size: 11px;
          font-weight: 800;
          color: #4b5563;
          background: #f3f4f6;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .financial-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          background: #f9fafb;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #f3f4f6;
        }

        .fin-item { display: flex; flex-direction: column; gap: 2px; }
        .fin-label { font-size: 11px; color: #6b7280; font-weight: 600; }
        .fin-val { font-size: 12.5px; font-weight: 700; color: #111827; }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid #f3f4f6;
        }

        .sub-id-tag { font-size: 11px; color: #9ca3af; }
        .mobile-card-actions { display: flex; gap: 8px; }

        .mobile-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-color);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .mobile-action-btn.edit { background: #ecfdf5; color: #00966b; border-color: #a7f3d0; }
        .mobile-action-btn.delete { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        /* EMPTY STATES */
        .empty-state-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 48px 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .empty-state-icon {
          width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
        }
        .empty-state-icon.emerald { background: #ecfdf5; color: #00966b; }
        .empty-state-icon.neutral { background: #f3f4f6; color: #6b7280; }

        .empty-state-card h4 { font-size: 18px; font-weight: 800; color: #111827; }
        .empty-state-card p { font-size: 13px; color: #6b7280; margin-top: 4px; max-width: 320px; }
        .margin-top { margin-top: 16px; }

        /* DETAILS SUMMARY PANEL */
        .details-panel-card {
          flex: 1;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 20px;
          position: sticky;
          top: 94px;
          box-sizing: border-box;
          width: 100%;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 14px;
          margin-bottom: 16px;
        }

        .panel-title-wrapper { display: flex; align-items: center; gap: 10px; }
        .panel-icon-box {
          width: 40px; height: 40px; background: #ecfdf5; border-radius: 12px; display: flex; align-items: center; justify-content: center;
        }
        .panel-title-wrapper h4 { font-size: 16px; font-weight: 800; color: #111827; }
        .panel-title-wrapper p { font-size: 12px; color: #6b7280; }
        .panel-close-btn { background: transparent; border: none; color: #9ca3af; cursor: pointer; }

        .details-meta-section {
          background: #f9fafb;
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border: 1px solid #f3f4f6;
        }

        .meta-item { display: flex; justify-content: space-between; align-items: center; }
        .meta-label { font-size: 12px; color: #6b7280; font-weight: 600; }
        .meta-value { font-size: 13px; font-weight: 700; color: #111827; }

        /* MODAL DIALOGS */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(17, 24, 39, 0.55);
          backdrop-filter: blur(4px);
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }

        .modal-dialog-card {
          width: 100%;
          max-width: 560px;
          background: #ffffff;
          border-radius: var(--radius-xl);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          border: 1px solid var(--border-color);
          box-sizing: border-box;
        }

        .modal-header {
          padding: 18px 20px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .modal-header h4 { font-size: 17px; font-weight: 800; color: #111827; }
        .modal-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .modal-close-btn { background: transparent; border: none; color: #9ca3af; cursor: pointer; }

        .modal-form { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .form-section-title { font-size: 11px; font-weight: 800; color: #00966b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
        .margin-top-sm { margin-top: 6px; }

        .form-row-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12.5px; font-weight: 700; color: #374151; }

        .form-group input, .form-group select {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
        }

        .form-group input:focus, .form-group select:focus {
          outline: none; border-color: var(--primary); background: #ffffff; box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12);
        }

        .input-error { border-color: #ef4444 !important; background: #fff5f5 !important; }
        .field-error-text { font-size: 11px; font-weight: 600; color: #dc2626; }

        .form-alert { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px; }
        .form-alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e5e7eb; }

        .btn-cancel { background: #f3f4f6; border: 1px solid var(--border-color); color: #374151; padding: 10px 18px; border-radius: var(--radius-pill); font-weight: 700; cursor: pointer; }
        .submit-pill-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: var(--radius-pill); background: var(--primary); color: #ffffff; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35); }

        .spinner-icon { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* DELETE DIALOG */
        .delete-card { max-width: 440px; }
        .delete-header { display: flex; gap: 12px; align-items: flex-start; }
        .delete-badge-icon { width: 42px; height: 42px; background: #fee2e2; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .delete-danger-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: var(--radius-pill); background: #dc2626; color: #ffffff; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35); }

        /* ── RESPONSIVE STYLES FOR SAMSUNG GALAXY S8 & SMALL SMARTPHONES ── */
        @media (max-width: 991px) {
          .subscriptions-content-split { flex-direction: column; }
          .details-panel-card { width: 100%; position: relative; top: 0; }
        }

        @media (max-width: 768px) {
          .page-header-actions { flex-direction: column; align-items: stretch; gap: 12px; }
          .header-cta-group { width: 100%; flex-direction: column; }
          .add-btn.primary-btn, .configure-btn.secondary-btn { width: 100%; justify-content: center; }

          .filter-bar { flex-direction: column; align-items: stretch; padding: 14px; gap: 12px; }
          .search-box { width: 100%; min-width: 0; }

          .filter-selectors-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            width: 100%;
          }

          .filter-select-wrapper select, .report-export-btn {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }

        @media (max-width: 640px) {
          .desktop-view-only { display: none; }
          .mobile-cards-directory { display: flex; }

          .filter-selectors-grid { grid-template-columns: 1fr; }
          .form-row-grid { grid-template-columns: 1fr; }

          .modal-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .modal-dialog-card {
            border-radius: 20px 20px 0 0;
            max-height: 90vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Subscriptions;
