import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { Member, Payment } from '../../services/db';
import { History } from 'lucide-react';

export const PaymentHistory: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const memObj = await db.members.getByUserId(user.id);
        if (memObj) {
          setMember(memObj);
          const payList = await db.payments.getByMember(memObj.id);
          setPayments(payList);
        }
      } catch (err) {
        console.error('Failed to load member payments history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [user]);

  if (loading) {
    return <div className="loading-indicator">{t('common.loading')}</div>;
  }

  if (!member) {
    return <div className="loading-indicator">No member profile linked.</div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="payment-history-page animate-fade-in">
      <div className="page-header-actions">
        <h3>{t('nav.paymentHistory')}</h3>
      </div>

      <div className="table-container-card glass-card">
        <div className="card-header-label">
          <History size={16} className="header-icon" />
          <h4>{t('payment.paymentHistory')}</h4>
        </div>

        <div className="table-responsive">
          <table className="payments-table">
            <thead>
              <tr>
                <th>{t('payment.paymentDate')}</th>
                <th>{t('payment.amount')}</th>
                <th>{t('payment.paymentMethod')}</th>
                <th>{t('payment.referenceNumber')}</th>
                <th>{t('payment.notes')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-data-cell">{t('common.noData')}</td>
                </tr>
              ) : (
                payments.map((pay) => (
                  <tr key={pay.id}>
                    <td className="bold-text">{new Date(pay.payment_date).toLocaleDateString()}</td>
                    <td className="amount-text">{formatCurrency(pay.amount)}</td>
                    <td>
                      <span className={`method-badge ${pay.payment_method}`}>
                        {t(`payment.${pay.payment_method}`)}
                      </span>
                    </td>
                    <td>{pay.reference_number || '—'}</td>
                    <td className="notes-td">{pay.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .payment-history-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header-actions h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
        }

        .table-container-card {
          padding: 24px;
        }

        .card-header-label {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 20px;
        }

        .card-header-label h4 {
          font-size: 15px;
          font-weight: 700;
          color: var(--primary);
        }

        [data-theme="dark"] .card-header-label h4 {
          color: var(--gold-light);
        }

        .header-icon {
          color: var(--gold);
        }

        /* TABLES */
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

        .payments-table tr:last-child td {
          border-bottom: none;
        }

        .bold-text {
          font-weight: 600;
        }

        .amount-text {
          font-weight: 700;
          color: var(--primary-light);
        }

        .notes-td {
          max-width: 300px;
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

        .no-data-cell {
          text-align: center;
          color: var(--text-muted);
          padding: 40px !important;
        }
      `}</style>
    </div>
  );
};
export default PaymentHistory;
