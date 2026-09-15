import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tag, Plus, Edit2, CheckCircle, XCircle, Search, ArrowLeft, Filter, RefreshCw
} from 'lucide-react';
import { db } from '../../services/db';
import type { ExpenseCategory, Expense } from '../../services/db';

export const ExpenseCategories: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
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
      const [cats, exps] = await Promise.all([
        db.expenseCategories.getAll(),
        db.expenses.getAll(),
      ]);
      setCategories(cats || []);
      setExpenses(exps || []);
    } catch (e) {
      console.error('Failed to load categories:', e);
      showToast('error', 'Failed to load expense categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category Statistics
  const categoryStats = useMemo(() => {
    const statsMap: Record<string, { count: number; totalAmount: number }> = {};
    expenses.forEach((exp) => {
      if (exp.status === 'voided') return;
      const catId = exp.category_id || exp.category_name;
      if (!statsMap[catId]) {
        statsMap[catId] = { count: 0, totalAmount: 0 };
      }
      statsMap[catId].count += 1;
      statsMap[catId].totalAmount += exp.amount || 0;

      // Also match by category_name if catId was uuid
      if (exp.category_name && !statsMap[exp.category_name]) {
        statsMap[exp.category_name] = statsMap[catId];
      }
    });
    return statsMap;
  }, [expenses]);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && cat.is_active) ||
        (statusFilter === 'inactive' && !cat.is_active);
      return matchSearch && matchStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', is_active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      is_active: cat.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Category name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await db.expenseCategories.update(editingCategory.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_active: formData.is_active,
        });
        showToast('success', '✓ Expense category updated successfully');
      } else {
        await db.expenseCategories.create({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_active: formData.is_active,
        });
        showToast('success', '✓ New expense category created successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', `Failed to save category: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: ExpenseCategory) => {
    try {
      await db.expenseCategories.update(cat.id, { is_active: !cat.is_active });
      showToast('success', `Category "${cat.name}" is now ${!cat.is_active ? 'Active' : 'Inactive'}`);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to toggle category status');
    }
  };

  return (
    <div className="page-container padding-lg">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header flex-between margin-bottom-lg flex-wrap gap-md">
        <div>
          <button
            className="btn btn-ghost btn-sm margin-bottom-xs text-subtle flex-center gap-xs"
            onClick={() => navigate('/admin/expenses')}
          >
            <ArrowLeft size={16} /> Back to Expenses
          </button>
          <h1 className="font-xl font-weight-700 color-heading flex-center gap-sm">
            <Tag className="text-purple" size={26} /> Expense Categories
          </h1>
          <p className="color-subtle font-sm margin-top-xs">
            Manage official Mahall expense categories, status, and budget tracking.
          </p>
        </div>

        <div className="flex-center gap-sm">
          <button className="btn btn-primary flex-center gap-xs" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="glass-card padding-md margin-bottom-lg">
        <div className="flex-between flex-wrap gap-md">
          <div className="search-input-wrapper flex-grow" style={{ minWidth: 260 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search category name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-center gap-sm flex-wrap">
            <div className="flex-center gap-xs">
              <Filter size={15} className="color-subtle" />
              <select
                className="select-input font-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <button className="btn btn-ghost btn-sm text-subtle flex-center gap-xs" onClick={loadData}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Categories Grid / Table */}
      {isLoading ? (
        <div className="glass-card padding-xl text-center">
          <RefreshCw size={28} className="animate-spin text-purple margin-bottom-sm" />
          <p className="color-subtle">Loading expense categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="glass-card padding-xl text-center">
          <Tag size={40} className="color-subtle margin-bottom-sm opacity-50" />
          <h3 className="font-lg font-weight-600 color-heading">No Categories Found</h3>
          <p className="color-subtle font-sm margin-top-xs">
            {searchQuery ? 'Try adjusting your search query or status filter.' : 'Start by adding your first expense category.'}
          </p>
          <button className="btn btn-primary margin-top-md" onClick={handleOpenAdd}>
            + Add Expense Category
          </button>
        </div>
      ) : (
        <div className="table-responsive glass-card">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Transactions</th>
                <th>Total Spent</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat) => {
                const stat = categoryStats[cat.id] || categoryStats[cat.name] || { count: 0, totalAmount: 0 };
                return (
                  <tr key={cat.id}>
                    <td>
                      <div className="flex-center gap-xs font-weight-600 color-heading">
                        <Tag size={15} className="text-purple" />
                        {cat.name}
                      </div>
                    </td>
                    <td>
                      <span className="font-sm color-subtle">
                        {cat.description || 'No description provided.'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${cat.is_active ? 'badge-success' : 'badge-subtle'}`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="font-sm font-weight-600">{stat.count} expenses</span>
                    </td>
                    <td>
                      <span className="font-sm font-weight-700 text-purple">
                        ₹{stat.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <div className="flex-center justify-end gap-xs">
                        <button
                          className="btn btn-ghost btn-xs text-primary"
                          title="Edit Category"
                          onClick={() => handleOpenEdit(cat)}
                        >
                          <Edit2 size={15} /> Edit
                        </button>

                        <button
                          className={`btn btn-ghost btn-xs ${cat.is_active ? 'text-danger' : 'text-success'}`}
                          title={cat.is_active ? 'Disable Category' : 'Enable Category'}
                          onClick={() => handleToggleActive(cat)}
                        >
                          {cat.is_active ? (
                            <span className="flex-center gap-xs"><XCircle size={15} /> Disable</span>
                          ) : (
                            <span className="flex-center gap-xs"><CheckCircle size={15} /> Enable</span>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content padding-lg" style={{ maxWidth: 500 }}>
            <div className="flex-between margin-bottom-md border-bottom padding-bottom-sm">
              <h2 className="font-lg font-weight-700 color-heading flex-center gap-xs">
                <Tag size={20} className="text-purple" />
                {editingCategory ? 'Edit Expense Category' : 'Add New Expense Category'}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="margin-bottom-md">
                <label className="form-label font-sm font-weight-600 margin-bottom-xs display-block">
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maintenance, Electricity, Salary"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="margin-bottom-md">
                <label className="form-label font-sm font-weight-600 margin-bottom-xs display-block">
                  Description
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Optional details about this expense category..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="margin-bottom-lg flex-center gap-sm">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <label htmlFor="is_active_checkbox" className="font-sm cursor-pointer color-heading font-weight-500">
                  Active (Can be selected when recording new expenses)
                </label>
              </div>

              <div className="flex-between gap-sm margin-top-md border-top padding-top-sm">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-center gap-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseCategories;
