import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db, sanitizeUuid } from '../../services/db';
import type { Household, Member, MemberSubscription, Payment, SubscriptionYear } from '../../services/db';
import { 
  Plus, Edit2, Trash2, Search, Filter, Receipt, X, AlertCircle, 
  CheckCircle, Download, Loader2, Home, FileSpreadsheet, Upload
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { SidePanel } from '../../components/SidePanel';
import { Modal } from '../../components/Modal';

export const Payments: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Data States
  const [payments, setPayments] = useState<Payment[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');

  // Add / Edit Payment Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);
  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const downloadPaymentSampleCSV = () => {
    const csvHeader = 'receipt_number,member_name,household_number,amount,payment_date,payment_method,transaction_id,category,status\n';
    const csvSample = 'PAY-2026-001,Abubakar Siddique,H-1,1200,2026-07-28,upi,TXN98765432,Annual Subscription,completed\nPAY-2026-002,Usman Ghani,H-2,500,2026-07-29,cash,,Monthly Fee,completed\n';
    const blob = new Blob([csvHeader + csvSample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments_sample_template.csv';
    a.click();
    showToast('success', 'Sample CSV template downloaded!');
  };

  // Payment Form Fields
  const [formHouseholdId, setFormHouseholdId] = useState('');
  const [formMemberId, setFormMemberId] = useState('');
  const [formYearId, setFormYearId] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formMethod, setFormMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'other'>('cash');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRefNumber, setFormRefNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form Validation & Saving States
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Payment Details Panel
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<Payment | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [payList, houseList, memberList, yearList, subList] = await Promise.all([
        db.payments.get(),
        db.households.get(),
        db.members.get(),
        db.years.get(),
        db.subscriptions.get(),
      ]);
      setPayments(payList);
      setHouseholds(houseList);
      setMembers(memberList);
      setYears(yearList);
      setSubscriptions(subList);
    } catch (err) {
      console.error('Failed to load payments page data:', err);
      showToast('error', 'Unable to load payment records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update member selection list when household is selected in form
  useEffect(() => {
    if (formHouseholdId) {
      const houseMembers = members.filter((m) => m.household_id === formHouseholdId && m.status === 'active');
      if (houseMembers.length > 0) {
        setFormMemberId(houseMembers[0].id);
      } else {
        setFormMemberId('');
      }
    } else {
      setFormMemberId('');
    }
  }, [formHouseholdId, members]);

  // Update suggested amount when member and year are selected in form
  useEffect(() => {
    if (formMemberId && formYearId && modalMode === 'add') {
      const sub = subscriptions.find(
        (s) => s.member_id === formMemberId && s.subscription_year_id === formYearId
      );
      if (sub) {
        setFormAmount(sub.balance > 0 ? sub.balance : sub.annual_fee);
      }
    }
  }, [formMemberId, formYearId, subscriptions, modalMode]);

  // Open Record Add Modal
  const openRecordModal = () => {
    setModalMode('add');
    setCurrentPaymentId(null);
    const firstHouseId = households[0]?.id || '';
    setFormHouseholdId(firstHouseId);
    const activeYr = years.find((y) => y.status === 'active') || years[0];
    setFormYearId(activeYr?.id || '');
    setFormMethod('cash');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRefNumber('');
    setFormNotes('');
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Payment Modal
  const openEditModal = (pay: Payment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const mem = members.find((m) => m.id === pay.member_id);
    const sub = subscriptions.find((s) => s.id === pay.subscription_id);

    setModalMode('edit');
    setCurrentPaymentId(pay.id);
    setFormHouseholdId(mem ? mem.household_id : '');
    setFormMemberId(pay.member_id);
    setFormYearId(sub ? sub.subscription_year_id : '');
    setFormAmount(pay.amount);
    setFormMethod(pay.payment_method);
    setFormDate(pay.payment_date);
    setFormRefNumber(pay.reference_number || '');
    setFormNotes(pay.notes || '');
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (pay: Payment, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentToDelete(pay);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Payment
  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    setIsDeleting(true);
    try {
      await db.payments.delete(paymentToDelete.id);
      showToast('success', '✓ Payment record deleted successfully.');
      setIsDeleteModalOpen(false);
      setPaymentToDelete(null);
      if (selectedPaymentDetails?.id === paymentToDelete.id) {
        setSelectedPaymentDetails(null);
      }
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete payment record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Validate Form Fields
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formHouseholdId) {
      errors.household = 'Please select a household.';
    }

    if (!formMemberId) {
      errors.member = 'Please select a member.';
    }

    if (!formYearId) {
      errors.year = 'Please select a subscription year.';
    }

    if (!formAmount || formAmount <= 0) {
      errors.amount = 'Payment amount must be greater than zero.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Payment Form
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const sub = subscriptions.find(
        (s) => s.member_id === formMemberId && s.subscription_year_id === formYearId
      );

      if (!sub && modalMode === 'add') {
        setFormError('No subscription ledger found for the selected member in this year.');
        setIsSaving(false);
        return;
      }

      const data = {
        member_id: formMemberId,
        subscription_id: sub ? sub.id : (subscriptions[0]?.id || ''),
        amount: Number(formAmount),
        payment_method: formMethod,
        payment_date: formDate,
        reference_number: formRefNumber.trim() || null,
        notes: formNotes.trim() || null,
        recorded_by: sanitizeUuid(user?.id),
      };

      if (modalMode === 'add') {
        await db.payments.create(data);
        showToast('success', '✓ Payment recorded successfully.');
      } else if (currentPaymentId) {
        await db.payments.update(currentPaymentId, data);
        showToast('success', '✓ Payment updated successfully.');
      }

      setIsModalOpen(false);
      loadData();

      if (selectedPaymentDetails && selectedPaymentDetails.id === currentPaymentId) {
        const updatedP = await db.payments.getById(currentPaymentId);
        setSelectedPaymentDetails(updatedP);
      }
    } catch (err: any) {
      setFormError(err.message || 'Unable to save payment record. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic CSV Report Export
  const handleDownloadReport = () => {
    if (filteredPayments.length === 0) {
      showToast('error', 'No payment records to export.');
      return;
    }

    setIsExporting(true);

    setTimeout(() => {
      try {
        const headers = [
          'Payment ID',
          'Payment Date',
          'Member Name',
          'House Number',
          'Amount (INR)',
          'Payment Method',
          'Reference Number',
          'Notes',
          'Recorded Date',
        ];

        const rows = filteredPayments.map((pay) => {
          const mem = members.find((m) => m.id === pay.member_id);
          const house = mem ? households.find((h) => h.id === mem.household_id) : null;

          return [
            `"${pay.id}"`,
            `"${new Date(pay.payment_date).toLocaleDateString()}"`,
            `"${(mem ? mem.name : 'Unknown').replace(/"/g, '""')}"`,
            `"${house ? `H-${house.house_number}` : 'N/A'}"`,
            pay.amount,
            `"${pay.payment_method.toUpperCase()}"`,
            `"${(pay.reference_number || '').replace(/"/g, '""')}"`,
            `"${(pay.notes || '').replace(/"/g, '""')}"`,
            `"${new Date(pay.created_at).toLocaleDateString()}"`,
          ];
        });

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Mahallu_Payments_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('success', '✓ Payments Report downloaded successfully!');
      } catch (err) {
        showToast('error', 'Failed to generate report.');
      } finally {
        setIsExporting(false);
      }
    }, 600);
  };

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((pay) => {
      const mem = members.find((m) => m.id === pay.member_id);
      const house = mem ? households.find((h) => h.id === mem.household_id) : null;
      const q = searchQuery.toLowerCase().trim();
      
      const matchesSearch =
        !q ||
        (mem && mem.name.toLowerCase().includes(q)) ||
        (house && house.house_number.toLowerCase().includes(q)) ||
        (pay.reference_number && pay.reference_number.toLowerCase().includes(q)) ||
        (pay.notes && pay.notes.toLowerCase().includes(q));

      const matchesMethod = selectedMethod ? pay.payment_method === selectedMethod : true;
      const matchesHouse = selectedHouseholdId ? (mem && mem.household_id === selectedHouseholdId) : true;
      const sub = subscriptions.find((s) => s.id === pay.subscription_id);
      const matchesYear = selectedYearId ? (sub && sub.subscription_year_id === selectedYearId) : true;

      return matchesSearch && matchesMethod && matchesHouse && matchesYear;
    });
  }, [payments, members, households, subscriptions, searchQuery, selectedMethod, selectedHouseholdId, selectedYearId]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMethod('');
    setSelectedHouseholdId('');
    setSelectedYearId('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="payments-page animate-fade-in">
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
          <h3>{t('payment.paymentsTitle')}</h3>
          <p className="page-subtitle">Record offline receipts & track payment entries.</p>
        </div>

        <div className="header-cta-group flex-row-gap-sm">
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={() => setIsImportModalOpen(true)}>
            <FileSpreadsheet size={15} className="text-emerald" />
            <span>Import Data</span>
          </button>
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={handleDownloadReport} title="Export CSV Report">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button className="add-btn primary-btn" onClick={openRecordModal}>
            <Plus size={16} />
            <span>{t('payment.recordPayment')}</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="filter-bar glass-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search member name, house no, or receipt ref..."
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
          <YearFilter
            selectedYearId={selectedYearId}
            onChange={setSelectedYearId}
            years={years}
            showAllOption={true}
          />
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
            <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
              <option value="">Method: All</option>
              <option value="cash">{t('payment.cash')}</option>
              <option value="upi">{t('payment.upi')}</option>
              <option value="bank_transfer">{t('payment.bankTransfer')}</option>
              <option value="other">{t('payment.other')}</option>
            </select>
          </div>

          <button 
            className="report-export-btn" 
            onClick={handleDownloadReport} 
            disabled={isExporting}
            title="Download Payments CSV Report"
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

          {(searchQuery || selectedMethod || selectedHouseholdId) && (
            <button className="clear-filters-link" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="payments-content-split">
        {/* TRANSACTIONS TABLE & MOBILE DIRECTORY */}
        <div className={`table-container-card glass-card ${selectedPaymentDetails ? 'narrow' : ''}`}>
          {loading ? (
            <div className="skeleton-loading-container">
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          ) : payments.length === 0 ? (
            /* EMPTY STATE 1: NO PAYMENTS IN DATABASE */
            <div className="empty-state-card">
              <div className="empty-state-icon emerald">
                <Receipt size={32} />
              </div>
              <h4>No payments yet</h4>
              <p>Payment transactions will appear here once they are recorded.</p>
              <button className="add-btn primary-btn margin-top" onClick={openRecordModal}>
                <Plus size={16} />
                <span>Record Payment</span>
              </button>
            </div>
          ) : filteredPayments.length === 0 ? (
            /* EMPTY STATE 2: SEARCH / FILTER RETURNS 0 RESULTS */
            <div className="empty-state-card">
              <div className="empty-state-icon neutral">
                <Search size={32} />
              </div>
              <h4>No matching payments</h4>
              <p>Try changing your search keywords or filter criteria.</p>
              <button className="btn-cancel margin-top" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP & TABLET DATA TABLE */}
              <div className="table-responsive desktop-view-only">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>{t('payment.paymentDate')}</th>
                      <th>{t('member.memberName')}</th>
                      <th>{t('household.houseNumber')}</th>
                      <th>{t('payment.amount')}</th>
                      <th>{t('payment.paymentMethod')}</th>
                      <th>{t('payment.referenceNumber')}</th>
                      <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((pay) => {
                      const mem = members.find((m) => m.id === pay.member_id);
                      const house = mem ? households.find((h) => h.id === mem.household_id) : null;
                      const isSelected = selectedPaymentDetails?.id === pay.id;

                      return (
                        <tr
                          key={pay.id}
                          className={`payment-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedPaymentDetails(pay)}
                        >
                          <td className="bold-text">
                            {new Date(pay.payment_date).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="member-name-td">
                              <span className="name-text">{mem ? mem.name : 'Unknown'}</span>
                              {mem && <span className="rel-sub">{mem.relationship}</span>}
                            </div>
                          </td>
                          <td>
                            {house ? (
                              <span className="house-tag">H-{house.house_number}</span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="amount-text">{formatCurrency(pay.amount)}</td>
                          <td>
                            <span className={`method-badge ${pay.payment_method}`}>
                              {t(`payment.${pay.payment_method}`)}
                            </span>
                          </td>
                          <td>{pay.reference_number || '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="actions-button-wrapper" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="action-icon-btn edit"
                                onClick={(e) => openEditModal(pay, e)}
                                title={t('common.edit')}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="action-icon-btn delete"
                                onClick={(e) => openDeleteModal(pay, e)}
                                title="Delete Payment"
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

              {/* MOBILE PAYMENT CARDS DIRECTORY VIEW */}
              <div className="mobile-cards-directory">
                {filteredPayments.map((pay) => {
                  const mem = members.find((m) => m.id === pay.member_id);
                  const house = mem ? households.find((h) => h.id === mem.household_id) : null;
                  const isSelected = selectedPaymentDetails?.id === pay.id;

                  return (
                    <div
                      key={pay.id}
                      className={`mobile-payment-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedPaymentDetails(pay)}
                    >
                      <div className="card-head">
                        <div>
                          <h4 className="member-name">{mem ? mem.name : 'Unknown'}</h4>
                          <span className="pay-date">{new Date(pay.payment_date).toLocaleDateString()}</span>
                        </div>
                        <span className={`method-badge ${pay.payment_method}`}>
                          {t(`payment.${pay.payment_method}`)}
                        </span>
                      </div>

                      <div className="card-body">
                        <div className="card-info-row">
                          {house && <span className="house-tag">House No. H-{house.house_number}</span>}
                          <span className="card-amount">{formatCurrency(pay.amount)}</span>
                        </div>
                        {pay.reference_number && (
                          <div className="card-info-row text-sm color-muted">
                            <span>Ref: {pay.reference_number}</span>
                          </div>
                        )}
                      </div>

                      <div className="card-footer">
                        <span className="sub-id-tag">ID: {pay.id.slice(0, 12)}</span>
                        <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="mobile-action-btn edit" onClick={(e) => openEditModal(pay, e)}>
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button className="mobile-action-btn delete" onClick={(e) => openDeleteModal(pay, e)}>
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
      </div>

      {/* PAYMENT DETAILS SIDE PANEL */}
      <SidePanel
        isOpen={Boolean(selectedPaymentDetails)}
        onClose={() => setSelectedPaymentDetails(null)}
        title="Payment Receipt Details"
        subtitle={selectedPaymentDetails ? new Date(selectedPaymentDetails.payment_date).toLocaleDateString() : ''}
        icon={<Receipt size={20} />}
        size="md"
      >
        {selectedPaymentDetails && (
          <div className="details-meta-section flex-col gap-md">
            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box emerald">
                <Receipt size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Amount Paid</span>
                <h3 className="metric-value text-success">{formatCurrency(selectedPaymentDetails.amount)}</h3>
                <span className="metric-sub">{selectedPaymentDetails.payment_method.toUpperCase()} Transaction</span>
              </div>
            </div>

            <div className="form-card">
              <div className="meta-item margin-bottom-sm">
                <span className="form-label">Payer Member</span>
                <div className="font-weight-700 font-md text-dark">
                  {members.find((m) => m.id === selectedPaymentDetails.member_id)?.name || 'Unknown Member'}
                </div>
              </div>
              <div className="meta-item margin-bottom-sm">
                <span className="form-label">Payment Method</span>
                <span className={`status-pill ${selectedPaymentDetails.payment_method}`}>
                  {selectedPaymentDetails.payment_method.toUpperCase()}
                </span>
              </div>
              <div className="meta-item margin-bottom-sm">
                <span className="form-label">Reference Number</span>
                <div className="font-weight-600 font-sm">{selectedPaymentDetails.reference_number || 'N/A'}</div>
              </div>
              <div className="meta-item">
                <span className="form-label">Remarks / Notes</span>
                <div className="font-sm color-subtle">{selectedPaymentDetails.notes || 'No special notes attached.'}</div>
              </div>
            </div>
          </div>
        )}
      </SidePanel>

      {/* RECORD / EDIT PAYMENT RIGHT SIDE PANEL */}
      <SidePanel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? t('payment.recordPayment') : 'Edit Payment Record'}
        subtitle={modalMode === 'add' ? 'Record a new offline or online receipt transaction.' : 'Update existing payment receipt details.'}
        icon={<Receipt size={20} />}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="pill-btn-ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payment-panel-form"
              className="pill-btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Saving Payment...</span>
                </>
              ) : (
                <span>{modalMode === 'add' ? 'Record Payment' : 'Update Record'}</span>
              )}
            </button>
          </>
        }
      >
        <form id="payment-panel-form" onSubmit={handleSavePayment} className="flex-col gap-md">
          {formError && (
            <div className="form-alert error">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-grid-2col">
            <div className="form-group">
              <label htmlFor="modal-house-select" className="form-label">{t('payment.chooseHousehold')} *</label>
              <select
                id="modal-house-select"
                value={formHouseholdId}
                className={`form-control ${fieldErrors.household ? 'is-invalid' : ''}`}
                onChange={(e) => {
                  setFormHouseholdId(e.target.value);
                  if (fieldErrors.household) setFieldErrors({ ...fieldErrors, household: '' });
                }}
              >
                <option value="">-- Select Household --</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    House No. H-{h.house_number} ({h.house_owner_name})
                  </option>
                ))}
              </select>
              {fieldErrors.household && <span className="field-error-text">⚠ {fieldErrors.household}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="modal-member-select" className="form-label">{t('payment.chooseMember')} *</label>
              <select
                id="modal-member-select"
                value={formMemberId}
                disabled={!formHouseholdId}
                className={`form-control ${fieldErrors.member ? 'is-invalid' : ''}`}
                onChange={(e) => {
                  setFormMemberId(e.target.value);
                  if (fieldErrors.member) setFieldErrors({ ...fieldErrors, member: '' });
                }}
              >
                <option value="">-- Select Member --</option>
                {members
                  .filter((m) => m.household_id === formHouseholdId && m.status === 'active')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.relationship})
                    </option>
                  ))}
              </select>
              {fieldErrors.member && <span className="field-error-text">⚠ {fieldErrors.member}</span>}
            </div>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label htmlFor="modal-year-select" className="form-label">{t('payment.chooseYear')} *</label>
              <select
                id="modal-year-select"
                value={formYearId}
                className={`form-control ${fieldErrors.year ? 'is-invalid' : ''}`}
                onChange={(e) => {
                  setFormYearId(e.target.value);
                  if (fieldErrors.year) setFieldErrors({ ...fieldErrors, year: '' });
                }}
              >
                <option value="">-- Select Year --</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    Year: {y.year} (Default Fee: ₹{y.default_fee})
                  </option>
                ))}
              </select>
              {fieldErrors.year && <span className="field-error-text">⚠ {fieldErrors.year}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="modal-amount-input" className="form-label">{t('payment.amountLabel')} (₹) *</label>
              <input
                id="modal-amount-input"
                type="number"
                required
                min={1}
                value={formAmount}
                className={`form-control font-weight-700 text-success ${fieldErrors.amount ? 'is-invalid' : ''}`}
                onChange={(e) => setFormAmount(Number(e.target.value))}
              />
              {fieldErrors.amount && <span className="field-error-text">⚠ {fieldErrors.amount}</span>}
            </div>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label htmlFor="modal-method-select" className="form-label">{t('payment.paymentMethod')} *</label>
              <select
                id="modal-method-select"
                className="form-control"
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as any)}
              >
                <option value="cash">{t('payment.cash')}</option>
                <option value="upi">{t('payment.upi')}</option>
                <option value="bank_transfer">{t('payment.bankTransfer')}</option>
                <option value="other">{t('payment.other')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="modal-date-input" className="form-label">{t('payment.paymentDate')} *</label>
              <input
                id="modal-date-input"
                type="date"
                required
                className="form-control"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="modal-ref-input" className="form-label">{t('payment.referenceNumber')}</label>
            <input
              id="modal-ref-input"
              type="text"
              className="form-control"
              placeholder="e.g. REC-2026-089 or UPI UTR No."
              value={formRefNumber}
              onChange={(e) => setFormRefNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-notes-input" className="form-label">{t('payment.notes')}</label>
            <textarea
              id="modal-notes-input"
              className="form-control"
              rows={2}
              placeholder="Optional receipt notes..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>
        </form>
      </SidePanel>

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && paymentToDelete && (
        <div className="modal-overlay">
          <div className="modal-dialog-card delete-card animate-scale-up">
            <div className="delete-card-body">
              <div className="delete-header">
                <div className="delete-badge-icon">
                  <Trash2 size={22} color="#dc2626" />
                </div>
                <div>
                  <h4>Delete Payment Record?</h4>
                  <p className="delete-subtitle">
                    Are you sure you want to delete payment receipt of{' '}
                    <strong>{formatCurrency(paymentToDelete.amount)}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="delete-actions">
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
                    <span>Delete Payment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .payments-page {
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
          padding: 10px 36px 10px 48px;
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

        .clear-filters-link {
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          padding: 6px 12px;
        }

        /* MAIN CONTENT SPLIT */
        .payments-content-split {
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
        .payments-table { width: 100%; border-collapse: collapse; text-align: left; }

        .payments-table th {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 14px 16px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .payments-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          border-bottom: 1px solid #f3f4f6;
          color: #111827;
        }

        .payment-row { cursor: pointer; transition: var(--transition-all); }
        .payment-row:hover { background-color: #f9fafb; }
        .payment-row.selected { background-color: #ecfdf5; }

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

        .amount-text { font-weight: 800; color: #00966b; }

        .method-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          text-transform: uppercase;
        }

        .method-badge.cash { background: #ecfdf5; color: #047857; }
        .method-badge.upi { background: #eff6ff; color: #1d4ed8; }
        .method-badge.bank_transfer { background: #f5f3ff; color: #6d28d9; }
        .method-badge.other { background: #fffbeb; color: #b45309; }

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

        /* MOBILE PAYMENT CARDS DIRECTORY VIEW */
        .mobile-cards-directory {
          display: none;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
        }

        .mobile-payment-card {
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

        .mobile-payment-card.selected { border-color: var(--primary); background: #f0fdf4; }
        .mobile-payment-card .card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }

        .member-name { font-size: 16px; font-weight: 800; color: #111827; }
        .pay-date { font-size: 11.5px; color: #6b7280; }

        .card-info-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; }
        .card-amount { font-size: 16px; font-weight: 800; color: #00966b; }

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
        .amount-highlight { font-size: 16px; font-weight: 800; color: #00966b; }

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

        .form-group input, .form-group select, .form-group textarea {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
        }

        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
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

        /* DELETE DIALOG REDESIGN */
        .delete-card { max-width: 480px; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); overflow: hidden; padding: 24px; border: 1px solid var(--border-color); }
        .delete-card-body { display: flex; flex-direction: column; gap: 20px; }
        .delete-header { display: flex; gap: 16px; align-items: flex-start; }
        .delete-badge-icon { width: 44px; height: 44px; background: #fee2e2; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .delete-header h4 { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 6px 0; }
        .delete-subtitle { font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0; }
        .delete-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 6px; }
        .delete-danger-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 22px; border-radius: var(--radius-pill); background: #dc2626; color: #ffffff; font-weight: 700; font-size: 13.5px; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35); transition: var(--transition-all); }
        .delete-danger-btn:hover { background: #b91c1c; }

        /* ── RESPONSIVE STYLES FOR SAMSUNG GALAXY S8 & SMALL SMARTPHONES ── */
        @media (max-width: 991px) {
          .payments-content-split { flex-direction: column; }
          .details-panel-card { width: 100%; position: relative; top: 0; }
        }

        @media (max-width: 768px) {
          .page-header-actions { flex-direction: column; align-items: stretch; gap: 12px; }
          .add-btn.primary-btn { width: 100%; justify-content: center; }

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

      {/* IMPORT EXCEL / CSV MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Payment Receipts"
        subtitle="Batch import payment entries using Excel or CSV file."
        icon={<FileSpreadsheet size={20} className="text-emerald" />}
        size="md"
        footer={
          <div className="flex-between width-100 align-items-center">
            <button
              type="button"
              className="pill-btn-ghost font-xs flex-row-gap-xs"
              onClick={downloadPaymentSampleCSV}
            >
              <Download size={14} /> Download Sample Template
            </button>
            <button
              type="button"
              className="pill-btn-primary font-xs"
              onClick={() => {
                showToast('success', 'Demo mode: Upload formatted CSV matching sample template.');
                setIsImportModalOpen(false);
              }}
            >
              Import File
            </button>
          </div>
        }
      >
        <div className="flex-col gap-md">
          <div className="form-card bg-emerald-soft" style={{ padding: '16px', borderRadius: '12px' }}>
            <div className="flex-row-gap-sm align-items-center">
              <FileSpreadsheet size={24} className="text-emerald" />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Excel / CSV Import Format</h4>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#475569' }}>
                  Ensure your file includes columns: <code>receipt_number</code>, <code>member_name</code>, <code>amount</code>, <code>payment_date</code>, <code>payment_method</code>.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '14px',
              padding: '32px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv, .xlsx, .xls';
              input.onchange = (e: any) => {
                const file = e.target?.files?.[0];
                if (file) {
                  showToast('success', `Selected file: ${file.name}`);
                }
              };
              input.click();
            }}
          >
            <Upload size={32} className="text-muted margin-bottom-xs" />
            <div className="font-weight-700 font-sm text-dark">Click to browse or drag & drop CSV file</div>
            <span className="font-xs color-subtle">Supports .csv and .xlsx spreadsheets up to 10MB</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payments;
