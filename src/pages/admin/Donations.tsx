import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';
import type { 
  Donation, DonationCampaign, SubscriptionYear 
} from '../../services/db';
import { 
  Plus, Search, Filter, Calendar, X, AlertCircle, 
  CheckCircle, DollarSign, Eye,
  Download, Edit2, Trash2, User,
  Printer, RefreshCw, HeartHandshake,
  TrendingUp, CalendarDays, Target, Award, QrCode, ChevronLeft, ChevronRight,
  Wallet, FileSpreadsheet, Upload
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { Modal } from '../../components/Modal';
import { SidePanel } from '../../components/SidePanel';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useOrganization } from '../../contexts/OrganizationContext';

export const Donations: React.FC = () => {
  const navigate = useNavigate();
  const { branding } = useOrganization();

  // Primary Sub-Tab State ('all' | 'general' | 'campaigns')
  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'campaigns'>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Data States
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDonationType, setSelectedDonationType] = useState<'' | 'general' | 'campaign'>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedDonorType, setSelectedDonorType] = useState<'' | 'member' | 'external' | 'anonymous'>('');
  const [selectedStatus, setSelectedStatus] = useState<'' | 'received' | 'pending' | 'cancelled' | 'refunded'>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'name'>('newest');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Mobile Bottom-Sheet Filter State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // View Details Drawer & Printable Receipt Modal States
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedDonationRecord, setSelectedDonationRecord] = useState<Donation | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<Donation | null>(null);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [yearList, donationList, campaignList] = await Promise.all([
        db.years.get(),
        db.donations.get(),
        db.donationCampaigns.get(),
      ]);
      setYears(yearList || []);
      setDonations(donationList || []);
      setCampaigns(campaignList || []);
    } catch (err) {
      console.error('Failed to load donation records:', err);
      setFetchError(true);
      showToast('error', 'Failed to load donation records from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Compute 6 Summary Metric Cards
  const metrics = useMemo(() => {
    const totalDonationsSum = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayCollection = donations
      .filter((d) => d.donation_date === todayStr)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const now = new Date();
    const monthlyCollection = donations
      .filter((d) => {
        if (!d.donation_date) return false;
        const dt = new Date(d.donation_date);
        return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
      })
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const currentYearNum = selectedYearId 
      ? (years.find((y) => y.id === selectedYearId)?.year ?? now.getFullYear())
      : now.getFullYear();

    const yearlyCollection = donations
      .filter((d) => {
        if (!d.donation_date) return false;
        return new Date(d.donation_date).getFullYear() === currentYearNum;
      })
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const campaignDonationsSum = donations
      .filter((d) => d.donation_type === 'campaign')
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const generalDonationsSum = donations
      .filter((d) => d.donation_type === 'general')
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    return {
      totalDonationsSum,
      todayCollection,
      monthlyCollection,
      yearlyCollection,
      campaignDonationsSum,
      generalDonationsSum,
      currentYearNum,
    };
  }, [donations, years, selectedYearId]);

  // Filtered & Sorted Donations
  const filteredDonations = useMemo(() => {
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    let result = donations.filter((d) => {
      // Sub-tab filter
      if (activeTab === 'general' && d.donation_type !== 'general') return false;
      if (activeTab === 'campaigns' && d.donation_type !== 'campaign') return false;

      const query = searchQuery.toLowerCase().trim();
      const matchSearch = !query || (
        (d.donor_name && d.donor_name.toLowerCase().includes(query)) ||
        (d.receipt_number && d.receipt_number.toLowerCase().includes(query)) ||
        (d.reference_number && d.reference_number.toLowerCase().includes(query)) ||
        (d.donor_phone && d.donor_phone.includes(query)) ||
        (d.donor_member_id && d.donor_member_id.toLowerCase().includes(query)) ||
        (d.notes && d.notes.toLowerCase().includes(query))
      );

      const matchYear = !selectedYearId || !selectedYear || (d.donation_date && new Date(d.donation_date).getFullYear() === selectedYear);
      const matchType = !selectedDonationType || d.donation_type === selectedDonationType;
      const matchCampaign = !selectedCampaignId || d.campaign_id === selectedCampaignId;
      const matchMethod = !selectedMethod || d.payment_method === selectedMethod;
      const matchDonorType = !selectedDonorType || d.donor_type === selectedDonorType;
      const matchStatus = !selectedStatus || (d.status || 'received') === selectedStatus;

      return matchSearch && matchYear && matchType && matchCampaign && matchMethod && matchDonorType && matchStatus;
    });

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.donation_date).getTime() - new Date(a.donation_date).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.donation_date).getTime() - new Date(b.donation_date).getTime());
    } else if (sortBy === 'highest') {
      result.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.donor_name || 'Anonymous').localeCompare(b.donor_name || 'Anonymous'));
    }

    return result;
  }, [donations, searchQuery, activeTab, selectedYearId, selectedDonationType, selectedCampaignId, selectedMethod, selectedDonorType, selectedStatus, sortBy, years]);

  // Paginated Donations
  const totalPages = Math.ceil(filteredDonations.length / rowsPerPage) || 1;
  const paginatedDonations = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDonations.slice(start, start + rowsPerPage);
  }, [filteredDonations, currentPage, rowsPerPage]);



  const openAddDrawer = () => {
    navigate('/admin/donations/new');
  };

  const openEditDrawer = (d: Donation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/admin/donations/${d.id}/edit`);
  };

  const handleDeleteDonation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTargetId(id);
  };

  const handleConfirmDeleteDonation = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await db.donations.delete(deleteTargetId);
      showToast('success', 'Donation deleted from Supabase');
      setDeleteTargetId(null);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete donation');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedDonations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedDonations.map((d) => d.id));
    }
  };

  const handleSelectIndividual = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    try {
      await db.donations.deleteMultiple(selectedIds);
      showToast('success', `${selectedIds.length} donation records deleted`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to bulk delete donations');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedYearId('');
    setSelectedDonationType('');
    setSelectedCampaignId('');
    setSelectedMethod('');
    setSelectedDonorType('');
    setSelectedStatus('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const exportCSV = () => {
    if (filteredDonations.length === 0) {
      showToast('error', 'No donation records to export');
      return;
    }
    const headers = ['Receipt No', 'Donor Name', 'Type', 'Amount', 'Method', 'Date', 'Campaign', 'Status'];
    const rows = filteredDonations.map((d) => [
      d.receipt_number || 'N/A',
      d.donor_name || 'Anonymous',
      d.donation_type,
      d.amount,
      d.payment_method,
      d.donation_date,
      campaigns.find((c) => c.id === d.campaign_id)?.campaign_name || 'General',
      d.status || 'received',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `donations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Donations exported to CSV');
  };

  const openReceiptModal = (d: Donation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReceiptRecord(d);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="donations-page animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`}>
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="page-header flex-between margin-bottom">
        <div>
          <h1 className="page-title">Donation Records</h1>
          <p className="page-subtitle">Manage donations, campaigns & official receipts.</p>
        </div>

        <div className="header-cta-group flex-row-gap-sm">
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={() => setIsImportModalOpen(true)}>
            <FileSpreadsheet size={15} className="text-emerald" />
            <span>Import Data</span>
          </button>
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={exportCSV}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button className="add-btn primary-btn" onClick={openAddDrawer}>
            <Plus size={16} />
            <span>+ Record Donation</span>
          </button>
        </div>
      </div>

      {/* 2. DASHBOARD SUMMARY CARDS (6 RESPONSIVE METRIC CARDS WITH 24px BOTTOM GAP) */}
      <div className="stats-dashboard-grid-6 margin-bottom-lg">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="stat-metric-card shadow-sm">
                <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
                <div className="metric-info margin-left-xs">
                  <div className="skeleton-pulse" style={{ width: '70px', height: '12px' }}></div>
                  <div className="skeleton-pulse margin-top-xs" style={{ width: '90px', height: '22px' }}></div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box emerald">
                <Wallet size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Collection</span>
                <h3 className="metric-value text-success">{formatCurrency(metrics.totalDonationsSum)}</h3>
                <span className="metric-sub">All time recorded</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box green">
                <Calendar size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Today's Collection</span>
                <h3 className="metric-value">{formatCurrency(metrics.todayCollection)}</h3>
                <span className="metric-sub">Collected today</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box teal">
                <CalendarDays size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">This Month</span>
                <h3 className="metric-value">{formatCurrency(metrics.monthlyCollection)}</h3>
                <span className="metric-sub">This month total</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box primary">
                <TrendingUp size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Yearly Collection</span>
                <h3 className="metric-value text-primary">{formatCurrency(metrics.yearlyCollection)}</h3>
                <span className="metric-sub">In {metrics.currentYearNum}</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box purple">
                <Target size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Campaign Donations</span>
                <h3 className="metric-value">{formatCurrency(metrics.campaignDonationsSum)}</h3>
                <span className="metric-sub">Special campaigns</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box yellow">
                <HeartHandshake size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">General Donations</span>
                <h3 className="metric-value">{formatCurrency(metrics.generalDonationsSum)}</h3>
                <span className="metric-sub">General fund</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. UNIFIED WORKSPACE MAIN CONTAINER */}
      <div className="workspace-unified-card animate-fade-in">
        {/* SUB-TABS NAVIGATION BAR */}
        <div className="subtabs-navigation-bar">
          <div className="subtabs-group">
            <button
              className={`subtab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            >
              <span>All Contributions</span>
              <span className="badge-pill font-xs">({donations.length})</span>
            </button>
            <button
              className={`subtab-btn ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => { setActiveTab('general'); setCurrentPage(1); }}
            >
              <span>General Fund</span>
              <span className="badge-pill font-xs">({donations.filter(d => d.donation_type === 'general').length})</span>
            </button>
            <button
              className={`subtab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
              onClick={() => { setActiveTab('campaigns'); setCurrentPage(1); }}
            >
              <span>Campaign Funds</span>
              <span className="badge-pill font-xs">({donations.filter(d => d.donation_type === 'campaign').length})</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER TOOLBAR */}
        <div className="workspace-filter-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search donor name, receipt #, transaction ref #, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Desktop Filter Chips */}
          <div className="filter-selectors-grid desktop-filters-only">
            <YearFilter selectedYearId={selectedYearId} onChange={setSelectedYearId} showAllOption={true} />

            <div className="filter-select-wrapper">
              <select value={selectedDonorType} onChange={(e) => setSelectedDonorType(e.target.value as any)}>
                <option value="">Donor: All</option>
                <option value="member">Mahall Member</option>
                <option value="external">External Donor</option>
                <option value="anonymous">Anonymous</option>
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                <option value="">Method: All</option>
                <option value="upi">UPI / Online</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
                <option value="">Status: All</option>
                <option value="received">Received</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="highest">Sort: Highest Amount</option>
                <option value="lowest">Sort: Lowest Amount</option>
                <option value="name">Sort: Donor Name A-Z</option>
              </select>
            </div>

            {(searchQuery || selectedYearId || selectedDonationType || selectedCampaignId || selectedMethod || selectedDonorType || selectedStatus) && (
              <button className="clear-filters-link" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>

          {/* Mobile Filter Trigger */}
          <div className="mobile-filter-trigger">
            <button className="pill-btn-secondary" onClick={() => setIsMobileFilterOpen(true)}>
              <Filter size={15} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bulk-selection-bar flex-between p-xs bg-primary-light border-rounded margin-sm">
            <span className="font-weight-600 font-sm">{selectedIds.length} selected</span>
            <button className="pill-btn-danger font-xs" onClick={() => setIsBulkDeleteModalOpen(true)}>
              <Trash2 size={13} /> Delete Selected
            </button>
          </div>
        )}

        {/* WORKSPACE DIRECTORY CONTENT */}
        <div className="workspace-table-content">
          {fetchError ? (
            <div className="empty-state-card">
              <div className="empty-state-icon neutral">
                <AlertCircle size={32} className="text-danger" />
              </div>
              <h4>Unable to load donation records</h4>
              <p>Please check your network connection and try again.</p>
              <button className="add-btn primary-btn margin-top-sm" onClick={loadData}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : loading ? (
            <div className="skeleton-loading-container padding-md">
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          ) : paginatedDonations.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon emerald">
                <HeartHandshake size={32} />
              </div>
              <h4>No donation records found</h4>
              <p>
                {searchQuery || selectedYearId || selectedDonationType || selectedCampaignId || selectedMethod || selectedDonorType || selectedStatus
                  ? 'No records match your current search and filters. Try clearing filters.'
                  : 'Record a new donation to maintain accurate Mahall financial records.'}
              </p>
              {searchQuery || selectedYearId || selectedDonationType || selectedCampaignId || selectedMethod || selectedDonorType || selectedStatus ? (
                <button className="clear-filters-link margin-top-xs" onClick={clearFilters}>
                  Clear Filters
                </button>
              ) : (
                <button className="add-btn primary-btn margin-top-sm" onClick={openAddDrawer}>
                  <Plus size={16} />
                  <span>+ Record Donation</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP DIRECTORY TABLE */}
              <div className="table-responsive desktop-view-only">
                <table className="subscriptions-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.length === paginatedDonations.length && paginatedDonations.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={{ textAlign: 'left' }}>Receipt / Donor</th>
                      <th style={{ textAlign: 'left' }}>Donor Type</th>
                      <th style={{ textAlign: 'left' }}>Category / Campaign</th>
                      <th style={{ textAlign: 'left' }}>Amount</th>
                      <th style={{ textAlign: 'left' }}>Method & Date</th>
                      <th style={{ textAlign: 'left' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDonations.map((d) => {
                      const isSelected = selectedIds.includes(d.id);
                      const campaign = campaigns.find((c) => c.id === d.campaign_id);

                      return (
                        <tr key={d.id} className={isSelected ? 'selected-row' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectIndividual(d.id)}
                            />
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <div className="donor-info-cell flex-row-gap-sm">
                              <div className="donor-avatar-circle avatar-anon">
                                {d.donor_name ? d.donor_name.charAt(0).toUpperCase() : 'A'}
                              </div>
                              <div>
                                <div className="font-weight-600 text-dark">{d.donor_name || 'Anonymous Donor'}</div>
                                <span className="font-xs color-subtle">{d.receipt_number || `REC-${d.id.substring(0, 5)}`}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className={`status-pill ${d.donor_type === 'member' ? 'paid' : 'unpaid'}`}>
                              {d.donor_type ? d.donor_type.toUpperCase() : 'EXTERNAL'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className="font-xs font-weight-600 text-dark">
                              {d.donation_type === 'campaign' ? (campaign?.campaign_name || 'Special Campaign') : 'General Donation'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className="font-weight-700 font-sm text-success">{formatCurrency(d.amount)}</span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <div>
                              <div className="font-weight-600 font-xs text-dark">{d.payment_method ? d.payment_method.toUpperCase() : 'UPI'}</div>
                              <span className="font-xs color-subtle">{d.donation_date}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className={`status-badge-dot ${d.status === 'pending' ? 'warning' : 'success'}`}>
                              <span className="dot"></span> {d.status ? d.status.toUpperCase() : 'RECEIVED'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-row-buttons flex-end gap-xs">
                              <button
                                className="icon-btn-ghost text-primary"
                                title="Print Receipt"
                                onClick={(e) => openReceiptModal(d, e)}
                              >
                                <Award size={15} />
                              </button>
                              <button
                                className="icon-btn-ghost"
                                title="View Details"
                                onClick={() => {
                                  setSelectedDonationRecord(d);
                                  setIsDetailsDrawerOpen(true);
                                }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="icon-btn-ghost"
                                title="Edit Donation"
                                onClick={(e) => openEditDrawer(d, e)}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="icon-btn-ghost danger"
                                title="Delete Donation"
                                onClick={(e) => handleDeleteDonation(d.id, e)}
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

              {/* DARUL HASANATH INSPIRED MOBILE STACKED CARDS VIEW (<768px) */}
              <div className="mobile-ledger-cards-list mobile-view-only padding-md">
                {paginatedDonations.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  const campaign = campaigns.find((c) => c.id === d.campaign_id);

                  return (
                    <div key={d.id} className={`mobile-ledger-card ${isSelected ? 'selected' : ''}`}>
                      {/* Top Row: Donor Name & Status Badge */}
                      <div className="mobile-card-top flex-between">
                        <div className="flex-row-gap-sm">
                          <div className="donor-avatar-circle sm avatar-anon">
                            {d.donor_name ? d.donor_name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="font-weight-800 font-sm text-dark">{d.donor_name || 'Anonymous Donor'}</div>
                            <span className="font-xs color-subtle">{d.donor_type ? d.donor_type.toUpperCase() : 'EXTERNAL'}</span>
                          </div>
                        </div>

                        <span className={`status-badge-dot ${d.status === 'pending' ? 'warning' : 'success'}`}>
                          <span className="dot"></span> {d.status ? d.status.toUpperCase() : 'RECEIVED'}
                        </span>
                      </div>

                      {/* Sub-Header Metadata Chips Line */}
                      <div className="card-metadata-chips-row">
                        <span className="meta-chip">📅 {d.donation_date}</span>
                        <span className="meta-chip">💳 {d.payment_method ? d.payment_method.toUpperCase() : 'UPI'}</span>
                        <span className="meta-chip">🎯 {d.donation_type === 'campaign' ? (campaign?.campaign_name || 'Campaign') : 'General'}</span>
                      </div>

                      {/* Carded Info Details Container Box */}
                      <div className="card-inner-info-box font-xs">
                        <div className="flex-between">
                          <span className="color-subtle">Receipt Number:</span>
                          <strong className="text-dark">{d.receipt_number || `REC-${d.id.substring(0, 6)}`}</strong>
                        </div>
                        <div className="flex-between margin-top-xs">
                          <span className="color-subtle">Donation Amount:</span>
                          <strong className="text-success font-sm">{formatCurrency(d.amount)}</strong>
                        </div>
                      </div>

                      {/* 2x2 Action Button Grid */}
                      <div className="mobile-card-actions-grid">
                        <button className="pill-btn-ghost font-xs" onClick={(e) => openReceiptModal(d, e)}>
                          <Award size={13} /> Receipt
                        </button>
                        <button
                          className="pill-btn-ghost font-xs"
                          onClick={() => {
                            setSelectedDonationRecord(d);
                            setIsDetailsDrawerOpen(true);
                          }}
                        >
                          <Eye size={13} /> Details →
                        </button>
                        <button className="pill-btn-ghost font-xs" onClick={(e) => openEditDrawer(d, e)}>
                          <Edit2 size={13} /> Edit
                        </button>
                        <button className="pill-btn-danger font-xs" onClick={(e) => handleDeleteDonation(d.id, e)}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION CONTROL BAR */}
              <div className="pagination-bar">
                <div className="font-xs color-subtle">
                  Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}</strong> to <strong>{Math.min(currentPage * rowsPerPage, filteredDonations.length)}</strong> of <strong>{filteredDonations.length}</strong> records
                </div>

                <div className="pagination-controls">
                  <select
                    className="rows-select-pill"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10 rows / page</option>
                    <option value={25}>25 rows / page</option>
                    <option value={50}>50 rows / page</option>
                  </select>

                  <div className="flex-row-gap-xs">
                    <button
                      className="page-pill-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    <span className="page-indicator-badge">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      className="page-pill-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>



      {/* 5. OFFICIAL PRINTABLE DONATION RECEIPT MODAL */}
      <Modal
        isOpen={isReceiptModalOpen && !!receiptRecord}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Official Donation Receipt"
        subtitle="Certified financial receipt generated from Mahall Management System."
        icon={<Award size={22} />}
        size="md"
        footer={
          <div className="flex-between width-100 no-print">
            <button className="pill-btn-ghost" onClick={() => setIsReceiptModalOpen(false)}>
              Close
            </button>
            <div className="flex-row-gap-xs">
              <button className="pill-btn-ghost" onClick={() => window.print()}>
                <Printer size={15} /> Print Receipt
              </button>
              <button className="pill-btn-primary" onClick={exportCSV}>
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
        }
      >
        {receiptRecord && (
          <div className="certificate-modal-container printable-certificate">
            <div className="certificate-header-seal">
              <div className="flex-row-gap-xs">
                <HeartHandshake size={32} className="text-success" />
                <div>
                  <div className="font-weight-800 font-sm text-dark">{branding.organizationName.toUpperCase()}</div>
                  <div className="font-xs color-subtle">{branding.organizationNameMalayalam || 'OFFICIAL COMMUNITY DONATIONS REGISTRY'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-xs font-weight-700 text-success">RECEIPT NO.</div>
                <div className="font-weight-800 font-sm text-dark">{receiptRecord.receipt_number || `REC-${receiptRecord.id.substring(0, 6)}`}</div>
              </div>
            </div>

            <div className="certificate-title-box">
              <h2>Donation Receipt</h2>
              <p>Official record of contribution received</p>
            </div>

            <table className="certificate-details-table">
              <tbody>
                <tr>
                  <td className="label">Donor Name</td>
                  <td className="value">{receiptRecord.donor_name || 'Anonymous Donor'}</td>
                </tr>
                <tr>
                  <td className="label">Donor Type</td>
                  <td className="value">{receiptRecord.donor_type ? receiptRecord.donor_type.toUpperCase() : 'EXTERNAL'}</td>
                </tr>
                <tr>
                  <td className="label">Donation Amount</td>
                  <td className="value text-success font-weight-800 font-sm">{formatCurrency(receiptRecord.amount)}</td>
                </tr>
                <tr>
                  <td className="label">Category / Campaign</td>
                  <td className="value">{receiptRecord.donation_type === 'campaign' ? (campaigns.find(c => c.id === receiptRecord.campaign_id)?.campaign_name || 'Special Campaign') : 'General Donation'}</td>
                </tr>
                <tr>
                  <td className="label">Payment Method</td>
                  <td className="value">{receiptRecord.payment_method ? receiptRecord.payment_method.toUpperCase() : 'UPI'}</td>
                </tr>
                <tr>
                  <td className="label">Donation Date</td>
                  <td className="value">{receiptRecord.donation_date}</td>
                </tr>
                {receiptRecord.reference_number && (
                  <tr>
                    <td className="label">Ref / Txn ID</td>
                    <td className="value">{receiptRecord.reference_number}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="certificate-footer-signatures">
              <div className="flex-row-gap-xs">
                <QrCode size={40} className="color-subtle" />
                <div className="font-xs color-subtle">
                  Verified Financial Record<br />
                  Txn Hash: {receiptRecord.id.substring(0, 12)}
                </div>
              </div>

              <div className="signature-line">
                <div className="signature-line-border">TREASURER / ACCOUNTANT</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. RECORD DETAILS RIGHT SIDE PANEL */}
      <SidePanel
        isOpen={Boolean(isDetailsDrawerOpen && selectedDonationRecord)}
        onClose={() => setIsDetailsDrawerOpen(false)}
        title={selectedDonationRecord?.donor_name || 'Anonymous Donor'}
        subtitle={`Receipt: ${selectedDonationRecord?.receipt_number || `REC-${selectedDonationRecord?.id.substring(0, 6)}`}`}
        icon={<User size={20} />}
        size="lg"
        quickActions={
          selectedDonationRecord && (
            <div className="flex-row-gap-xs">
              <button
                type="button"
                className="pill-btn-ghost font-xs"
                onClick={() => {
                  setIsDetailsDrawerOpen(false);
                  openEditDrawer(selectedDonationRecord);
                }}
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                type="button"
                className="pill-btn-primary font-xs"
                onClick={() => {
                  setIsDetailsDrawerOpen(false);
                  openReceiptModal(selectedDonationRecord);
                }}
              >
                <Award size={13} /> Printable Receipt
              </button>
            </div>
          )
        }
      >
        {selectedDonationRecord && (
          <div className="flex-col gap-md">
            {/* DONOR INFORMATION */}
            <div className="form-card">
              <div className="form-card-header margin-bottom-sm">
                <User size={16} className="text-primary" />
                <span className="form-card-title margin-left-xs">Donor Information</span>
              </div>
              <div className="form-grid-2col font-xs">
                <div>
                  <div className="detail-item-label">Donor Name</div>
                  <div className="font-weight-700 font-sm text-dark">{selectedDonationRecord.donor_name || 'Anonymous Donor'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Donor Identity</div>
                  <div className="font-weight-600">{selectedDonationRecord.donor_type ? selectedDonationRecord.donor_type.toUpperCase() : 'EXTERNAL'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Phone Number</div>
                  <div className="font-weight-600">{selectedDonationRecord.donor_phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Email Address</div>
                  <div className="font-weight-600">{selectedDonationRecord.donor_email || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* DONATION DETAILS */}
            <div className="form-card">
              <div className="form-card-header margin-bottom-sm">
                <DollarSign size={16} className="text-success" />
                <span className="form-card-title margin-left-xs">Donation & Payment Details</span>
              </div>
              <div className="form-grid-2col font-xs">
                <div>
                  <div className="detail-item-label">Donation Amount</div>
                  <div className="font-weight-800 font-md text-success">{formatCurrency(selectedDonationRecord.amount)}</div>
                </div>
                <div>
                  <div className="detail-item-label">Donation Date</div>
                  <div className="font-weight-600 text-dark">{selectedDonationRecord.donation_date}</div>
                </div>
                <div>
                  <div className="detail-item-label">Payment Method</div>
                  <div className="font-weight-600">{selectedDonationRecord.payment_method ? selectedDonationRecord.payment_method.toUpperCase() : 'UPI'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Category</div>
                  <div className="font-weight-600">{selectedDonationRecord.donation_type === 'campaign' ? 'Special Campaign' : 'General Donation'}</div>
                </div>
              </div>
            </div>

            {/* RECEIPT ACTION CARD */}
            <div className="form-card bg-emerald-soft">
              <div className="flex-between align-items-center">
                <div>
                  <div className="detail-item-label">Official Receipt Status</div>
                  <div className="font-weight-700 text-success">🟢 Issued & Certified Community Receipt</div>
                </div>
                <button
                  type="button"
                  className="pill-btn-primary font-xs"
                  onClick={() => openReceiptModal(selectedDonationRecord)}
                >
                  <Award size={13} /> View Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </SidePanel>

      {/* MOBILE FILTER DRAWER SHEET */}
      <Modal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Donations"
        icon={<Filter size={18} />}
        size="sm"
        footer={
          <div className="flex-between width-100">
            <button className="pill-btn-ghost" onClick={() => { clearFilters(); setIsMobileFilterOpen(false); }}>
              Reset
            </button>
            <button className="pill-btn-primary" onClick={() => setIsMobileFilterOpen(false)}>
              Apply Filters
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Subscription Year</label>
          <YearFilter selectedYearId={selectedYearId} onChange={setSelectedYearId} showAllOption={true} />
        </div>
        <div className="form-group margin-top-sm">
          <label className="form-label">Donor Type</label>
          <select className="form-control" value={selectedDonorType} onChange={(e) => setSelectedDonorType(e.target.value as any)}>
            <option value="">All Donor Types</option>
            <option value="member">Mahall Member</option>
            <option value="external">External Donor</option>
            <option value="anonymous">Anonymous</option>
          </select>
        </div>
        <div className="form-group margin-top-sm">
          <label className="form-label">Payment Method</label>
          <select className="form-control" value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
            <option value="">All Methods</option>
            <option value="upi">UPI / Online</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
      </Modal>

      {/* BULK DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Delete Donation Records"
        icon={<Trash2 size={18} className="text-danger" />}
        size="sm"
        footer={
          <div className="flex-between width-100">
            <button className="pill-btn-ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
              Cancel
            </button>
            <button className="pill-btn-primary bg-danger" onClick={handleBulkDelete}>
              Delete Records
            </button>
          </div>
        }
      >
        <p className="font-sm text-dark">
          Are you sure you want to permanently delete {selectedIds.length} selected donation records? This action cannot be undone.
        </p>
      </Modal>

      {/* EMBEDDED STYLES FOR ABSOLUTE DESIGN CONSISTENCY */}
      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
        .page-title { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
        .page-subtitle { font-size: 13.5px; color: #6b7280; margin-top: 4px; }
        .header-cta-group { display: flex; align-items: center; gap: 10px; }

        .stats-dashboard-grid-6 { margin-bottom: 24px !important; }

        .search-box { position: relative; display: flex; align-items: center; width: 100%; }
        .search-box .search-icon { position: absolute; left: 14px !important; color: #9ca3af; pointer-events: none; z-index: 2; }
        .search-box input { padding-left: 42px !important; box-sizing: border-box !important; }

        .checkbox-label { display: flex !important; align-items: center !important; gap: 10px !important; font-size: 13px !important; color: #374151 !important; cursor: pointer !important; user-select: none !important; margin: 0 !important; }
        .checkbox-label input[type="checkbox"] { width: 17px !important; height: 17px !important; accent-color: #00966b !important; cursor: pointer !important; margin: 0 !important; flex-shrink: 0 !important; }

        .pill-btn-danger { padding: 8px 16px !important; border-radius: 9999px !important; background: #fee2e2 !important; border: 1px solid #fca5a5 !important; color: #991b1b !important; font-weight: 700 !important; font-size: 12.5px !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 6px !important; transition: all 0.2s ease !important; }
        .icon-btn-ghost.danger:hover { background: #fee2e2 !important; color: #ef4444 !important; }
      `}</style>

      {/* IMPORT EXCEL / CSV MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Donation Records"
        subtitle="Batch import donation records using Excel or CSV file."
        icon={<FileSpreadsheet size={20} className="text-emerald" />}
        size="md"
        footer={
          <div className="flex-between width-100 align-items-center">
            <button
              type="button"
              className="pill-btn-ghost font-xs flex-row-gap-xs"
              onClick={() => {
                const csvHeader = 'receipt_number,donor_name,donor_phone,donor_email,amount,payment_method,donation_date,notes\n';
                const csvSample = 'REC-2026-1001,Ashraf Ali,9876543210,ashraf@example.com,5000,upi,2026-07-28,General Donation\nREC-2026-1002,Mohammed K,9876543211,,2500,cash,2026-07-29,Masjid Carpet Fund\n';
                const blob = new Blob([csvHeader + csvSample], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'donation_records_sample_template.csv';
                a.click();
                showToast('success', 'Sample template downloaded!');
              }}
            >
              <Download size={14} /> Download Sample Template
            </button>
            <button
              type="button"
              className="pill-btn-primary font-xs"
              onClick={() => {
                showToast('success', 'Demo mode: Please upload file using the formatted template.');
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
                  Ensure your file includes columns: <code>receipt_number</code>, <code>donor_name</code>, <code>amount</code>, <code>payment_method</code>, <code>donation_date</code>.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '14px',
              padding: '32px 16px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <Upload size={32} style={{ color: '#00966b', marginBottom: '8px' }} />
            <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Click or Drag & Drop Excel/CSV File</h5>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Supports .xlsx, .xls, .csv files (Max 5MB)</p>
          </div>
        </div>
      </Modal>

      {/* CONFIRMATION DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDeleteDonation}
        title="Delete Donation Record?"
        message="Are you sure you want to delete this donation record? This action cannot be undone."
        confirmText="Delete Donation"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Donations;
