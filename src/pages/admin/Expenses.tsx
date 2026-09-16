import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { Expense, ExpenseCategory, ExpenseAuditLog, SubscriptionYear } from '../../services/db';
import {
  TrendingDown, Plus, Search, Calendar, CreditCard, CheckCircle, XCircle,
  Clock, Ban, Eye, Edit2, Trash2, Download, Printer, Tag, RefreshCw,
  AlertCircle, Layers, X, PieChart, ChevronRight, ShieldCheck
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Expenses: React.FC = () => {
  // Primary Sub-Tab State ('overview' | 'expenses' | 'categories')
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'categories'>('overview');

  // Data State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Filter States for Expenses Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Category Filter States
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [catFormData, setCatFormData] = useState({ name: '', description: '', is_active: true });
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

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
      const [expList, catList, yearList] = await Promise.all([
        db.expenses.getAll(),
        db.expenseCategories.getAll(),
        db.years.get(),
      ]);
      setExpenses(expList || []);
      setCategories(catList || []);
      setYears(yearList || []);

      if (yearList && yearList.length > 0 && !selectedYearId) {
        const activeYr = yearList.find((y) => y.status === 'active') || yearList[0];
        setSelectedYearId(activeYr.id);
      }
    } catch (err) {
      console.error('Failed to load expenses data:', err);
      showToast('error', 'Failed to load expense records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedYearObj = useMemo(() => {
    return years.find((y) => y.id === selectedYearId) || null;
  }, [years, selectedYearId]);

  const targetYearVal = selectedYearObj ? selectedYearObj.year : null;

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
        !targetYearVal ||
        (e.expense_date && new Date(e.expense_date).getFullYear() === targetYearVal);

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
    targetYearVal,
    selectedCategory,
    selectedPaymentMethod,
    selectedStatus,
    selectedFund,
    fromDate,
    toDate,
  ]);

  // Dashboard Stats Metrics
  const topMetrics = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM

    const yearFilteredExps = targetYearVal
      ? expenses.filter((e) => e.expense_date && new Date(e.expense_date).getFullYear() === targetYearVal)
      : expenses;

    const approvedList = yearFilteredExps.filter((e) => e.status === 'approved');
    const totalApproved = approvedList.reduce((sum, e) => sum + (e.amount || 0), 0);

    const thisMonthApproved = expenses
      .filter((e) => e.status === 'approved' && e.expense_date && e.expense_date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingList = yearFilteredExps.filter((e) => e.status === 'pending');
    const totalPending = pendingList.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      totalApproved,
      thisMonthApproved,
      totalPending,
      pendingCount: pendingList.length,
      approvedCount: approvedList.length,
      totalCount: yearFilteredExps.length,
    };
  }, [expenses, targetYearVal]);

  // Category Spending Distribution
  const categoryDistribution = useMemo(() => {
    const yearExps = targetYearVal
      ? expenses.filter((e) => e.status === 'approved' && e.expense_date && new Date(e.expense_date).getFullYear() === targetYearVal)
      : expenses.filter((e) => e.status === 'approved');

    const catMap: Record<string, { name: string; amount: number; count: number }> = {};
    let grandTotal = 0;

    yearExps.forEach((e) => {
      const cName = e.category_name || 'Uncategorized';
      if (!catMap[cName]) {
        catMap[cName] = { name: cName, amount: 0, count: 0 };
      }
      catMap[cName].amount += e.amount || 0;
      catMap[cName].count += 1;
      grandTotal += e.amount || 0;
    });

    return Object.values(catMap)
      .map((item) => ({
        ...item,
        percentage: grandTotal > 0 ? Math.round((item.amount / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, targetYearVal]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPaymentMethod('all');
    setSelectedStatus('all');
    setSelectedFund('all');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  // Open Add Expense Modal
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

  // Open Edit Expense Modal
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

  // Save Expense Handler
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

  // Details Modal
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

  // Reject Modal
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

  // Delete / Void Modal
  const handleOpenDeleteVoidModal = (exp: Expense, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (exp.status === 'approved') {
      setVoidingExpense(exp);
      setVoidReason('');
      setIsVoidModalOpen(true);
    } else {
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

    const catTotals: Record<string, number> = {};
    approvedList.forEach((e) => {
      catTotals[e.category_name] = (catTotals[e.category_name] || 0) + e.amount;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mahallu Expense Report - ${targetYearVal ? 'Year ' + targetYearVal : 'All Time'}</title>
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
            <div class="metric-val" style="color:#0f172a;">${targetYearVal ? 'Year ' + targetYearVal : 'All Time'}</div>
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

  // Add / Edit Category Handlers
  const handleOpenCatModal = (cat?: ExpenseCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatFormData({ name: cat.name, description: cat.description || '', is_active: cat.is_active });
    } else {
      setEditingCategory(null);
      setCatFormData({ name: '', description: '', is_active: true });
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormData.name.trim()) {
      showToast('error', 'Category name is required');
      return;
    }
    setIsSubmittingCat(true);
    try {
      if (editingCategory) {
        await db.expenseCategories.update(editingCategory.id, {
          name: catFormData.name.trim(),
          description: catFormData.description.trim() || null,
          is_active: catFormData.is_active,
        });
        showToast('success', '✓ Expense category updated');
      } else {
        await db.expenseCategories.create({
          name: catFormData.name.trim(),
          description: catFormData.description.trim() || null,
          is_active: catFormData.is_active,
        });
        showToast('success', '✓ New expense category created');
      }
      setIsCatModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', `Failed to save category: ${err?.message || String(err)}`);
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleToggleCatActive = async (cat: ExpenseCategory) => {
    try {
      await db.expenseCategories.update(cat.id, { is_active: !cat.is_active });
      showToast('success', `Category "${cat.name}" updated`);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to update category status');
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const q = categorySearch.toLowerCase().trim();
      const matchQ = !q || c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q));
      const matchSt = categoryStatusFilter === 'all' || (categoryStatusFilter === 'active' && c.is_active) || (categoryStatusFilter === 'inactive' && !c.is_active);
      return matchQ && matchSt;
    });
  }, [categories, categorySearch, categoryStatusFilter]);

  return (
    <div className="expenses-page-container animate-fade-in padding-md">
      {/* TOAST BANNER */}
      {toast && (
        <div className={`toast-notification ${toast.type} animate-bounce-in`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999 }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* PAGE HEADER & CTA GROUP */}
      <div className="page-header-actions margin-bottom-md">
        <div>
          <h3 className="font-xl font-weight-800 color-heading flex-center gap-xs">
            <TrendingDown className="text-purple" size={26} /> Expenses & Disbursements
          </h3>
          <p className="page-subtitle font-sm color-subtle">Record, categorize, track approval workflows, and audit every expense made by the Mahall.</p>
        </div>

        <div className="header-cta-group">
          <YearFilter
            selectedYearId={selectedYearId}
            onChange={setSelectedYearId}
            years={years}
            showAllOption={true}
            allOptionLabel="All Years"
          />

          <button
            type="button"
            className="btn btn-ghost font-xs text-purple flex-center gap-2xs border-purple-light"
            onClick={handlePrintExpensesPdf}
            title="Print Expenses PDF Report"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>

          <button className="btn btn-ghost font-xs text-subtle flex-center gap-2xs" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button className="btn btn-primary font-xs flex-center gap-2xs shadow-purple" onClick={handleOpenAddModal}>
            <Plus size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* MOBILE-ONLY VIEW SELECTOR DROPDOWN */}
      <div className="mobile-only-view-select margin-bottom-md">
        <label htmlFor="mobile-exp-view-select" className="font-xs font-weight-700 color-subtle display-block margin-bottom-xs">
          Select View:
        </label>
        <select
          id="mobile-exp-view-select"
          className="form-control font-weight-700 text-purple"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as 'overview' | 'expenses' | 'categories')}
          style={{
            borderRadius: 12,
            padding: '10px 14px',
            border: '1.5px solid #7c3aed',
            background: '#ffffff',
            color: '#7c3aed',
            fontWeight: 700,
            fontSize: '14px',
            width: '100%',
          }}
        >
          <option value="overview">📊 Analytics & Overview</option>
          <option value="expenses">💸 Expense Transactions ({filteredExpenses.length})</option>
          <option value="categories">🏷️ Expense Categories ({categories.length})</option>
        </select>
      </div>

      {/* DESKTOP & TABLET SELECTION TABS ONLY */}
      <div className="desktop-tab-pills-bar margin-bottom-lg">
        <button
          className={`tab-pill-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers size={16} />
          <span>Analytics & Overview</span>
        </button>

        <button
          className={`tab-pill-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <TrendingDown size={16} />
          <span>Expense Transactions ({filteredExpenses.length})</span>
        </button>

        <button
          className={`tab-pill-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Tag size={16} />
          <span>Expense Categories ({categories.length})</span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════
          TAB 1: ANALYTICS & OVERVIEW DASHBOARD
      ════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="overview-tab-content animate-fade-in">
          {/* STATS CARDS GRID */}
          <div className="stats-dashboard-grid margin-bottom-lg">
            <div className="stat-metric-card glass-card shadow-sm padding-md">
              <div className="metric-icon-box purple">
                <TrendingDown size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label font-2xs text-uppercase color-subtle font-weight-700 display-block margin-bottom-3xs">Approved Expenses</span>
                <h3 className="metric-value font-xl font-weight-800 text-purple margin-none">₹{topMetrics.totalApproved.toLocaleString('en-IN')}</h3>
                <span className="metric-sub font-3xs color-subtle display-block margin-top-3xs">{topMetrics.approvedCount} approved transactions {targetYearVal ? `(${targetYearVal})` : ''}</span>
              </div>
            </div>

            <div className="stat-metric-card glass-card shadow-sm padding-md">
              <div className="metric-icon-box emerald">
                <Calendar size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label font-2xs text-uppercase color-subtle font-weight-700 display-block margin-bottom-3xs">This Month Disbursed</span>
                <h3 className="metric-value font-xl font-weight-800 text-success margin-none">₹{topMetrics.thisMonthApproved.toLocaleString('en-IN')}</h3>
                <span className="metric-sub font-3xs color-subtle display-block margin-top-3xs">Current month disbursements</span>
              </div>
            </div>

            <div className="stat-metric-card glass-card shadow-sm padding-md">
              <div className="metric-icon-box amber">
                <Clock size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label font-2xs text-uppercase color-subtle font-weight-700 display-block margin-bottom-3xs">Pending Approval</span>
                <h3 className="metric-value font-xl font-weight-800 text-warning margin-none">₹{topMetrics.totalPending.toLocaleString('en-IN')}</h3>
                <span className="metric-sub font-3xs color-subtle display-block margin-top-3xs">{topMetrics.pendingCount} expenses awaiting review</span>
              </div>
            </div>

            <div className="stat-metric-card glass-card shadow-sm padding-md">
              <div className="metric-icon-box primary">
                <Tag size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label font-2xs text-uppercase color-subtle font-weight-700 display-block margin-bottom-3xs">Active Categories</span>
                <h3 className="metric-value font-xl font-weight-800 color-heading margin-none">{categories.filter(c => c.is_active).length}</h3>
                <span className="metric-sub font-3xs color-subtle display-block margin-top-3xs">Out of {categories.length} configured</span>
              </div>
            </div>
          </div>

          {/* SPENDING DISTRIBUTION & CATEGORIES BREAKDOWN */}
          <div className="grid-layout cols-2 gap-lg margin-bottom-lg">
            {/* Category Breakdown Progress */}
            <div className="glass-card padding-lg">
              <div className="flex-between margin-bottom-md border-bottom padding-bottom-xs">
                <h4 className="font-md font-weight-700 color-heading flex-center gap-xs">
                  <PieChart size={18} className="text-purple" /> Spending Distribution by Category
                </h4>
                <span className="font-xs color-subtle font-weight-600">{targetYearVal ? `Year ${targetYearVal}` : 'All Time'}</span>
              </div>

              {categoryDistribution.length === 0 ? (
                <div className="padding-lg text-center color-subtle font-sm">
                  No approved expenses recorded yet for category distribution analysis.
                </div>
              ) : (
                <div className="category-progress-list">
                  {categoryDistribution.slice(0, 7).map((item) => (
                    <div key={item.name} className="margin-bottom-md">
                      <div className="flex-between font-xs margin-bottom-2xs">
                        <span className="font-weight-600 color-heading flex-center gap-2xs">
                          {item.name} <span className="badge badge-subtle font-3xs">({item.count} exps)</span>
                        </span>
                        <span className="font-weight-700 text-purple flex-center gap-2xs">
                          ₹{item.amount.toLocaleString('en-IN')} <span className="badge badge-purple-light font-3xs">({item.percentage}%)</span>
                        </span>
                      </div>
                      <div className="progress-bar-bg" style={{ height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${item.percentage}%`,
                            background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)',
                            borderRadius: 6,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions & Governance Banner */}
            <div className="glass-card padding-lg flex-between flex-column">
              <div>
                <div className="flex-between margin-bottom-md border-bottom padding-bottom-xs">
                  <h4 className="font-md font-weight-700 color-heading flex-center gap-xs">
                    <ShieldCheck size={18} className="text-purple" /> Expense Governance & Audit Rules
                  </h4>
                </div>

                <div className="font-sm color-subtle margin-bottom-md" style={{ lineHeight: 1.7 }}>
                  <p className="margin-bottom-xs flex-start gap-xs">
                    <CheckCircle size={16} className="text-success flex-shrink-0 margin-top-3xs" />
                    <span><strong>Financial Integrity:</strong> Only approved expenses subtract from the official Mahall cashbook balance.</span>
                  </p>
                  <p className="margin-bottom-xs flex-start gap-xs">
                    <CheckCircle size={16} className="text-success flex-shrink-0 margin-top-3xs" />
                    <span><strong>Audit Trail Compliance:</strong> Any edit to an approved expense requires a mandatory change justification and is recorded in immutable audit logs.</span>
                  </p>
                  <p className="flex-start gap-xs">
                    <CheckCircle size={16} className="text-success flex-shrink-0 margin-top-3xs" />
                    <span><strong>Permanent Preservation:</strong> Approved expenses cannot be deleted; they are marked as <em>Voided</em> to prevent accounting records from disappearing.</span>
                  </p>
                </div>
              </div>

              <div className="flex-between gap-sm border-top padding-top-sm width-full">
                <button
                  className="btn btn-ghost font-xs text-purple flex-center gap-2xs"
                  onClick={() => setActiveTab('categories')}
                >
                  <Tag size={15} /> Manage Categories
                </button>
                <button
                  className="btn btn-primary font-xs flex-center gap-2xs"
                  onClick={() => setActiveTab('expenses')}
                >
                  View All Expenses <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 2: EXPENSE TRANSACTIONS TABLE
      ════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <div className="expenses-tab-content animate-fade-in">
          {/* SEARCH & FILTERS BAR */}
          <div className="glass-card padding-md margin-bottom-lg">
            <div className="flex-between flex-wrap gap-md margin-bottom-sm">
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

              <div className="flex-center gap-xs flex-wrap">
                <div className="flex-center gap-2xs">
                  <span className="font-xs font-weight-600 color-subtle">Category:</span>
                  <select
                    className="styled-select-input font-xs"
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

                <div className="flex-center gap-2xs">
                  <span className="font-xs font-weight-600 color-subtle">Method:</span>
                  <select
                    className="styled-select-input font-xs"
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

                <div className="flex-center gap-2xs">
                  <span className="font-xs font-weight-600 color-subtle">Status:</span>
                  <select
                    className="styled-select-input font-xs"
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

            <div className="flex-start gap-md flex-wrap border-top padding-top-xs font-xs color-subtle">
              <div className="flex-center gap-xs">
                <span>From Date:</span>
                <input
                  type="date"
                  className="styled-date-input padding-2xs font-xs"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="flex-center gap-xs">
                <span>To Date:</span>
                <input
                  type="date"
                  className="styled-date-input padding-2xs font-xs"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="flex-center gap-xs">
                <span>Fund / Account:</span>
                <select
                  className="styled-select-input padding-2xs font-xs"
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

          {/* TABLE & CARDS */}
          {isLoading ? (
            <div className="glass-card padding-xl text-center">
              <RefreshCw size={28} className="animate-spin text-purple margin-bottom-sm" />
              <p className="color-subtle">Loading expense records...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="glass-card padding-xl text-center">
              <TrendingDown size={44} className="color-subtle margin-bottom-sm opacity-40" />
              <h3 className="font-lg font-weight-600 color-heading">No Expenses Found</h3>
              <p className="color-subtle font-sm margin-top-xs">
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'No expenses match your current filters. Try resetting your search or filters.'
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
              {/* DESKTOP TABLE VIEW */}
              <div className="table-responsive glass-card margin-bottom-md desktop-expenses-table-only">
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
                            <span className="badge badge-subtle font-2xs">{exp.created_by}</span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="flex-center justify-end gap-xs">
                              <button
                                className="btn btn-ghost btn-xs text-subtle"
                                title="View Expense Details"
                                onClick={() => handleOpenDetails(exp)}
                              >
                                <Eye size={15} />
                              </button>

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

                              <button
                                className="btn btn-ghost btn-xs text-primary"
                                title="Edit Expense"
                                onClick={() => handleOpenEditModal(exp)}
                              >
                                <Edit2 size={15} />
                              </button>

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

              {/* MOBILE EXPENSES CARD GRID VIEW */}
              <div className="mobile-expenses-cards-grid mobile-only margin-bottom-md">
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
                    <div
                      key={exp.id}
                      className="mobile-expense-card glass-card padding-md margin-bottom-sm shadow-sm"
                      onClick={() => handleOpenDetails(exp)}
                      style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#ffffff' }}
                    >
                      <div className="flex-between margin-bottom-xs">
                        <span className="font-weight-800 text-purple font-sm">{exp.expense_number}</span>
                        <span className={`badge ${sb.cls} font-xs flex-center gap-3xs`}>
                          <IconComp size={12} /> {sb.label}
                        </span>
                      </div>

                      <h4 className="font-md font-weight-700 color-heading margin-bottom-xs line-clamp-2">
                        {exp.description}
                      </h4>

                      <div className="flex-between font-xs color-subtle margin-bottom-xs flex-wrap gap-2xs">
                        <span className="font-weight-600 color-heading">Paid To: {exp.paid_to}</span>
                        <span className="badge badge-purple-light font-2xs">{exp.category_name}</span>
                      </div>

                      <div className="flex-between font-2xs color-subtle margin-bottom-sm">
                        <span>Date: {exp.expense_date}</span>
                        <span className="text-uppercase font-weight-600">{exp.payment_method.replace('_', ' ')}</span>
                      </div>

                      <div className="flex-between border-top padding-top-xs align-center">
                        <div>
                          <span className="font-3xs color-subtle display-block text-uppercase">Amount</span>
                          <span className="font-md font-weight-800 text-purple">₹{exp.amount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="flex-center gap-xs" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-xs text-subtle" onClick={() => handleOpenDetails(exp)} title="View Details">
                            <Eye size={16} />
                          </button>
                          {exp.status === 'pending' && (
                            <>
                              <button className="btn btn-ghost btn-xs text-success" onClick={(e) => handleApproveExpense(exp, e)} title="Approve">
                                <CheckCircle size={16} />
                              </button>
                              <button className="btn btn-ghost btn-xs text-danger" onClick={(e) => handleOpenRejectModal(exp, e)} title="Reject">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button className="btn btn-ghost btn-xs text-primary" onClick={() => handleOpenEditModal(exp)} title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button className="btn btn-ghost btn-xs text-danger" onClick={(e) => handleOpenDeleteVoidModal(exp, e)} title="Delete / Void">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

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
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 3: EXPENSE CATEGORIES MANAGEMENT
      ════════════════════════════════════════════════ */}
      {activeTab === 'categories' && (
        <div className="categories-tab-content animate-fade-in">
          <div className="glass-card padding-md margin-bottom-lg">
            <div className="flex-between flex-wrap gap-md">
              <div className="search-input-wrapper flex-grow" style={{ minWidth: 260 }}>
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search category name or description..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
              </div>

              <div className="flex-center gap-sm">
                <select
                  className="styled-select-input font-sm"
                  value={categoryStatusFilter}
                  onChange={(e) => setCategoryStatusFilter(e.target.value as any)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <button className="btn btn-primary font-xs flex-center gap-2xs" onClick={() => handleOpenCatModal()}>
                  <Plus size={16} /> Add Category
                </button>
              </div>
            </div>
          </div>

          {/* DESKTOP CATEGORY TABLE VIEW */}
          <div className="table-responsive glass-card desktop-expenses-table-only">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Disbursed Total</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => {
                  const catExps = expenses.filter(e => e.status === 'approved' && (e.category_id === cat.id || e.category_name === cat.name));
                  const catTotal = catExps.reduce((s, e) => s + (e.amount || 0), 0);

                  return (
                    <tr key={cat.id}>
                      <td>
                        <div className="flex-center gap-xs font-weight-600 color-heading">
                          <Tag size={15} className="text-purple" />
                          {cat.name}
                        </div>
                      </td>
                      <td>
                        <span className="font-sm color-subtle">{cat.description || 'No description provided.'}</span>
                      </td>
                      <td>
                        <span className={`badge ${cat.is_active ? 'badge-success' : 'badge-subtle'}`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span className="font-sm font-weight-700 text-purple">₹{catTotal.toLocaleString('en-IN')}</span>{' '}
                        <span className="badge badge-subtle font-2xs">({catExps.length} exps)</span>
                      </td>
                      <td>
                        <div className="flex-center justify-end gap-xs">
                          <button
                            className="btn btn-ghost btn-xs text-primary"
                            title="Edit Category"
                            onClick={() => handleOpenCatModal(cat)}
                          >
                            <Edit2 size={15} /> Edit
                          </button>
                          <button
                            className={`btn btn-ghost btn-xs ${cat.is_active ? 'text-danger' : 'text-success'}`}
                            title={cat.is_active ? 'Disable Category' : 'Enable Category'}
                            onClick={() => handleToggleCatActive(cat)}
                          >
                            {cat.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CATEGORIES CARD GRID VIEW */}
          <div className="mobile-categories-cards-grid mobile-only margin-bottom-md">
            {filteredCategories.map((cat) => {
              const catExps = expenses.filter(e => e.status === 'approved' && (e.category_id === cat.id || e.category_name === cat.name));
              const catTotal = catExps.reduce((s, e) => s + (e.amount || 0), 0);

              return (
                <div key={cat.id} className="glass-card padding-md margin-bottom-sm shadow-sm" style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <div className="flex-between margin-bottom-xs">
                    <span className="font-weight-700 color-heading font-sm flex-center gap-2xs">
                      <Tag size={15} className="text-purple" /> {cat.name}
                    </span>
                    <span className={`badge ${cat.is_active ? 'badge-success' : 'badge-subtle'} font-2xs`}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="font-xs color-subtle margin-bottom-xs">{cat.description || 'No description provided.'}</p>
                  <div className="flex-between border-top padding-top-xs align-center">
                    <div>
                      <span className="font-3xs color-subtle text-uppercase display-block">Total Disbursed</span>
                      <span className="font-sm font-weight-800 text-purple">₹{catTotal.toLocaleString('en-IN')} <span className="font-3xs color-subtle">({catExps.length} exps)</span></span>
                    </div>
                    <div className="flex-center gap-xs">
                      <button className="btn btn-ghost btn-xs text-primary" onClick={() => handleOpenCatModal(cat)}>
                        <Edit2 size={15} /> Edit
                      </button>
                      <button className={`btn btn-ghost btn-xs ${cat.is_active ? 'text-danger' : 'text-success'}`} onClick={() => handleToggleCatActive(cat)}>
                        {cat.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD / EDIT EXPENSE FORM MODAL OVERLAY */}
      {isFormModalOpen && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-dialog">
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

              {formData.payment_method === 'bank_transfer' && (
                <div className="grid-layout cols-2 gap-md margin-bottom-md padding-sm bg-subtle radius-md">
                  <div>
                    <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">Bank Account</label>
                    <input
                      type="text"
                      className="form-input font-xs"
                      placeholder="e.g. SBI A/C 39847291"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">Transaction Reference</label>
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
                  <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">UPI Reference ID</label>
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
                    <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">Cheque Number</label>
                    <input
                      type="text"
                      className="form-input font-xs"
                      placeholder="e.g. CHQ-98273"
                      value={formData.cheque_number}
                      onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label font-2xs color-subtle margin-bottom-2xs display-block">Bank Name</label>
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

              <div className="grid-layout cols-2 gap-md margin-bottom-md">
                <div>
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">Fund / Account</label>
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
                  <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">Initial Status</label>
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

              <div className="margin-bottom-md">
                <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">Attachment (Receipt / Bill URL or filename)</label>
                <input
                  type="text"
                  className="form-input font-xs"
                  placeholder="e.g. electricity-bill-august.pdf"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                />
              </div>

              <div className="margin-bottom-md">
                <label className="form-label font-xs font-weight-600 margin-bottom-2xs display-block">Notes / Internal Comments</label>
                <textarea
                  className="form-textarea font-xs"
                  rows={2}
                  placeholder="Optional context..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

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

              <div className="flex-between gap-sm margin-top-md border-top padding-top-sm">
                <button type="button" className="btn btn-ghost" onClick={() => setIsFormModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-center gap-xs" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving Expense...' : editingExpense ? 'Update Expense' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL OVERLAY */}
      {isDetailsModalOpen && viewingExpense && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-dialog" style={{ maxWidth: 650 }}>
            <div className="flex-between border-bottom padding-bottom-sm margin-bottom-md">
              <div>
                <span className="font-2xs font-weight-700 text-purple text-uppercase">Expense Record #{viewingExpense.expense_number}</span>
                <h2 className="font-lg font-weight-800 color-heading margin-none">₹{viewingExpense.amount.toLocaleString('en-IN')}</h2>
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
            </div>

            {viewingAuditLogs.length > 0 && (
              <div className="border-top padding-top-sm">
                <span className="font-2xs font-weight-700 text-uppercase color-subtle display-block margin-bottom-xs">Audit History Log</span>
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
              <button className="btn btn-ghost" onClick={() => setIsDetailsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL OVERLAY */}
      {isRejectModalOpen && rejectingExpense && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-dialog" style={{ maxWidth: 450 }}>
            <h3 className="font-md font-weight-700 color-heading margin-bottom-xs">Reject Expense #{rejectingExpense.expense_number}?</h3>
            <textarea
              className="form-textarea font-xs margin-bottom-md"
              rows={3}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
            <div className="flex-between gap-sm">
              <button className="btn btn-ghost" onClick={() => setIsRejectModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmReject}>Reject Expense</button>
            </div>
          </div>
        </div>
      )}

      {/* VOID MODAL OVERLAY */}
      {isVoidModalOpen && voidingExpense && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-dialog" style={{ maxWidth: 450 }}>
            <h3 className="font-md font-weight-700 text-danger margin-bottom-xs">Void Approved Expense #{voidingExpense.expense_number}?</h3>
            <textarea
              className="form-textarea font-xs margin-bottom-md"
              rows={3}
              placeholder="Enter void justification reason..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              required
            />
            <div className="flex-between gap-sm">
              <button className="btn btn-ghost" onClick={() => setIsVoidModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmVoid}>Void Expense Record</button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY ADD/EDIT MODAL OVERLAY */}
      {isCatModalOpen && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-dialog" style={{ maxWidth: 500 }}>
            <div className="flex-between margin-bottom-md border-bottom padding-bottom-sm">
              <h2 className="font-lg font-weight-700 color-heading flex-center gap-xs">
                <Tag size={20} className="text-purple" />
                {editingCategory ? 'Edit Expense Category' : 'Add New Expense Category'}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsCatModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveCat}>
              <div className="margin-bottom-md">
                <label className="form-label font-sm font-weight-600 margin-bottom-xs display-block">
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maintenance, Electricity"
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="margin-bottom-md">
                <label className="form-label font-sm font-weight-600 margin-bottom-xs display-block">Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Optional details..."
                  value={catFormData.description}
                  onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                />
              </div>

              <div className="margin-bottom-lg flex-center gap-sm">
                <input
                  type="checkbox"
                  id="cat_active_checkbox"
                  checked={catFormData.is_active}
                  onChange={(e) => setCatFormData({ ...catFormData, is_active: e.target.checked })}
                />
                <label htmlFor="cat_active_checkbox" className="font-sm cursor-pointer color-heading font-weight-500">
                  Active (Can be selected when recording new expenses)
                </label>
              </div>

              <div className="flex-between gap-sm margin-top-md border-top padding-top-sm">
                <button type="button" className="btn btn-ghost" onClick={() => setIsCatModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingCat}>
                  {isSubmittingCat ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMBEDDED STYLES FOR ABSOLUTE DESIGN PERFECTION & RESPONSIVENESS */}
      <style>{`
        /* Desktop vs Mobile Tab Visibility */
        .mobile-only-view-select {
          display: none;
        }
        .desktop-tab-pills-bar {
          display: flex;
          gap: 10px;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 8px;
        }
        .tab-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-pill-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .tab-pill-btn.active {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: #ffffff;
          border-color: #6d28d9;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
        }

        /* Styled Filter Inputs */
        .styled-select-input {
          padding: 7px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          color: #334155;
          outline: none;
          transition: border-color 0.2s;
        }
        .styled-select-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
        }
        .styled-date-input {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 13px;
          color: #334155;
        }

        /* Modal Backdrop Fixed Overlay */
        .custom-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(6px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .custom-modal-dialog {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 650px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        @media (max-width: 768px) {
          .desktop-tab-pills-bar {
            display: none !important;
          }
          .mobile-only-view-select {
            display: block !important;
          }
          .desktop-expenses-table-only {
            display: none !important;
          }
          .mobile-only {
            display: block !important;
          }
          .stats-dashboard-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .page-header-actions {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .header-cta-group {
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .header-cta-group button, .header-cta-group .year-filter-pill {
            flex: 1 1 calc(50% - 6px) !important;
            justify-content: center !important;
            font-size: 12px !important;
            padding: 8px 10px !important;
          }
          .search-input-wrapper {
            width: 100% !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Expenses;
