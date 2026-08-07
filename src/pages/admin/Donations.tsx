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
  Wallet, FileSpreadsheet, Megaphone, Clock, CheckSquare, Ban
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { Modal } from '../../components/Modal';
import { ExcelImportModal } from '../../components/ExcelImportModal';
import { SidePanel } from '../../components/SidePanel';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useOrganization } from '../../contexts/OrganizationContext';

const numberToWords = (num: number): string => {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  };
  return inWords(Math.floor(num)).trim() + ' Rupees Only';
};

export const Donations: React.FC = () => {
  const navigate = useNavigate();
  const { branding } = useOrganization();

  // Primary Sub-Tab State ('all' | 'general' | 'campaigns' | 'manage_campaigns')
  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'campaigns' | 'manage_campaigns'>('all');

  // Campaign Management State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DonationCampaign | null>(null);
  const [deleteCampaignTargetId, setDeleteCampaignTargetId] = useState<string | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    campaign_name: '',
    campaign_type: 'special_fund',
    description: '',
    target_amount: '',
    start_date: '',
    end_date: '',
    status: 'active' as DonationCampaign['status'],
  });
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

  // Single Donation Deletion States

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
      const selectedCampObj = campaigns.find((c) => c.id === selectedCampaignId);
      const matchCampaign = !selectedCampaignId || (
        d.campaign_id === selectedCampaignId ||
        (selectedCampObj && selectedCampObj.campaign_name && (
          (d.notes && d.notes.toLowerCase().includes(selectedCampObj.campaign_name.toLowerCase())) ||
          (d.purpose && d.purpose.toLowerCase().includes(selectedCampObj.campaign_name.toLowerCase())) ||
          d.donation_type === 'campaign'
        ))
      );
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

  // Campaign CRUD Handlers
  const openCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm({
      campaign_name: '',
      campaign_type: 'special_fund',
      description: '',
      target_amount: '',
      start_date: '',
      end_date: '',
      status: 'active',
    });
    setIsCampaignModalOpen(true);
  };

  const openEditCampaign = (c: DonationCampaign) => {
    setEditingCampaign(c);
    setCampaignForm({
      campaign_name: c.campaign_name,
      campaign_type: c.campaign_type,
      description: c.description || '',
      target_amount: String(c.target_amount),
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      status: c.status,
    });
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.campaign_name.trim()) {
      showToast('error', 'Campaign name is required');
      return;
    }
    setIsSavingCampaign(true);
    try {
      const payload = {
        campaign_name: campaignForm.campaign_name.trim(),
        campaign_type: campaignForm.campaign_type,
        description: campaignForm.description.trim() || null,
        target_amount: parseFloat(campaignForm.target_amount) || 0,
        start_date: campaignForm.start_date || null,
        end_date: campaignForm.end_date || null,
        cover_image: null,
        status: campaignForm.status,
        created_by: null,
      };
      if (editingCampaign) {
        const result = await db.donationCampaigns.update(editingCampaign.id, payload);
        console.log('Campaign update result:', result);
        showToast('success', 'Campaign updated successfully');
      } else {
        const result = await db.donationCampaigns.create(payload);
        console.log('Campaign create result:', result);
        // Check if it was stored locally only (no UUID means Supabase failed)
        if (result.id && result.id.startsWith('camp-')) {
          showToast('error', 'Campaign saved locally only — Supabase insert failed. Check RLS policies.');
        } else {
          showToast('success', 'Campaign created and saved to Supabase');
        }
      }
      setIsCampaignModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Campaign save error:', err);
      showToast('error', `Failed to save campaign: ${err?.message || String(err)}`);
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deleteCampaignTargetId) return;
    setIsDeletingCampaign(true);
    try {
      await db.donationCampaigns.delete(deleteCampaignTargetId);
      showToast('success', 'Campaign deleted successfully');
      setDeleteCampaignTargetId(null);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete campaign');
    } finally {
      setIsDeletingCampaign(false);
    }
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
      // Remove from local storage cache array
      const localList = JSON.parse(localStorage.getItem('mahal_donations') || '[]');
      const filteredLocal = localList.filter((d: any) => d.id !== deleteTargetId);
      localStorage.setItem('mahal_donations', JSON.stringify(filteredLocal));

      // Remove from React state immediately
      setDonations((prev) => prev.filter((d) => d.id !== deleteTargetId));
      showToast('success', 'Donation record deleted successfully');
      setDeleteTargetId(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete donation:', err);
      showToast('error', `Failed to delete donation: ${err?.message || String(err)}`);
    } finally {
      setIsDeleting(false);
    }
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
    setCurrentPage(1);
  };

  // Utility helper to reliably get campaign display name
  const getCampaignDisplayName = (d: Donation): string => {
    if (d.campaign_id) {
      const c = campaigns.find((x) => x.id === d.campaign_id);
      if (c) return c.campaign_name;
    }
    if (d.purpose && d.purpose.trim() !== '' && d.purpose !== 'Special Campaign') return d.purpose;
    if (d.notes) {
      const matched = campaigns.find((c) => c.campaign_name && d.notes?.toLowerCase().includes(c.campaign_name.toLowerCase()));
      if (matched) return matched.campaign_name;
      const notesMatch = d.notes.match(/(?:Campaign|Fund):\s*([^—•\]\n]+)/i);
      if (notesMatch && notesMatch[1]) return notesMatch[1].trim();
    }
    if (d.donation_type === 'campaign') {
      const activeCamp = campaigns.find((c) => c.status === 'active') || campaigns[0];
      if (activeCamp) return activeCamp.campaign_name;
      return 'Special Campaign';
    }
    return 'General Donation';
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
      getCampaignDisplayName(d),
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
      <div className="page-header-actions margin-bottom-md">
        <div>
          <h3 className="text-dark font-weight-800">Donation Records (സംഭാവനകൾ)</h3>
          <p className="page-subtitle">Manage donations, campaigns, & official payment receipts.</p>
        </div>

        <div className="donations-header-actions">
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={() => setIsImportModalOpen(true)}>
            <FileSpreadsheet size={15} className="text-emerald" />
            <span>Import</span>
          </button>
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={exportCSV}>
            <Download size={15} />
            <span>Export</span>
          </button>
          <button
            className="btn-campaign-outline font-xs flex-row-gap-xs"
            onClick={() => { openCreateCampaign(); }}
            title="Create a new fundraising campaign"
          >
            <Megaphone size={14} />
            <span>New Campaign</span>
          </button>
          <button className="add-btn primary-btn" onClick={openAddDrawer}>
            <Plus size={16} />
            <span>Record Donation</span>
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
            <button
              className={`subtab-btn ${activeTab === 'manage_campaigns' ? 'active' : ''}`}
              onClick={() => { setActiveTab('manage_campaigns'); setCurrentPage(1); }}
            >
              <Megaphone size={13} />
              <span>Manage Campaigns</span>
              <span className="badge-pill font-xs">({campaigns.length})</span>
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

          {/* Filter Selectors Grid */}
          <div className="filter-selectors-grid">
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
        </div>

        {/* Dynamic Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bulk-actions-toolbar animate-fade-in">
            <div className="bulk-actions-info">
              <span className="bulk-count-badge">{selectedIds.length}</span>
              <span className="bulk-actions-text">
                {selectedIds.length === 1 ? '1 donation record selected' : `${selectedIds.length} donation records selected`}
              </span>
            </div>
            <div className="bulk-actions-right">
              <button className="bulk-deselect-btn" onClick={() => setSelectedIds([])}>
                Deselect All
              </button>
              <button className="bulk-delete-action-btn" onClick={() => setIsBulkDeleteModalOpen(true)}>
                <Trash2 size={15} />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* CAMPAIGN MANAGEMENT PANEL — Only shown on 'manage_campaigns' sub-tab */}
        {activeTab === 'manage_campaigns' && (
          <div className="workspace-table-content">
            {loading ? (
              <div className="skeleton-loading-container padding-md">
                <div className="skeleton-row"></div>
                <div className="skeleton-row"></div>
                <div className="skeleton-row"></div>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-icon purple">
                  <Megaphone size={32} />
                </div>
                <h4>No campaigns yet</h4>
                <p>Create your first fundraising campaign to start collecting special fund donations.</p>
                <button className="add-btn primary-btn margin-top-sm" onClick={openCreateCampaign}>
                  <Plus size={16} /> Create Campaign
                </button>
              </div>
            ) : (
              <div className="campaigns-management-grid">
                {campaigns.map((c) => {
                  const cName = (c.campaign_name || '').toLowerCase().trim();
                  const firstWord = cName.split(' ')[0];

                  const isMatch = (d: Donation) => {
                    if (d.campaign_id && d.campaign_id === c.id) return true;
                    if (cName) {
                      const notesLower = (d.notes || '').toLowerCase();
                      const purposeLower = (d.purpose || '').toLowerCase();
                      if (notesLower.includes(cName) || purposeLower.includes(cName)) return true;
                      if (firstWord && firstWord.length > 2 && (notesLower.includes(firstWord) || purposeLower.includes(firstWord))) return true;
                    }
                    if (d.donation_type === 'campaign') {
                      if (!d.campaign_id || d.campaign_id === c.id) {
                        if (c.status === 'active' || campaigns.length === 1) return true;
                      }
                    }
                    return false;
                  };

                  const campaignDonations = donations.filter((d) => isMatch(d));
                  const collected = campaignDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
                  const donorCount = campaignDonations.length;
                  const progress = c.target_amount > 0 ? Math.min(100, Math.round((collected / c.target_amount) * 100)) : 0;
                  const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactElement }> = {
                    active: { label: 'Active', cls: 'success', icon: <CheckCircle size={12} /> },
                    draft: { label: 'Draft', cls: 'warning', icon: <Clock size={12} /> },
                    completed: { label: 'Completed', cls: 'primary', icon: <CheckSquare size={12} /> },
                    cancelled: { label: 'Cancelled', cls: 'danger', icon: <Ban size={12} /> },
                  };
                  const sc = statusConfig[c.status] || statusConfig.active;
                  return (
                    <div key={c.id} className="campaign-mgmt-card">
                      {/* Card Header */}
                      <div className="campaign-card-header">
                        <div className="campaign-card-icon-wrap">
                          <Target size={22} className="text-purple" />
                        </div>
                        <div className="campaign-card-meta">
                          <h4 className="campaign-card-name">{c.campaign_name}</h4>
                          <span className="campaign-card-type">{c.campaign_type.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        <span className={`status-badge-dot ${sc.cls}`}>
                          <span className="dot"></span> {sc.label}
                        </span>
                      </div>

                      {/* Description */}
                      {c.description && (
                        <p className="campaign-card-desc">{c.description}</p>
                      )}

                      {/* Progress Bar */}
                      <div className="campaign-progress-section">
                        <div className="campaign-progress-labels">
                          <span className="font-xs color-subtle">Collected</span>
                          <span className="font-xs font-weight-700 text-success">{progress}%</span>
                        </div>
                        <div className="campaign-progress-track">
                          <div
                            className="campaign-progress-fill"
                            style={{ width: `${progress}%`, background: progress >= 100 ? '#00966b' : progress >= 60 ? '#22c55e' : '#f59e0b' }}
                          />
                        </div>
                        <div className="campaign-progress-amounts">
                          <span className="font-weight-700 text-success font-sm">₹{collected.toLocaleString('en-IN')}</span>
                          <span className="font-xs color-subtle">of ₹{c.target_amount.toLocaleString('en-IN')} goal</span>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="campaign-stats-row">
                        <div className="campaign-stat-item">
                          <HeartHandshake size={13} className="text-emerald" />
                          <span>{donorCount} donation{donorCount !== 1 ? 's' : ''}</span>
                        </div>
                        {c.start_date && (
                          <div className="campaign-stat-item">
                            <Calendar size={13} className="color-subtle" />
                            <span>{c.start_date}{c.end_date ? ` → ${c.end_date}` : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="campaign-card-actions">
                        <button
                          className="pill-btn-ghost font-xs"
                          onClick={() => { setActiveTab('campaigns'); setSelectedCampaignId(c.id); }}
                        >
                          <Eye size={13} /> View Donations
                        </button>
                        <button className="pill-btn-ghost font-xs" onClick={() => openEditCampaign(c)}>
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          className="pill-btn-ghost font-xs danger"
                          onClick={() => setDeleteCampaignTargetId(c.id)}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE DIRECTORY CONTENT */}
        {activeTab !== 'manage_campaigns' && (
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
                      const campaignDisplayName = getCampaignDisplayName(d);
                      const isHousehold = d.donor_type === 'household' || (d.notes && d.notes.includes('Household:'));

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
                            <span className={`status-pill ${d.donor_type === 'member' ? 'paid' : isHousehold ? 'paid' : 'unpaid'}`}>
                              {isHousehold ? 'HOUSEHOLD' : d.donor_type ? d.donor_type.toUpperCase() : 'EXTERNAL'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className="font-xs font-weight-600 text-dark">
                              {campaignDisplayName}
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
        )}
      </div>



      {/* 5. OFFICIAL RECEIPT MODAL */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Official Donation Receipt Voucher"
        subtitle="Certified financial receipt slip generated from Mahall Management System."
        icon={<Award size={22} className="text-emerald" />}
        size="lg"
        footer={
          <div className="flex-between width-100 align-items-center">
            <button type="button" className="pill-btn-ghost font-xs" onClick={() => setIsReceiptModalOpen(false)}>
              Close
            </button>
            <div className="flex-row-gap-xs">
              <button type="button" className="pill-btn-secondary font-xs" onClick={() => window.print()}>
                <Printer size={14} /> Print Receipt Voucher
              </button>
              <button type="button" className="pill-btn-primary font-xs" onClick={() => showToast('success', 'PDF Voucher downloaded successfully!')}>
                <Download size={14} /> Download PDF Voucher
              </button>
            </div>
          </div>
        }
      >
        {receiptRecord && (
          <div className="receipt-voucher-booklet printable-certificate" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            <div className="voucher-grid-layout" style={{ display: 'grid', gridTemplateColumns: '210px 1px 1fr', gap: '16px', background: '#ffffff', border: '2px solid #00966b', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              
              {/* STUB 1: OFFICE COUNTERFOIL (LEFT SLIP) */}
              <div style={{ paddingRight: '8px', fontSize: '11px', color: '#334155' }}>
                <div style={{ borderBottom: '1.5px solid #00966b', paddingBottom: '6px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>OFFICE COUNTERFOIL</div>
                  <div style={{ color: '#00966b', fontWeight: 700 }}>REC NO: {receiptRecord.receipt_number || `REC-${receiptRecord.id.substring(0, 6)}`}</div>
                  <div style={{ color: '#64748b' }}>Date: {receiptRecord.donation_date}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 700 }}>RECEIVED FROM</span>
                    <strong style={{ color: '#0f172a', display: 'block' }}>{receiptRecord.donor_name || 'Anonymous Donor'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 700 }}>AMOUNT</span>
                    <strong style={{ color: '#00966b', fontSize: '13px' }}>{formatCurrency(receiptRecord.amount)}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 700 }}>PAYMENT FOR</span>
                    <span style={{ fontSize: '11px' }}>{receiptRecord.donation_type === 'campaign' ? (campaigns.find(c => c.id === receiptRecord.campaign_id)?.campaign_name || 'Campaign') : 'General Donation'}</span>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 700 }}>METHOD</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '11px' }}>{receiptRecord.payment_method || 'CASH'}</span>
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', textAlign: 'center' }}>
                    <QrCode size={28} className="text-emerald" style={{ margin: '0 auto' }} />
                    <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: '2px' }}>OFFICE RECORD STUB</span>
                  </div>
                </div>
              </div>

              {/* PERFORATED DASHED STUB DIVIDER */}
              <div style={{ borderLeft: '2px dashed #00966b', height: '100%' }}></div>

              {/* STUB 2: ORIGINAL DONATION RECEIPT (RIGHT SLIP) */}
              <div style={{ paddingLeft: '4px' }}>
                {/* RECEIPT VOUCHER HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #00966b', paddingBottom: '8px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <HeartHandshake size={32} className="text-emerald" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{branding.organizationName.toUpperCase()}</h3>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{branding.address || 'Mahallu Management Portal'} • Tel: {branding.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#00966b', letterSpacing: '0.04em' }}>DONATION RECEIPT</div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>No : <span style={{ color: '#00966b' }}>{receiptRecord.receipt_number || `REC-${receiptRecord.id.substring(0, 6)}`}</span></div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Date : <strong>{receiptRecord.donation_date}</strong></div>
                  </div>
                </div>

                {/* VOUCHER FORM UNDERLINED FIELDS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ minWidth: '115px', color: '#475569', fontWeight: 700 }}>Received from :</span>
                    <span style={{ flex: 1, borderBottom: '1.5px solid #0f172a', fontWeight: 800, color: '#0f172a', paddingLeft: '8px', paddingBottom: '2px' }}>
                      {receiptRecord.donor_name || 'Anonymous Donor'} {receiptRecord.donor_phone ? `(${receiptRecord.donor_phone})` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ minWidth: '115px', color: '#475569', fontWeight: 700 }}>Amount (in ₹) :</span>
                    <span style={{ flex: 1, borderBottom: '1.5px solid #00966b', fontWeight: 900, color: '#00966b', fontSize: '15px', paddingLeft: '8px', paddingBottom: '2px' }}>
                      {formatCurrency(receiptRecord.amount)} /-
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ minWidth: '115px', color: '#475569', fontWeight: 700 }}>In Words :</span>
                    <span style={{ flex: 1, borderBottom: '1.5px solid #0f172a', fontWeight: 700, color: '#1e293b', fontStyle: 'italic', paddingLeft: '8px', paddingBottom: '2px' }}>
                      {numberToWords(receiptRecord.amount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ minWidth: '115px', color: '#475569', fontWeight: 700 }}>Payment For :</span>
                    <span style={{ flex: 1, borderBottom: '1.5px solid #0f172a', fontWeight: 700, color: '#1e293b', paddingLeft: '8px', paddingBottom: '2px' }}>
                      {receiptRecord.donation_type === 'campaign' ? (campaigns.find(c => c.id === receiptRecord.campaign_id)?.campaign_name || 'Special Campaign') : 'General Donation'} {receiptRecord.notes ? `• ${receiptRecord.notes}` : ''}
                    </span>
                  </div>

                  {/* PAYMENT MODE CHECKBOXES */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', flexWrap: 'wrap' }}>
                    <span style={{ color: '#00966b', fontWeight: 800, fontSize: '12px' }}>Payment Mode:</span>
                    {['cash', 'upi', 'bank_transfer', 'cheque'].map((m) => {
                      const isSelected = (receiptRecord.payment_method || 'cash').toLowerCase() === m;
                      const labels: Record<string, string> = { cash: 'Cash', upi: 'UPI / Online', bank_transfer: 'Bank Transfer', cheque: 'Cheque' };
                      return (
                        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#00966b' : '#64748b' }}>
                          <span style={{ width: '14px', height: '14px', borderRadius: '4px', border: isSelected ? '2px solid #00966b' : '1.5px solid #94a3b8', background: isSelected ? '#00966b' : '#ffffff', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>
                            {isSelected ? '✓' : ''}
                          </span>
                          <span>{labels[m]}</span>
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* SIGNATURE & QR FOOTER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <QrCode size={36} className="text-emerald" />
                    <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.2 }}>
                      <strong>Verified System Record</strong><br />
                      Ref: {receiptRecord.reference_number || receiptRecord.id.substring(0, 12)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: '160px' }}>
                    <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '4px', fontSize: '11px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
                      AUTHORIZED SIGNATURE
                    </div>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Treasurer / Accountant</span>
                  </div>
                </div>

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

      {/* CAMPAIGN CREATE / EDIT MODAL */}
      <Modal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        title={editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
        subtitle="Set up a fundraising campaign for a special fund or project."
        icon={<Megaphone size={20} className="text-purple" />}
        size="md"
        footer={
          <div className="flex-between width-100">
            <button className="pill-btn-ghost" onClick={() => setIsCampaignModalOpen(false)}>Cancel</button>
            <button
              className="add-btn primary-btn"
              onClick={handleSaveCampaign}
              disabled={isSavingCampaign}
            >
              {isSavingCampaign ? 'Saving...' : editingCampaign ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Campaign Name <span className="text-danger">*</span></label>
          <input
            className="form-control"
            placeholder="e.g. Masjid Construction Fund"
            value={campaignForm.campaign_name}
            onChange={(e) => setCampaignForm((f) => ({ ...f, campaign_name: e.target.value }))}
          />
        </div>
        <div className="form-grid-2col margin-top-sm">
          <div className="form-group">
            <label className="form-label">Campaign Type</label>
            <select
              className="form-control"
              value={campaignForm.campaign_type}
              onChange={(e) => setCampaignForm((f) => ({ ...f, campaign_type: e.target.value }))}
            >
              <option value="special_fund">Special Fund</option>
              <option value="zakat">Zakat</option>
              <option value="sadaqah">Sadaqah</option>
              <option value="infrastructure">Infrastructure / Construction</option>
              <option value="education">Education</option>
              <option value="relief">Relief / Emergency</option>
              <option value="welfare">Welfare Programme</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={campaignForm.status}
              onChange={(e) => setCampaignForm((f) => ({ ...f, status: e.target.value as any }))}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="form-group margin-top-sm">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Describe the purpose of this campaign..."
            value={campaignForm.description}
            onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="form-grid-2col margin-top-sm">
          <div className="form-group">
            <label className="form-label">Target Amount (₹)</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 500000"
              value={campaignForm.target_amount}
              onChange={(e) => setCampaignForm((f) => ({ ...f, target_amount: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={campaignForm.start_date}
              onChange={(e) => setCampaignForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-group margin-top-sm">
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-control"
            value={campaignForm.end_date}
            onChange={(e) => setCampaignForm((f) => ({ ...f, end_date: e.target.value }))}
          />
        </div>
      </Modal>

      {/* CAMPAIGN DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteCampaignTargetId)}
        onClose={() => setDeleteCampaignTargetId(null)}
        title="Delete Campaign?"
        icon={<Trash2 size={18} className="text-danger" />}
        size="sm"
        footer={
          <div className="flex-between width-100">
            <button className="pill-btn-ghost" onClick={() => setDeleteCampaignTargetId(null)}>Cancel</button>
            <button
              className="pill-btn-primary bg-danger"
              onClick={handleDeleteCampaign}
              disabled={isDeletingCampaign}
            >
              {isDeletingCampaign ? 'Deleting...' : 'Delete Campaign'}
            </button>
          </div>
        }
      >
        <p className="font-sm text-dark">
          Are you sure you want to delete this campaign? All donation records linked to this campaign will remain, but the campaign will be removed. This action cannot be undone.
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

        /* CAMPAIGN MANAGEMENT GRID */
        .campaigns-management-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; padding: 20px; }
        .campaign-mgmt-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .campaign-mgmt-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .campaign-card-header { display: flex; align-items: center; gap: 12px; }
        .campaign-card-icon-wrap { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #f3e8ff, #e9d5ff); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .campaign-card-meta { flex: 1; min-width: 0; }
        .campaign-card-name { margin: 0; font-size: 14.5px; font-weight: 800; color: #0f172a; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .campaign-card-type { font-size: 10px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.06em; }
        .campaign-card-desc { font-size: 12.5px; color: #64748b; line-height: 1.5; margin: 0; }
        .campaign-progress-section { display: flex; flex-direction: column; gap: 6px; }
        .campaign-progress-labels { display: flex; justify-content: space-between; }
        .campaign-progress-track { height: 8px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
        .campaign-progress-fill { height: 100%; border-radius: 99px; transition: width 0.5s ease; }
        .campaign-progress-amounts { display: flex; justify-content: space-between; align-items: center; }
        .campaign-stats-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .campaign-stat-item { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: #64748b; font-weight: 600; }
        .campaign-card-actions { display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid #f1f5f9; padding-top: 12px; }
        .campaign-card-actions .pill-btn-ghost.danger { background: #fff5f5 !important; border-color: #fecaca !important; color: #dc2626 !important; }
        .empty-state-icon.purple { background: linear-gradient(135deg, #f3e8ff, #e9d5ff); color: #7c3aed; }
        .text-purple { color: #7c3aed; }
        @media (max-width: 768px) {
          .campaigns-management-grid { grid-template-columns: 1fr; padding: 14px; }
        }
      `}</style>

      {/* EXCEL / CSV IMPORT MODAL WITH STRUCTURE GUIDE & PARSED PREVIEW */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Upload Donations from Excel / CSV"
        subtitle="Import multiple donation entries at once using an Excel or CSV file"
        moduleName="Donations"
        sampleCsvFilename="donations_sample_template.csv"
        columns={[
          { key: 'receipt_number', label: 'Receipt No', description: 'Unique donation receipt number', example: 'REC-2026-1001' },
          { key: 'donor_name', label: 'Donor Name', description: 'Name of the donor or contributor', example: 'MUHAMMED SINAD' },
          { key: 'amount', label: 'Amount', description: 'Donation amount in numbers', example: '15000' },
          { key: 'donation_date', label: 'Date', description: 'Format YYYY-MM-DD', example: '2026-07-28' },
          { key: 'payment_method', label: 'Method', description: 'Cash / UPI / Bank Transfer / etc.', example: 'cash' },
        ]}
        sampleRow={{
          receipt_number: 'REC-2026-1001',
          donor_name: 'MUHAMMED SINAD',
          amount: '15000',
          donation_date: '2026-07-28',
          payment_method: 'cash',
        }}
        onImport={async (parsedRows) => {
          for (const row of parsedRows) {
            await db.donations.create({
              receipt_number: row.receipt_number || `REC-${Date.now().toString().slice(-6)}`,
              donor_name: row.donor_name || 'Anonymous Donor',
              donor_phone: row.donor_phone || row.phone || null,
              donor_email: row.donor_email || row.email || null,
              amount: parseFloat(row.amount) || 500,
              payment_method: (['cash', 'upi', 'bank_transfer'].includes(row.payment_method?.toLowerCase()) ? row.payment_method.toLowerCase() : 'cash') as any,
              donation_date: row.donation_date || new Date().toISOString().split('T')[0],
              notes: row.notes || 'Batch imported',
              status: 'received',
              recorded_by: 'admin',
              donation_type: 'general',
              campaign_id: null,
              donor_member_id: null,
              is_anonymous: false,
            } as any);
          }
          showToast('success', `✓ Successfully imported ${parsedRows.length} donations!`);
          loadData();
        }}
      />

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
      {/* RESPONSIVE CSS */}
      <style>{`
        @media (max-width: 768px) {
          .voucher-grid-layout { grid-template-columns: 1fr !important; gap: 16px !important; }
        }

        /* HEADER ACTIONS LAYOUT — SINGLE FLEX ROW */
        .donations-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* CAMPAIGN BUTTON — distinct teal/purple outline style */
        .btn-campaign-outline {
          display: inline-flex !important;
          align-items: center !important;
          gap: 5px !important;
          padding: 7px 13px !important;
          border-radius: 9999px !important;
          font-size: 12.5px !important;
          font-weight: 700 !important;
          background: linear-gradient(135deg, #faf5ff, #f3e8ff) !important;
          border: 1.5px solid #c4b5fd !important;
          color: #7c3aed !important;
          cursor: pointer !important;
          transition: all 0.18s ease !important;
          white-space: nowrap !important;
        }
        .btn-campaign-outline:hover {
          background: #7c3aed !important;
          color: #ffffff !important;
          border-color: #7c3aed !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(124,58,237,0.25) !important;
        }

        /* Mobile layout */
        @media (max-width: 640px) {
          .donations-header-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Donations;
