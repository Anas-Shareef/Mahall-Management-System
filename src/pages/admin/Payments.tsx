import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { Household, Member, MemberSubscription, Payment, SubscriptionYear } from '../../services/db';
import { Plus, Search, Filter, X, AlertCircle, CheckCircle } from 'lucide-react';

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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payment Form Fields
  const [formHouseholdId, setFormHouseholdId] = useState('');
  const [formMemberId, setFormMemberId] = useState('');
  const [formYearId, setFormYearId] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formMethod, setFormMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'other'>('cash');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRefNumber, setFormRefNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');

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
    if (formMemberId && formYearId) {
      const sub = subscriptions.find(
        (s) => s.member_id === formMemberId && s.subscription_year_id === formYearId
      );
      if (sub) {
        // Suggest outstanding balance
        setFormAmount(sub.balance);
      } else {
        setFormAmount(0);
      }
    } else {
      setFormAmount(0);
    }
  }, [formMemberId, formYearId, subscriptions]);

  const openRecordModal = () => {
    setFormError('');
    setSuccessMsg('');
    setFormHouseholdId(households[0]?.id || '');
    // Member will auto-update in useEffect
    const activeYr = years.find((y) => y.status === 'active') || years[0];
    setFormYearId(activeYr?.id || '');
    setFormMethod('cash');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRefNumber('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!formMemberId || !formYearId || formAmount <= 0) {
      setFormError('Member, subscription year, and a valid positive amount are required.');
      return;
    }

    // Find subscription ID
    const sub = subscriptions.find(
      (s) => s.member_id === formMemberId && s.subscription_year_id === formYearId
    );

    if (!sub) {
      setFormError('No subscription ledger found for the selected member in this year.');
      return;
    }

    try {
      const recordedPayment = await db.payments.create({
        member_id: formMemberId,
        subscription_id: sub.id,
        amount: Number(formAmount),
        payment_method: formMethod,
        payment_date: formDate,
        reference_number: formRefNumber || null,
        notes: formNotes || null,
        recorded_by: user?.id || null,
      });

      const memberObj = members.find((m) => m.id === formMemberId);
      setSuccessMsg(
        t('payment.paymentSuccess', {
          amount: recordedPayment.amount,
          member: memberObj ? memberObj.name : 'Member',
        })
      );
      
      // Refresh list after 1s and close
      setTimeout(() => {
        setIsModalOpen(false);
        loadData();
      }, 1000);

    } catch (err: any) {
      setFormError(err.message || 'An error occurred recording payment.');
    }
  };

  // Filtered Payments
  const filteredPayments = payments.filter((pay) => {
    const mem = members.find((m) => m.id === pay.member_id);
    const house = mem ? households.find((h) => h.id === mem.household_id) : null;
    
    const matchesSearch =
      (mem && mem.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (house && house.house_number.includes(searchQuery)) ||
      (pay.reference_number && pay.reference_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMethod = selectedMethod ? pay.payment_method === selectedMethod : true;

    return matchesSearch && matchesMethod;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="payments-page">
      <div className="page-header-actions">
        <h3>{t('payment.paymentsTitle')}</h3>
        <button className="add-btn primary-btn" onClick={openRecordModal}>
          <Plus size={16} />
          <span>{t('payment.recordPayment')}</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar glass-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by member name, house number, receipt reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-selectors">
          <div className="filter-select-wrapper">
            <Filter size={16} className="select-icon" />
            <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
              <option value="">Method: All</option>
              <option value="cash">{t('payment.cash')}</option>
              <option value="upi">{t('payment.upi')}</option>
              <option value="bank_transfer">{t('payment.bankTransfer')}</option>
              <option value="other">{t('payment.other')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="table-container-card glass-card">
        {loading ? (
          <div className="loading-text">{t('common.loading')}</div>
        ) : (
          <div className="table-responsive">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t('payment.paymentDate')}</th>
                  <th>{t('member.memberName')}</th>
                  <th>{t('household.houseNumber')}</th>
                  <th>{t('payment.amount')}</th>
                  <th>{t('payment.paymentMethod')}</th>
                  <th>{t('payment.referenceNumber')}</th>
                  <th>{t('payment.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data-cell">{t('common.noData')}</td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => {
                    const mem = members.find((m) => m.id === pay.member_id);
                    const house = mem ? households.find((h) => h.id === mem.household_id) : null;
                    return (
                      <tr key={pay.id}>
                        <td className="bold-text">{new Date(pay.payment_date).toLocaleDateString()}</td>
                        <td>{mem ? mem.name : 'Unknown'}</td>
                        <td>{house ? `House No. ${house.house_number}` : 'N/A'}</td>
                        <td className="amount-text">{formatCurrency(pay.amount)}</td>
                        <td>
                          <span className={`method-badge ${pay.payment_method}`}>
                            {t(`payment.${pay.payment_method}`)}
                          </span>
                        </td>
                        <td>{pay.reference_number || '—'}</td>
                        <td className="notes-td">{pay.notes || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container animate-fade-in">
            <div className="modal-header">
              <h4>{t('payment.recordPayment')}</h4>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSavePayment} className="modal-form">
              {formError && (
                <div className="form-alert error">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}
              {successMsg && (
                <div className="form-alert success">
                  <CheckCircle size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="modal-house-select">{t('payment.chooseHousehold')} *</label>
                  <select
                    id="modal-house-select"
                    value={formHouseholdId}
                    onChange={(e) => setFormHouseholdId(e.target.value)}
                  >
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>House No. {h.house_number} ({h.house_owner_name})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="modal-member-select">{t('payment.chooseMember')} *</label>
                  <select
                    id="modal-member-select"
                    value={formMemberId}
                    onChange={(e) => setFormMemberId(e.target.value)}
                    disabled={!formHouseholdId}
                  >
                    {members.filter(m => m.household_id === formHouseholdId && m.status === 'active').map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="modal-year-select">{t('payment.chooseYear')} *</label>
                  <select
                    id="modal-year-select"
                    value={formYearId}
                    onChange={(e) => setFormYearId(e.target.value)}
                  >
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>{y.year}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="modal-amount-input">{t('payment.amountLabel')} *</label>
                  <input
                    id="modal-amount-input"
                    type="number"
                    required
                    min={1}
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="modal-method-select">{t('payment.paymentMethod')} *</label>
                  <select
                    id="modal-method-select"
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
                  <label htmlFor="modal-date-input">{t('payment.paymentDate')} *</label>
                  <input
                    id="modal-date-input"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-ref-input">{t('payment.referenceNumber')}</label>
                <input
                  id="modal-ref-input"
                  type="text"
                  placeholder={t('payment.refNoLabel')}
                  value={formRefNumber}
                  onChange={(e) => setFormRefNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-notes-input">{t('payment.notes')}</label>
                <textarea
                  id="modal-notes-input"
                  rows={2}
                  placeholder={t('payment.notesLabel')}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel back-btn" onClick={() => setIsModalOpen(false)}>
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
        .payments-page {
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

        /* TABLE */
        .table-container-card {
          padding: 24px;
        }

        .payments-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .payments-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          background-color: var(--bg-app);
          border-bottom: 1px solid var(--border-color);
        }

        .payments-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .bold-text {
          font-weight: 600;
        }

        .amount-text {
          font-weight: 700;
          color: var(--primary-light);
        }

        .notes-td {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text-muted);
        }

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

        .form-alert.success {
          background-color: var(--success-bg);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
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

        .form-group input, .form-group select, .form-group textarea {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-card);
          color: var(--text-main);
          transition: var(--transition-all);
        }

        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
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
export default Payments;
