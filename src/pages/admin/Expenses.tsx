import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown, Plus, Search, Calendar, CreditCard,
  CheckCircle, XCircle, Clock, Ban, Eye, Edit2, Trash2, Download,
  Printer, Tag, RefreshCw, Paperclip, AlertCircle, Layers, X
} from 'lucide-react';
import { db } from '../../services/db';
import type { Expense, ExpenseCategory, ExpenseAuditLog } from '../../services/db';

export const Expenses: React.FC = () => {
  const navigate = useNavigate();

  // Data State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals & Drawers State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [viewingAuditLogs, setViewingAuditLogs] = useState<ExpenseAuditLog[]>([]);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingExpense, setRejectingExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidingExpense, setVoidingExpense] = useState<Expense | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const [editReasonRequired, setEditReasonRequired] = useState('');

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    expense_date: todayStr,
    category_id: '',
    category_name: '',
    description: '',
    paid_to: '',
    amount: '',
    payment_method: 'cash' as 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other',
    fund_id: 'general_fund',
    reference_number: '',
    bank_account: '',
    transaction_reference: '',
    cheque_number: '',
    bank_name: '',
    upi_reference_id: '',
    notes: '',
    attachment_url: '',
    status: 'approved' as 'pending' | 'approved',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [expList, catList] = await Promise.all([
        db.expenses.getAll(),
        db.expenseCategories.getAll(),
      ]);
      setExpenses(expList || []);
      setCategories(catList || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      showToast('error', 'Failed to load expense records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Available Years List for Filter
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);
    yearsSet.add('2025');
    yearsSet.add('2024');

    expenses.forEach((e) => {
      if (e.expense_date) {
        const y = new Date(e.expense_date).getFullYear().toString();
        if (y && !isNaN(Number(y))) yearsSet.add(y);
      }
    });
    return ['all', ...Array.from(yearsSet).sort((a, b) => Number(b) - Number(a))];
  }, [expenses]);

  // Filtered Expenses List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // 1. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        e.expense_number.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.paid_to.toLowerCase().includes(query) ||
        (e.category_name && e.category_name.toLowerCase().includes(query)) ||
        (e.reference_number && e.reference_number.toLowerCase().includes(query));

      // 2. Year Filter
      const matchYear =
        selectedYear === 'all' ||
        (e.expense_date && new Date(e.expense_date).getFullYear().toString() === selectedYear);

      // 3. Category Filter
      const matchCategory =
        selectedCategory === 'all' ||
        e.category_id === selectedCategory ||
        e.category_name === selectedCategory;

      // 4. Payment Method Filter
      const matchMethod =
        selectedPaymentMethod === 'all' || e.payment_method === selectedPaymentMethod;

      // 5. Status Filter
      const matchStatus = selectedStatus === 'all' || e.status === selectedStatus;

      // 6. Fund Filter
      const matchFund = selectedFund === 'all' || e.fund_id === selectedFund;

      // 7. Date Range Filter
      let matchDateRange = true;
      if (fromDate) {
        matchDateRange = matchDateRange && new Date(e.expense_date) >= new Date(fromDate);
      }
      if (toDate) {
        matchDateRange = matchDateRange && new Date(e.expense_date) <= new Date(toDate);
      }

      return (
        matchSearch &&
        matchYear &&
        matchCategory &&
        matchMethod &&
        matchStatus &&
        matchFund &&
        matchDateRange
      );
    });
  }, [
    expenses,
    searchQuery,
    selectedYear,
    selectedCategory,
    selectedPaymentMethod,
    selectedStatus,
    selectedFund,
    fromDate,
    toDate,
  ]);

  // Top Dashboard Summary Cards Calculation
  const topMetrics = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Filtered approved expenses for Total Expense calculation
    const approvedFiltered = filteredExpenses.filter((e) => e.status === 'approved');
    const totalApprovedAmount = approvedFiltered.reduce((sum, e) => sum + (e.amount || 0), 0);

    // This month approved expenses
    const thisMonthAmount = expenses
      .filter((e) => e.status === 'approved' && e.expense_date && e.expense_date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Pending approval expenses total
    const pendingAmount = expenses
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      totalExpenses: totalApprovedAmount,
      thisMonth: thisMonthAmount,
      pendingApproval: pendingAmount,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses, expenses]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedYear('all');
    setSelectedCategory('all');
    setSelectedPaymentMethod('all');
    setSelectedStatus('all');
    setSelectedFund('all');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setEditReasonRequired('');

    const firstCat = categories.find((c) => c.is_active) || categories[0];

    setFormData({
      expense_date: todayStr,
      category_id: firstCat?.id || '',
      category_name: firstCat?.name || 'General',
      description: '',
      paid_to: '',
      amount: '',
      payment_method: 'cash',
      fund_id: 'general_fund',
      reference_number: '',
      bank_account: '',
      transaction_reference: '',
      cheque_number: '',
      bank_name: '',
      upi_reference_id: '',
      notes: '',
      attachment_url: '',
      status: 'approved',
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setEditReasonRequired('');

    setFormData({
      expense_date: exp.expense_date,
      category_id: exp.category_id || '',
      category_name: exp.category_name,
      description: exp.description,
      paid_to: exp.paid_to,
      amount: exp.amount.toString(),
      payment_method: exp.payment_method,
      fund_id: exp.fund_id || 'general_fund',
      reference_number: exp.reference_number || '',
      bank_account: exp.bank_account || '',
      transaction_reference: exp.transaction_reference || '',
      cheque_number: exp.cheque_number || '',
      bank_name: exp.bank_name || '',
      upi_reference_id: exp.upi_reference_id || '',
      notes: exp.notes || '',
      attachment_url: exp.attachment_url || '',
      status: exp.status === 'approved' ? 'approved' : 'pending',
    });
    setIsFormModalOpen(true);
  };

  // Save Form Handler
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('error', 'Expense amount must be greater than zero (₹0.00 is not allowed)');
      return;
    }

    if (!formData.description.trim()) {
      showToast('error', 'Expense description is required');
      return;
    }

    if (!formData.paid_to.trim()) {
      showToast('error', 'Paid To (vendor/person name) is required');
      return;
    }

    if (editingExpense && editingExpense.status === 'approved' && !editReasonRequired.trim()) {
      showToast('error', 'Reason for updating an approved expense is required for audit trail');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find((c) => c.id === formData.category_id);
      const catName = selectedCat ? selectedCat.name : formData.category_name || 'General';

      if (editingExpense) {
        // Update Expense
        const oldValues = { ...editingExpense };
        const updatedRecord: Partial<Expense> = {
          expense_date: formData.expense_date,
          category_id: formData.category_id || null,
          category_name: catName,
          description: formData.description.trim(),
          paid_to: formData.paid_to.trim(),
          amount: amt,
          payment_method: formData.payment_method,
          fund_id: formData.fund_id,
          reference_number: formData.reference_number.trim() || null,
          bank_account: formData.bank_account.trim() || null,
          transaction_reference: formData.transaction_reference.trim() || null,
          cheque_number: formData.cheque_number.trim() || null,
          bank_name: formData.bank_name.trim() || null,
          upi_reference_id: formData.upi_reference_id.trim() || null,
          notes: formData.notes.trim() || null,
          attachment_url: formData.attachment_url.trim() || null,
          status: formData.status,
          updated_by: 'admin',
        };

        if (editingExpense.status === 'pending' && formData.status === 'approved') {
          updatedRecord.approved_by = 'Muhammed Anas (Admin)';
          updatedRecord.approved_at = new Date().toISOString();
        }

        await db.expenses.update(editingExpense.id, updatedRecord);

        // Record Audit Log
        await db.expenseAuditLogs.create({
          expense_id: editingExpense.id,
          action: 'UPDATE',
          old_values: oldValues,
          new_values: updatedRecord,
          reason: editReasonRequired.trim() || 'Updated expense details',
          performed_by: 'admin',
        });

        showToast('success', `✓ Expense ${editingExpense.expense_number} updated successfully`);
      } else {
        // Create Expense
        // Auto-generate expense_number
        let expNum = 'EXP-001';
        if (expenses.length > 0) {
          const numbers = expenses
            .map((ex) => {
              const match = ex.expense_number?.match(/EXP-(\d+)/i);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n) => !isNaN(n));
          const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
          expNum = `EXP-${String(maxNum + 1).padStart(3, '0')}`;
        }

        const newRecord = await db.expenses.create({
          expense_number: expNum,
          expense_date: formData.expense_date,
          category_id: formData.category_id || null,
          category_name: catName,
          description: formData.description.trim(),
          paid_to: formData.paid_to.trim(),
          amount: amt,
          payment_method: formData.payment_method,
          fund_id: formData.fund_id,
          reference_number: formData.reference_number.trim() || null,
          bank_account: formData.bank_account.trim() || null,
          transaction_reference: formData.transaction_reference.trim() || null,
          cheque_number: formData.cheque_number.trim() || null,
          bank_name: formData.bank_name.trim() || null,
          upi_reference_id: formData.upi_reference_id.trim() || null,
          notes: formData.notes.trim() || null,
          attachment_url: formData.attachment_url.trim() || null,
          status: formData.status,
          approved_by: formData.status === 'approved' ? 'Muhammed Anas (Admin)' : null,
          approved_at: formData.status === 'approved' ? new Date().toISOString() : null,
          created_by: 'admin',
        });

        // Record Audit Log for Creation
        await db.expenseAuditLogs.create({
          expense_id: newRecord.id,
          action: 'CREATE',
          new_values: newRecord,
          reason: 'Initial expense entry recorded',
          performed_by: 'admin',
        });

        showToast('success', `✓ Expense ${expNum} created successfully`);
      }

      setIsFormModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      showToast('error', `Failed to save expense: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Details Modal
  const handleOpenDetails = async (exp: Expense) => {
    setViewingExpense(exp);
    setIsDetailsModalOpen(true);
    try {
      const logs = await db.expenseAuditLogs.getByExpenseId(exp.id);
      setViewingAuditLogs(logs || []);
    } catch (e) {
      console.warn('Failed to load audit logs:', e);
    }
  };

  // Approve Action
  const handleApproveExpense = async (exp: Expense, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const now = new Date().toISOString();
      await db.expenses.update(exp.id, {
        status: 'approved',
        approved_by: 'Muhammed Anas (Admin)',
        approved_at: now,
      });

      await db.expenseAuditLogs.create({
        expense_id: exp.id,
        action: 'APPROVE',
        old_values: { status: exp.status },
        new_values: { status: 'approved', approved_by: 'Muhammed Anas (Admin)', approved_at: now },
        reason: 'Approved by Committee Admin',
        performed_by: 'admin',
      });

      showToast('success', `✓ Expense ${exp.expense_number} approved and integrated into financial balance`);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to approve expense');
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (exp: Expense, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRejectingExpense(exp);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingExpense) return;
    if (!rejectionReason.trim()) {
      showToast('error', 'Please provide a reason for rejecting this expense');
      return;
    }
    try {
      await db.expenses.update(rejectingExpense.id, {
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
      });

      await db.expenseAuditLogs.create({
        expense_id: rejectingExpense.id,
        action: 'REJECT',
        old_values: { status: rejectingExpense.status },
        new_values: { status: 'rejected', rejection_reason: rejectionReason.trim() },
        reason: rejectionReason.trim(),
        performed_by: 'admin',
      });

      showToast('success', `✓ Expense ${rejectingExpense.expense_number} rejected`);
      setIsRejectModalOpen(false);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to reject expense');
    }
  };

  // Open Delete / Void Modal
  const handleOpenDeleteVoidModal = (exp: Expense, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (exp.status === 'approved') {
      setVoidingExpense(exp);
      setVoidReason('');
      setIsVoidModalOpen(true);
    } else {
      // Pending or Rejected can be soft deleted directly with confirmation
      if (window.confirm(`Are you sure you want to delete expense ${exp.expense_number}?`)) {
        db.expenses.delete(exp.id).then(() => {
          showToast('success', `✓ Expense ${exp.expense_number} deleted`);
          loadData();
        });
      }
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidingExpense) return;
    if (!voidReason.trim()) {
      showToast('error', 'Please enter a void reason to preserve audit compliance');
      return;
    }
    try {
      const now = new Date().toISOString();
      await db.expenses.update(voidingExpense.id, {
        status: 'voided',
        voided_by: 'Muhammed Anas (Admin)',
        voided_at: now,
        void_reason: voidReason.trim(),
      });

      await db.expenseAuditLogs.create({
        expense_id: voidingExpense.id,
        action: 'VOID',
        old_values: { status: voidingExpense.status },
        new_values: { status: 'voided', voided_by: 'Muhammed Anas (Admin)', voided_at: now, void_reason: voidReason.trim() },
        reason: voidReason.trim(),
        performed_by: 'admin',
      });

      showToast('success', `✓ Expense ${voidingExpense.expense_number} marked as VOIDED`);
      setIsVoidModalOpen(false);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to void expense');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      showToast('error', 'No expense records found to export');
      return;
    }

    const headers = [
      'Expense No',
      'Date',
      'Category',
      'Description',
      'Paid To',
      'Amount (INR)',
      'Payment Method',
      'Fund / Account',
      'Status',
      'Reference No',
      'Recorded By',
      'Approved By',
    ];

    const rows = filteredExpenses.map((e) => [
      e.expense_number,
      e.expense_date,
      e.category_name,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.paid_to.replace(/"/g, '""')}"`,
      e.amount,
      e.payment_method.toUpperCase(),
      (e.fund_id || 'general_fund').replace(/_/g, ' ').toUpperCase(),
      e.status.toUpperCase(),
      e.reference_number || 'N/A',
      e.created_by,
      e.approved_by || 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mahall_expenses_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', '✓ Expenses exported to CSV successfully');
  };

  // PDF Print Report
  const handlePrintExpensesPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Popup blocked. Please allow popups to print expense report.');
      return;
    }

    const approvedList = filteredExpenses.filter((e) => e.status === 'approved');
    const totalAmount = approvedList.reduce((s, e) => s + (e.amount || 0), 0);

    // Group by category
    const catTotals: Record<string, number> = {};
    approvedList.forEach((e) => {
      catTotals[e.category_name] = (catTotals[e.category_name] || 0) + e.amount;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mahallu Expense Report - ${selectedYear === 'all' ? 'All Time' : selectedYear}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1e293b; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; color: #5b21b6; text-transform: uppercase; }
          .header p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8fafc; padding: 12px 18px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
          .metric-card { text-align: center; }
          .metric-title { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .metric-val { font-size: 18px; font-weight: 700; color: #7c3aed; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .badge { padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px; display: inline-block; text-transform: uppercase; }
          .badge-approved { background: #dcfce7; color: #15803d; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          .footer-sig { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 15px; font-size: 12px; color: #64748b; }
          .sig-box { text-align: center; width: 200px; }
          .sig-line { border-top: 1px solid #94a3b8; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MAHALLU EXPENSES & DISBURSEMENT STATEMENT</h1>
          <p>Official Committee Accounting Record • Generated on ${new Date().toLocaleDateString('en-IN')}</p>
        </div>

        <div class="meta-grid">
          <div class="metric-card">
            <div class="metric-title">Period / Year</div>
            <div class="metric-val" style="color:#0f172a;">${selectedYear === 'all' ? 'All Recorded Years' : 'Year ' + selectedYear}</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Approved Expenses Total</div>
            <div class="metric-val">₹${totalAmount.toLocaleString('en-IN')}</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Total Transactions</div>
            <div class="metric-val" style="color:#0f172a;">${filteredExpenses.length}</div>
          </div>
        </div>

        <h3>Category Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Disbursed (₹)</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(catTotals)
              .map(([cat, amt]) => {
                const pct = totalAmount > 0 ? Math.round((amt / totalAmount) * 100) : 0;
                return `
                  <tr>
                    <td><strong>${cat}</strong></td>
                    <td>₹${amt.toLocaleString('en-IN')}</td>
                    <td>${pct}%</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        <h3 style="margin-top: 25px;">Detailed Expense Ledger</h3>
        <table>
          <thead>
            <tr>
              <th>Expense No</th>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Paid To</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses
              .map(
                (e) => `
              <tr>
                <td><strong>${e.expense_number}</strong></td>
                <td>${e.expense_date}</td>
                <td>${e.category_name}</td>
                <td>${e.description}</td>
                <td>${e.paid_to}</td>
                <td><strong>₹${(e.amount || 0).toLocaleString('en-IN')}</strong></td>
                <td>${e.payment_method.toUpperCase()}</td>
                <td><span class="badge badge-${e.status}">${e.status}</span></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer-sig">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>Prepared By (Accountant)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>Treasurer Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>President / Secretary Seal</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="page-container padding-lg">
      {/* Toast Banner */}
      {toast && (
        <div className={`toast-notification ${toast.type}`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header flex-between margin-bottom-lg flex-wrap gap-md">
        <div>
          <h1 className="font-xl font-weight-700 color-heading flex-center gap-sm">
            <TrendingDown className="text-purple" size={28} /> Expenses Management
          </h1>
          <p className="color-subtle font-sm margin-top-xs">
            Record, categorize, track approval workflows, and audit every expense made by the Mahall.
          </p>
        </div>

        <div className="flex-center gap-sm flex-wrap">
          <button
            className="btn btn-ghost btn-sm text-purple flex-center gap-xs border-purple-light"
            onClick={() => navigate('/admin/settings/expense-categories')}
          >
            <Tag size={16} /> Manage Categories
          </button>

          <button className="btn btn-ghost btn-sm text-subtle flex-center gap-xs" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>

          <button className="btn btn-ghost btn-sm text-subtle flex-center gap-xs" onClick={handlePrintExpensesPdf}>
            <Printer size={16} /> Print Report
          </button>

          <button className="btn btn-primary flex-center gap-xs shadow-purple" onClick={handleOpenAddModal}>
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      {/* 4 SUMMARY METRIC CARDS */}
      <div className="grid-layout cols-4 margin-bottom-lg gap-md">
        {/* Card 1: Total Expenses */}
        <div className="glass-card padding-md flex-between align-center">
          <div>
            <span className="font-2xs font-weight-700 color-subtle text-uppercase display-block margin-bottom-xs">
              Total Expenses {selectedYear !== 'all' ? `(${selectedYear})` : ''}
            </span>
            <div className="font-xl font-weight-800 text-purple">
              ₹{topMetrics.totalExpenses.toLocaleString('en-IN')}
            </div>
            <span className="font-3xs color-subtle display-block margin-top-2xs">
              Based on approved records
            </span>
          </div>
          <div className="stat-icon-wrap bg-purple-light text-purple">
            <TrendingDown size={24} />
          </div>
        </div>

        {/* Card 2: This Month */}
        <div className="glass-card padding-md flex-between align-center">
          <div>
            <span className="font-2xs font-weight-700 color-subtle text-uppercase display-block margin-bottom-xs">
              This Month
            </span>
            <div className="font-xl font-weight-800 text-primary">
              ₹{topMetrics.thisMonth.toLocaleString('en-IN')}
            </div>
            <span className="font-3xs color-subtle display-block margin-top-2xs">
              Disbursed in {new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="stat-icon-wrap bg-primary-light text-primary">
            <Calendar size={24} />
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div className="glass-card padding-md flex-between align-center">
          <div>
            <span className="font-2xs font-weight-700 color-subtle text-uppercase display-block margin-bottom-xs">
              Pending Approval
            </span>
            <div className="font-xl font-weight-800 text-warning">
              ₹{topMetrics.pendingApproval.toLocaleString('en-IN')}
            </div>
            <span className="font-3xs color-subtle display-block margin-top-2xs">
              Awaiting committee review
            </span>
          </div>
          <div className="stat-icon-wrap bg-warning-light text-warning">
            <Clock size={24} />
          </div>
        </div>

        {/* Card 4: Expense Transactions Count */}
        <div className="glass-card padding-md flex-between align-center">
          <div>
            <span className="font-2xs font-weight-700 color-subtle text-uppercase display-block margin-bottom-xs">
              Expenses Count
            </span>
            <div className="font-xl font-weight-800 color-heading">
              {topMetrics.count}
            </div>
            <span className="font-3xs color-subtle display-block margin-top-2xs">
              Filtered records count
            </span>
          </div>
          <div className="stat-icon-wrap bg-subtle">
            <Layers size={24} className="color-subtle" />
          </div>
        </div>
      </div>

      {/* FILTER ROW */}
      <div className="glass-card padding-md margin-bottom-lg">
        <div className="flex-between flex-wrap gap-md margin-bottom-sm">
          {/* Search Box */}
          <div className="search-input-wrapper flex-grow" style={{ minWidth: 260 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search expense #, description, vendor / paid-to..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Filters Group */}
          <div className="flex-center gap-xs flex-wrap">
            {/* Year Filter */}
            <div className="flex-center gap-2xs">
              <span className="font-xs font-weight-600 color-subtle">Year:</span>
              <select
                className="select-input font-xs"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y === 'all' ? 'All Years' : y}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex-center gap-2xs">
              <span className="font-xs font-weight-600 color-subtle">Category:</span>
              <select
                className="select-input font-xs"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {!c.is_active ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="flex-center gap-2xs">
              <span className="font-xs font-weight-600 color-subtle">Method:</span>
              <select
                className="select-input font-xs"
                value={selectedPaymentMethod}
                onChange={(e) => {
                  setSelectedPaymentMethod(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-center gap-2xs">
              <span className="font-xs font-weight-600 color-subtle">Status:</span>
              <select
                className="select-input font-xs"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="voided">Voided</option>
              </select>
            </div>

            <button
              className="btn btn-ghost btn-xs text-danger flex-center gap-2xs"
              onClick={handleClearFilters}
              title="Clear all filters"
            >
              <X size={14} /> Clear
            </button>
          </div>
        </div>

        {/* Date Range Sub-Row */}
        <div className="flex-start gap-md flex-wrap border-top padding-top-xs font-xs color-subtle">
          <div className="flex-center gap-xs">
            <span>From:</span>
            <input
              type="date"
              className="form-input padding-2xs font-xs"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex-center gap-xs">
            <span>To:</span>
            <input
              type="date"
              className="form-input padding-2xs font-xs"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="flex-center gap-xs">
            <span>Fund:</span>
            <select
              className="select-input padding-2xs font-xs"
              value={selectedFund}
              onChange={(e) => setSelectedFund(e.target.value)}
            >
              <option value="all">All Funds</option>
              <option value="general_fund">General Fund</option>
              <option value="mosque_fund">Mosque Fund</option>
              <option value="madrasa_fund">Madrasa Fund</option>
              <option value="zakat_fund">Zakat Fund</option>
              <option value="welfare_fund">Welfare Fund</option>
              <option value="construction_fund">Construction Fund</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* EXPENSE TABLE & RESPONSIVE CARDS */}
      {isLoading ? (
        <div className="glass-card padding-xl text-center">
          <RefreshCw size={28} className="animate-spin text-purple margin-bottom-sm" />
          <p className="color-subtle">Loading Mahall expense records...</p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="glass-card padding-xl text-center">
          <TrendingDown size={44} className="color-subtle margin-bottom-sm opacity-40" />
          <h3 className="font-lg font-weight-600 color-heading">No Expenses Found</h3>
          <p className="color-subtle font-sm margin-top-xs">
            {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'No expenses match your current filters. Try resetting the filters.'
              : 'Start recording your Mahall’s expenses to keep your financial records organized.'}
          </p>
          <div className="flex-center gap-sm margin-top-md justify-center">
            {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' ? (
              <button className="btn btn-ghost" onClick={handleClearFilters}>
                Clear Filters
              </button>
            ) : null}
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              + Add Expense
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="table-responsive glass-card margin-bottom-md">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Expense No</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Paid To</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Recorded By</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.map((exp) => {
                  const statusBadges: Record<string, { cls: string; label: string; icon: any }> = {
                    approved: { cls: 'badge-success', label: 'Approved', icon: CheckCircle },
                    pending: { cls: 'badge-warning', label: 'Pending', icon: Clock },
                    rejected: { cls: 'badge-danger', label: 'Rejected', icon: XCircle },
                    voided: { cls: 'badge-subtle', label: 'Voided', icon: Ban },
                  };
                  const sb = statusBadges[exp.status] || statusBadges.approved;
                  const IconComp = sb.icon;

                  return (
                    <tr
                      key={exp.id}
                      className="cursor-pointer hover-bg-subtle"
                      onClick={() => handleOpenDetails(exp)}
                    >
                      <td>
                        <span className="font-weight-700 text-purple font-xs">{exp.expense_number}</span>
                      </td>
                      <td>
                        <span className="font-xs font-weight-500">{exp.expense_date}</span>
                      </td>
                      <td>
                        <span className="badge badge-purple-light font-xs">{exp.category_name}</span>
                      </td>
                      <td>
                        <div className="font-xs font-weight-500 color-heading line-clamp-1" title={exp.description}>
                          {exp.description}
                        </div>
                      </td>
                      <td>
                        <span className="font-xs font-weight-600 color-heading">{exp.paid_to}</span>
                      </td>
                      <td>
                        <span className="font-sm font-weight-800 text-purple">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <span className="font-2xs font-weight-600 text-uppercase color-subtle flex-center gap-3xs">
                          <CreditCard size={12} /> {exp.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${sb.cls} font-xs flex-center gap-3xs`}>
                          <IconComp size={12} /> {sb.label}
                        </span>
                      </td>
                      <td>
                        <span className="font-2xs color-subtle">{exp.created_by}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex-center justify-end gap-xs">
                          {/* Details Button */}
                          <button
                            className="btn btn-ghost btn-xs text-subtle"
                            title="View Expense Details"
                            onClick={() => handleOpenDetails(exp)}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Quick Approve/Reject Buttons for Pending */}
                          {exp.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-ghost btn-xs text-success"
                                title="Approve Expense"
                                onClick={(e) => handleApproveExpense(exp, e)}
                              >
                                <CheckCircle size={15} />
                              </button>
                              <button
                                className="btn btn-ghost btn-xs text-danger"
                                title="Reject Expense"
                                onClick={(e) => handleOpenRejectModal(exp, e)}
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}

                          {/* Edit Button */}
                          <button
                            className="btn btn-ghost btn-xs text-primary"
                            title="Edit Expense"
                            onClick={() => handleOpenEditModal(exp)}
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Delete / Void Button */}
                          <button
                            className="btn btn-ghost btn-xs text-danger"
                            title={exp.status === 'approved' ? 'Void Expense' : 'Delete Expense'}
                            onClick={(e) => handleOpenDeleteVoidModal(exp, e)}
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

          {/* PAGINATION ROW */}
          {totalPages > 1 && (
            <div className="flex-between margin-top-md font-sm color-subtle">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} records
              </span>

              <div className="flex-center gap-xs">
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`btn btn-xs ${currentPage === p ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD / EDIT EXPENSE FORM MODAL */}
      {isFormModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content padding-lg" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between margin-bottom-md border-bottom padding-bottom-sm">
              <h2 className="font-lg font-weight-700 color-heading flex-center gap-xs">
                <TrendingDown size={22} className="text-purple" />
                {editingExpense ? `Edit Expense (${editingExpense.expense_number})` : 'Add New Expense'}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsFormModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {editingExpense && editingExpense.status === 'approved' && (
              <div className="alert alert-warning margin-bottom-md padding-sm font-xs radius-md">
                <AlertCircle size={16} className="margin-right-xs display-inline" />
                <strong>Approved Financial Record Warning:</strong> Modifying an approved expense will update the audit trail and require an explicit justification reason below.
              </div>
            )}

            <form onSubmit={handleSaveExpense}>
              {/* Section A: Basic Info */}
              <div className="grid-layout cols-2 gap-md margin-bottom-md">
                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                    Expense Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                    Category <span className="text-danger">*</span>
                  </label>
                  <select
                    className="select-input width-full"
                    value={formData.category_id}
                    onChange={(e) => {
                      const selCat = categories.find((c) => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        category_id: e.target.value,
                        category_name: selCat ? selCat.name : formData.category_name,
                      });
                    }}
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.is_active}>
                        {c.name} {!c.is_active ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section B: Details */}
              <div className="margin-bottom-md">
                <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                  Description <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mosque electricity bill for August 2026"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid-layout cols-2 gap-md margin-bottom-md">
                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                    Paid To (Vendor / Recipient) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. KSEB, Rahman Plumbing, ABC Caterers"
                    value={formData.paid_to}
                    onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                    Invoice / Bill / Reference No.
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. INV-2026-084"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  />
                </div>
              </div>

              {/* Section C: Amount & Payment Method */}
              <div className="grid-layout cols-2 gap-md margin-bottom-md">
                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                    Amount (₹) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input font-weight-700 text-purple"
                    placeholder="e.g. 4850.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                    Payment Method <span className="text-danger">*</span>
                  </label>
                  <select
                    className="select-input width-full"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Payment Method Specific Extra Fields */}
              {formData.payment_method === 'bank_transfer' && (
                <div className="grid-layout cols-2 gap-md margin-bottom-md padding-sm bg-subtle radius-md">
                  <div>
                    <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">
                      Bank Account
                    </label>
                    <input
                      type="text"
                      className="form-input font-xs"
                      placeholder="e.g. SBI A/C 39847291"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">
                      Transaction Reference
                    </label>
                    <input
                      type="text"
                      className="form-input font-xs"
                      placeholder="e.g. TXN9827364"
                      value={formData.transaction_reference}
                      onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {formData.payment_method === 'upi' && (
                <div className="margin-bottom-md padding-sm bg-subtle radius-md">
                  <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">
                    UPI Reference ID
                  </label>
                  <input
                    type="text"
                    className="form-input font-xs"
                    placeholder="e.g. UPI9847291823"
                    value={formData.upi_reference_id}
                    onChange={(e) => setFormData({ ...formData, upi_reference_id: e.target.value })}
                  />
                </div>
              )}

              {formData.payment_method === 'cheque' && (
                <div className="grid-layout cols-2 gap-md margin-bottom-md padding-sm bg-subtle radius-md">
                  <div>
                    <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">
                      Cheque Number
                    </label>
                    <input
                      type="text"
                      className="form-input font-xs"
                      placeholder="e.g. CHQ-98273"
                      value={formData.cheque_number}
                      onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      className="form-input font-xs"
                      placeholder="e.g. Federal Bank"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Section D: Fund / Account */}
              <div className="grid-layout cols-2 gap-md margin-bottom-md">
                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                    Fund / Account
                  </label>
                  <select
                    className="select-input width-full"
                    value={formData.fund_id}
                    onChange={(e) => setFormData({ ...formData, fund_id: e.target.value })}
                  >
                    <option value="general_fund">General Fund</option>
                    <option value="mosque_fund">Mosque Fund</option>
                    <option value="madrasa_fund">Madrasa Fund</option>
                    <option value="zakat_fund">Zakat Fund (Restricted)</option>
                    <option value="welfare_fund">Welfare Fund</option>
                    <option value="construction_fund">Construction Fund</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                    Initial Status
                  </label>
                  <select
                    className="select-input width-full"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="approved">Approved (Direct Approval)</option>
                    <option value="pending">Pending Approval</option>
                  </select>
                </div>
              </div>

              {/* Section E: Notes & Attachment */}
              <div className="margin-bottom-md">
                <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                  Attachment (Receipt / Bill URL or filename)
                </label>
                <div className="flex-center gap-xs">
                  <input
                    type="text"
                    className="form-input font-xs flex-grow"
                    placeholder="e.g. electricity-bill-august.pdf or https://..."
                    value={formData.attachment_url}
                    onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  />
                  {formData.attachment_url && (
                    <span className="font-2xs text-success flex-center gap-3xs">
                      <Paperclip size={14} /> Attached
                    </span>
                  )}
                </div>
              </div>

              <div className="margin-bottom-md">
                <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">
                  Notes / Internal Comments
                </label>
                <textarea
                  className="form-textarea font-xs"
                  rows={2}
                  placeholder="Optional context (e.g. Emergency repair completed before Friday prayer)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Required Audit Reason when Editing Approved Record */}
              {editingExpense && editingExpense.status === 'approved' && (
                <div className="margin-bottom-md border-top padding-top-sm">
                  <label className="form-label font-xs font-weight-700 text-danger margin-bottom-2xs display-block">
                    Audit Modification Reason <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input border-danger"
                    placeholder="e.g. Corrected invoice amount as per revised KSEB receipt"
                    value={editReasonRequired}
                    onChange={(e) => setEditReasonRequired(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Footer CTA */}
              <div className="flex-between gap-sm margin-top-md border-top padding-top-sm">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-center gap-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving Expense...' : editingExpense ? 'Update Expense' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW EXPENSE DETAILS MODAL */}
      {isDetailsModalOpen && viewingExpense && (
        <div className="modal-backdrop">
          <div className="modal-content padding-lg" style={{ maxWidth: 650 }}>
            <div className="flex-between border-bottom padding-bottom-sm margin-bottom-md">
              <div>
                <span className="font-2xs font-weight-700 text-purple text-uppercase">
                  Expense Record #{viewingExpense.expense_number}
                </span>
                <h2 className="font-lg font-weight-800 color-heading">
                  ₹{viewingExpense.amount.toLocaleString('en-IN')}
                </h2>
              </div>
              <div className="flex-center gap-xs">
                <span className={`badge badge-${viewingExpense.status === 'approved' ? 'success' : viewingExpense.status === 'pending' ? 'warning' : 'danger'}`}>
                  {viewingExpense.status.toUpperCase()}
                </span>
                <button className="btn btn-ghost btn-icon" onClick={() => setIsDetailsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid-layout cols-2 gap-md font-sm margin-bottom-md">
              <div>
                <span className="color-subtle font-2xs display-block">Date</span>
                <strong className="color-heading">{viewingExpense.expense_date}</strong>
              </div>
              <div>
                <span className="color-subtle font-2xs display-block">Category</span>
                <strong className="text-purple">{viewingExpense.category_name}</strong>
              </div>
              <div className="col-span-2">
                <span className="color-subtle font-2xs display-block">Description</span>
                <strong className="color-heading">{viewingExpense.description}</strong>
              </div>
              <div>
                <span className="color-subtle font-2xs display-block">Paid To</span>
                <strong className="color-heading">{viewingExpense.paid_to}</strong>
              </div>
              <div>
                <span className="color-subtle font-2xs display-block">Payment Method</span>
                <strong className="color-heading text-uppercase">{viewingExpense.payment_method.replace('_', ' ')}</strong>
              </div>
              {viewingExpense.reference_number && (
                <div>
                  <span className="color-subtle font-2xs display-block">Reference No</span>
                  <strong>{viewingExpense.reference_number}</strong>
                </div>
              )}
              <div>
                <span className="color-subtle font-2xs display-block">Fund / Account</span>
                <strong className="text-capitalize">{(viewingExpense.fund_id || 'general_fund').replace('_', ' ')}</strong>
              </div>
              {viewingExpense.bank_account && (
                <div>
                  <span className="color-subtle font-2xs display-block">Bank Account</span>
                  <span>{viewingExpense.bank_account}</span>
                </div>
              )}
              {viewingExpense.transaction_reference && (
                <div>
                  <span className="color-subtle font-2xs display-block">Transaction Ref</span>
                  <span>{viewingExpense.transaction_reference}</span>
                </div>
              )}
              {viewingExpense.upi_reference_id && (
                <div>
                  <span className="color-subtle font-2xs display-block">UPI ID</span>
                  <span>{viewingExpense.upi_reference_id}</span>
                </div>
              )}
              {viewingExpense.attachment_url && (
                <div className="col-span-2 bg-subtle padding-sm radius-md flex-between">
                  <span className="flex-center gap-xs font-xs font-weight-600">
                    <Paperclip size={16} /> Supporting Document: {viewingExpense.attachment_url}
                  </span>
                  <a
                    href={viewingExpense.attachment_url.startsWith('http') ? viewingExpense.attachment_url : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-xs text-purple"
                  >
                    View Document
                  </a>
                </div>
              )}
            </div>

            {/* Approval Info */}
            <div className="border-top padding-top-sm margin-bottom-md font-2xs color-subtle">
              {viewingExpense.status === 'approved' && (
                <div className="flex-between">
                  <span>Approved By: <strong>{viewingExpense.approved_by || 'Admin'}</strong></span>
                  <span>Approved At: <strong>{viewingExpense.approved_at ? new Date(viewingExpense.approved_at).toLocaleString() : 'N/A'}</strong></span>
                </div>
              )}
              {viewingExpense.status === 'rejected' && (
                <div className="text-danger font-xs">
                  Rejection Reason: <strong>{viewingExpense.rejection_reason || 'N/A'}</strong>
                </div>
              )}
              {viewingExpense.status === 'voided' && (
                <div className="text-danger font-xs">
                  Void Reason: <strong>{viewingExpense.void_reason || 'N/A'}</strong> (Voided by {viewingExpense.voided_by})
                </div>
              )}
            </div>

            {/* Audit Logs Timeline */}
            {viewingAuditLogs.length > 0 && (
              <div className="border-top padding-top-sm">
                <span className="font-2xs font-weight-700 text-uppercase color-subtle display-block margin-bottom-xs">
                  Audit History Log
                </span>
                <div className="font-2xs color-subtle max-h-32 overflow-y-auto">
                  {viewingAuditLogs.map((log) => (
                    <div key={log.id} className="margin-bottom-2xs border-bottom padding-bottom-2xs">
                      <strong>[{log.action}]</strong> by {log.performed_by} on {new Date(log.performed_at).toLocaleString()}
                      {log.reason && <span className="display-block italic color-heading">Reason: "{log.reason}"</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-end gap-xs margin-top-md border-top padding-top-sm">
              <button className="btn btn-ghost" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      {isRejectModalOpen && rejectingExpense && (
        <div className="modal-backdrop">
          <div className="modal-content padding-lg" style={{ maxWidth: 450 }}>
            <h3 className="font-md font-weight-700 color-heading margin-bottom-xs">
              Reject Expense #{rejectingExpense.expense_number}?
            </h3>
            <p className="font-xs color-subtle margin-bottom-md">
              Please specify why this expense of ₹{rejectingExpense.amount.toLocaleString('en-IN')} is being rejected.
            </p>

            <textarea
              className="form-textarea font-xs margin-bottom-md"
              rows={3}
              placeholder="Enter rejection reason for committee record..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />

            <div className="flex-between gap-sm">
              <button className="btn btn-ghost" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmReject}>
                Reject Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOID CONFIRMATION MODAL */}
      {isVoidModalOpen && voidingExpense && (
        <div className="modal-backdrop">
          <div className="modal-content padding-lg" style={{ maxWidth: 450 }}>
            <h3 className="font-md font-weight-700 text-danger margin-bottom-xs">
              Void Approved Expense #{voidingExpense.expense_number}?
            </h3>
            <p className="font-xs color-subtle margin-bottom-md">
              This approved expense of ₹{voidingExpense.amount.toLocaleString('en-IN')} will be voided and removed from the official Mahall cashbook balance.
            </p>

            <textarea
              className="form-textarea font-xs margin-bottom-md"
              rows={3}
              placeholder="Enter void justification reason..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              required
            />

            <div className="flex-between gap-sm">
              <button className="btn btn-ghost" onClick={() => setIsVoidModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmVoid}>
                Void Expense Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
