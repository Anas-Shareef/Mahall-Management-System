import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { 
  Donation, DonationCampaign, SubscriptionYear, Member, Household 
} from '../../services/db';
import { 
  Plus, Search, Filter, Calendar, X, AlertCircle, 
  CheckCircle, Loader2, DollarSign, Eye,
  Download, Edit2, Trash2, User, Users,
  HelpCircle, Check, Printer, RefreshCw, FileText, HeartHandshake,
  TrendingUp, CalendarDays, Target, Award, QrCode, ChevronLeft, ChevronRight,
  Wallet
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Donations: React.FC = () => {
  const { user } = useAuth();

  // Primary Sub-Tab State ('all' | 'general' | 'campaigns')
  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'campaigns'>('all');

  // Data States
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
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

  // Add / Edit Donation Wizard Drawer State
  const [isDonationDrawerOpen, setIsDonationDrawerOpen] = useState(false);
  const [donationModalMode, setDonationModalMode] = useState<'add' | 'edit'>('add');
  const [editingDonationId, setEditingDonationId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // View Details Drawer & Printable Receipt Modal States
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedDonationRecord, setSelectedDonationRecord] = useState<Donation | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<Donation | null>(null);

  // Form Fields - Record / Edit Donation
  const [donationType, setDonationType] = useState<'general' | 'campaign'>('general');
  const [campaignId, setCampaignId] = useState('');
  const [donorType, setDonorType] = useState<'member' | 'external' | 'anonymous'>('external');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [donorMemberId, setDonorMemberId] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'>('upi');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [status, setStatus] = useState<'received' | 'pending' | 'cancelled'>('received');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [yearList, donationList, campaignList, memberList, houseList] = await Promise.all([
        db.years.get(),
        db.donations.get(),
        db.donationCampaigns.get(),
        db.members.get(),
        db.households.get(),
      ]);
      setYears(yearList || []);
      setDonations(donationList || []);
      setCampaigns(campaignList || []);
      setMembers(memberList || []);
      setHouseholds(houseList || []);
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

  // Filtered members for wizard Step 3 live search
  const searchableMembers = useMemo(() => {
    const query = memberSearchQuery.toLowerCase().trim();
    if (!query) return members.slice(0, 8);
    return members.filter((m) =>
      m.name.toLowerCase().includes(query) ||
      (m.id && m.id.toLowerCase().includes(query)) ||
      (m.phone && m.phone.includes(query))
    ).slice(0, 10);
  }, [members, memberSearchQuery]);

  const handleSelectMember = (m: Member) => {
    setDonorMemberId(m.id);
    setDonorName(m.name);
    setDonorPhone(m.phone || '');
    setDonorEmail(m.email || '');
    const h = households.find((x) => x.id === m.household_id);
    if (h) setDonorAddress(h.address || h.house_number || '');
  };

  const openAddDrawer = () => {
    setDonationModalMode('add');
    setEditingDonationId(null);
    setWizardStep(1);
    setDonationType('general');
    setCampaignId('');
    setDonorType('member');
    setMemberSearchQuery('');
    setDonorMemberId('');
    setDonorName('');
    setDonorPhone('');
    setDonorEmail('');
    setDonorAddress('');
    setAmount('');
    setPaymentMethod('upi');
    setDonationDate(new Date().toISOString().split('T')[0]);
    setReceiptNumber(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReferenceNumber('');
    setPurpose('');
    setStatus('received');
    setNotes('');
    setIsDonationDrawerOpen(true);
  };

  const openEditDrawer = (d: Donation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDonationModalMode('edit');
    setEditingDonationId(d.id);
    setWizardStep(4);
    setDonationType(d.donation_type || 'general');
    setCampaignId(d.campaign_id || '');
    setDonorType(d.donor_type || (d.donor_member_id ? 'member' : d.is_anonymous ? 'anonymous' : 'external'));
    setDonorMemberId(d.donor_member_id || '');
    setDonorName(d.donor_name || '');
    setDonorPhone(d.donor_phone || '');
    setDonorEmail(d.donor_email || '');
    setDonorAddress(d.donor_address || '');
    setAmount(d.amount || '');
    setPaymentMethod(d.payment_method || 'upi');
    setDonationDate(d.donation_date || new Date().toISOString().split('T')[0]);
    setReceiptNumber(d.receipt_number || '');
    setReferenceNumber(d.reference_number || '');
    setPurpose(d.purpose || '');
    setStatus(d.status === 'cancelled' ? 'cancelled' : d.status === 'pending' ? 'pending' : 'received');
    setNotes(d.notes || '');
    setIsDonationDrawerOpen(true);
  };

  const handleSaveDonation = async () => {
    if (!amount || Number(amount) <= 0) {
      showToast('error', 'Please enter a valid donation amount');
      return;
    }
    if (donorType === 'external' && !donorName.trim()) {
      showToast('error', 'Please enter external donor name');
      return;
    }
    if (donorType === 'member' && !donorMemberId) {
      showToast('error', 'Please select a member from the database');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<Donation, 'id' | 'created_at' | 'updated_at'> = {
        donation_type: donationType,
        campaign_id: donationType === 'campaign' && campaignId ? campaignId : null,
        donor_type: donorType,
        donor_name: donorType === 'anonymous' ? 'Anonymous Donor' : donorName.trim(),
        donor_phone: donorType === 'anonymous' ? null : donorPhone.trim() || null,
        donor_email: donorType === 'anonymous' ? null : donorEmail.trim() || null,
        donor_address: donorType === 'anonymous' ? null : donorAddress.trim() || null,
        donor_member_id: donorType === 'member' && donorMemberId ? donorMemberId : null,
        is_anonymous: donorType === 'anonymous',
        amount: Number(amount),
        payment_method: paymentMethod,
        donation_date: donationDate,
        receipt_number: receiptNumber.trim() || `REC-${Date.now()}`,
        reference_number: referenceNumber.trim() || null,
        purpose: purpose.trim() || null,
        status: status,
        notes: notes.trim() || null,
        recorded_by: user?.id || null,
      };

      if (donationModalMode === 'add') {
        const created = await db.donations.create(payload);
        setSelectedDonationRecord(created);
        showToast('success', 'Donation record saved to Supabase');
      } else if (editingDonationId) {
        const updated = await db.donations.update(editingDonationId, payload);
        setSelectedDonationRecord(updated);
        showToast('success', 'Donation record updated in Supabase');
      }

      setWizardStep(5); // Advance to Step 5 Success Screen
      loadData();
    } catch (err) {
      console.error('Error saving donation record:', err);
      showToast('error', 'Failed to save donation record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDonation = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this donation record? This action cannot be undone.')) return;
    try {
      await db.donations.delete(id);
      showToast('success', 'Donation deleted from Supabase');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete donation');
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
          <p className="page-subtitle">Manage general donations, special campaign collections, receipts, and Supabase audit logs.</p>
        </div>

        <div className="header-cta-group flex-row-gap-sm">
          <button className="pill-btn-ghost font-xs" onClick={exportCSV}>
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
        <div className="subtabs-navigation-bar flex-between p-xs border-bottom-light">
          <div className="subtabs-group flex-row-gap-xs">
            <button
              className={`subtab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            >
              All Donations ({donations.length})
            </button>
            <button
              className={`subtab-btn ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => { setActiveTab('general'); setCurrentPage(1); }}
            >
              General Fund
            </button>
            <button
              className={`subtab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
              onClick={() => { setActiveTab('campaigns'); setCurrentPage(1); }}
            >
              Campaign Fund
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

      {/* 4. MULTI-STEP RECORD DONATION WIZARD DRAWER / MODAL */}
      {isDonationDrawerOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h4>{donationModalMode === 'add' ? 'Record New Donation' : 'Edit Donation Record'}</h4>
                <p className="modal-subtitle">Follow the wizard steps to record donation and donor details.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDonationDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* STEPPER HEADER BAR */}
            <div className="wizard-stepper-bar">
              <div className={`wizard-step-item ${wizardStep === 1 ? 'active' : wizardStep > 1 ? 'completed' : ''}`}>
                <div className="wizard-step-badge">{wizardStep > 1 ? <Check size={13} /> : '1'}</div>
                <span>Category</span>
              </div>
              <div className={`wizard-step-line ${wizardStep > 1 ? 'active' : ''}`}></div>

              <div className={`wizard-step-item ${wizardStep === 2 ? 'active' : wizardStep > 2 ? 'completed' : ''}`}>
                <div className="wizard-step-badge">{wizardStep > 2 ? <Check size={13} /> : '2'}</div>
                <span>Donor Type</span>
              </div>
              <div className={`wizard-step-line ${wizardStep > 2 ? 'active' : ''}`}></div>

              <div className={`wizard-step-item ${wizardStep === 3 ? 'active' : wizardStep > 3 ? 'completed' : ''}`}>
                <div className="wizard-step-badge">{wizardStep > 3 ? <Check size={13} /> : '3'}</div>
                <span>Donor Info</span>
              </div>
              <div className={`wizard-step-line ${wizardStep > 3 ? 'active' : ''}`}></div>

              <div className={`wizard-step-item ${wizardStep === 4 ? 'active' : wizardStep > 4 ? 'completed' : ''}`}>
                <div className="wizard-step-badge">{wizardStep > 4 ? <Check size={13} /> : '4'}</div>
                <span>Payment</span>
              </div>
              <div className={`wizard-step-line ${wizardStep > 4 ? 'active' : ''}`}></div>

              <div className={`wizard-step-item ${wizardStep === 5 ? 'active' : ''}`}>
                <div className="wizard-step-badge">5</div>
                <span>Complete</span>
              </div>
            </div>

            <div className="modal-body-scrollable">
              {/* STEP 1: DONATION CATEGORY */}
              {wizardStep === 1 && (
                <div className="animate-fade-in flex-col gap-sm">
                  <label className="form-label">Select Donation Category *</label>
                  <div className="details-grid-2col">
                    <div
                      className={`member-select-card ${donationType === 'general' ? 'selected' : ''}`}
                      onClick={() => setDonationType('general')}
                    >
                      <div className="flex-row-gap-sm">
                        <div className="donor-avatar-circle emerald">
                          <HeartHandshake size={20} />
                        </div>
                        <div>
                          <div className="font-weight-700 font-sm text-dark">General Donation</div>
                          <span className="font-xs color-subtle">Unrestricted general community fund</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`member-select-card ${donationType === 'campaign' ? 'selected' : ''}`}
                      onClick={() => setDonationType('campaign')}
                    >
                      <div className="flex-row-gap-sm">
                        <div className="donor-avatar-circle purple">
                          <Target size={20} />
                        </div>
                        <div>
                          <div className="font-weight-700 font-sm text-dark">Campaign Donation</div>
                          <span className="font-xs color-subtle">Dedicated special project collection</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {donationType === 'campaign' && (
                    <div className="form-group margin-top-xs">
                      <label className="form-label">Select Campaign *</label>
                      <select
                        className="form-control"
                        value={campaignId}
                        onChange={(e) => setCampaignId(e.target.value)}
                      >
                        <option value="">-- Choose Special Campaign --</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>{c.campaign_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DONOR TYPE */}
              {wizardStep === 2 && (
                <div className="animate-fade-in flex-col gap-sm">
                  <label className="form-label">Select Donor Identity Type *</label>
                  <div className="flex-col gap-xs">
                    <div
                      className={`member-select-card ${donorType === 'member' ? 'selected' : ''}`}
                      onClick={() => { setDonorType('member'); }}
                    >
                      <div className="flex-row-gap-sm">
                        <div className="donor-avatar-circle emerald"><User size={18} /></div>
                        <div>
                          <div className="font-weight-700 font-sm text-dark">Mahall Registered Member</div>
                          <span className="font-xs color-subtle">Link donation directly to a registered member</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`member-select-card ${donorType === 'external' ? 'selected' : ''}`}
                      onClick={() => { setDonorType('external'); }}
                    >
                      <div className="flex-row-gap-sm">
                        <div className="donor-avatar-circle primary"><Users size={18} /></div>
                        <div>
                          <div className="font-weight-700 font-sm text-dark">External Well-Wisher</div>
                          <span className="font-xs color-subtle">External non-member or organization contributor</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`member-select-card ${donorType === 'anonymous' ? 'selected' : ''}`}
                      onClick={() => { setDonorType('anonymous'); setDonorName('Anonymous Donor'); }}
                    >
                      <div className="flex-row-gap-sm">
                        <div className="donor-avatar-circle yellow"><HelpCircle size={18} /></div>
                        <div>
                          <div className="font-weight-700 font-sm text-dark">Anonymous Donor</div>
                          <span className="font-xs color-subtle">Keep donor identity private on public records</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: DONOR DETAILS */}
              {wizardStep === 3 && (
                <div className="animate-fade-in flex-col gap-sm">
                  {donorType === 'member' ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">Search Member Database *</label>
                        <div className="search-box">
                          <Search size={16} className="search-icon" />
                          <input
                            type="text"
                            placeholder="Search member by name, ID, phone..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="member-search-cards-list">
                        {searchableMembers.map((m) => {
                          const house = households.find((h) => h.id === m.household_id);
                          const isSel = donorMemberId === m.id;

                          return (
                            <div
                              key={m.id}
                              className={`member-select-card ${isSel ? 'selected' : ''}`}
                              onClick={() => handleSelectMember(m)}
                            >
                              <div className="flex-row-gap-sm">
                                <div className="donor-avatar-circle sm avatar-member">
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-weight-700 font-sm text-dark">{m.name}</div>
                                  <span className="font-xs color-subtle">
                                    ID: {m.id.substring(0, 8)} • {house ? `House #${house.house_number}` : 'No House'}
                                  </span>
                                </div>
                              </div>
                              <button className={`pill-btn-ghost font-xs ${isSel ? 'bg-success text-white' : ''}`}>
                                {isSel ? 'Selected ✓' : 'Select'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : donorType === 'external' ? (
                    <div className="form-row-2col">
                      <div className="form-group">
                        <label className="form-label">Donor Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          placeholder="Full Name"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={donorPhone}
                          onChange={(e) => setDonorPhone(e.target.value)}
                          placeholder="+91 Mobile"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="details-section-card bg-primary-light text-center p-md">
                      <HelpCircle size={32} className="text-primary margin-bottom-xs" />
                      <h4 className="font-weight-700">Anonymous Donation Selected</h4>
                      <p className="font-xs color-subtle">Donor identity will be masked as Anonymous on all public receipts and reports.</p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: DONATION & PAYMENT DETAILS */}
              {wizardStep === 4 && (
                <div className="animate-fade-in flex-col gap-sm">
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Donation Amount (₹) *</label>
                      <input
                        type="number"
                        className="form-control font-weight-700 text-success"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Donation Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={donationDate}
                        onChange={(e) => setDonationDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <select
                        className="form-control"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                      >
                        <option value="upi">UPI / Online</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Receipt Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Transaction Reference #</label>
                    <input
                      type="text"
                      className="form-control"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="UPI Ref / Cheque No / Bank Reference"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Purpose / Remarks</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes or special donor instructions..."
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: SUCCESS VIEW */}
              {wizardStep === 5 && (
                <div className="animate-fade-in success-wizard-container">
                  <div className="success-animated-badge">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="font-weight-800 text-dark">Donation Recorded Successfully!</h3>
                  <p className="font-sm color-subtle margin-top-xs">
                    The donation of <strong>{formatCurrency(Number(amount))}</strong> has been saved to your Supabase database.
                  </p>

                  <div className="flex-row-center gap-sm margin-top-md">
                    {selectedDonationRecord && (
                      <button className="pill-btn-primary" onClick={() => openReceiptModal(selectedDonationRecord)}>
                        <Award size={16} /> View Receipt
                      </button>
                    )}
                    <button className="pill-btn-ghost" onClick={() => setIsDonationDrawerOpen(false)}>
                      Back to Directory List
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* WIZARD FOOTER ACTION BUTTONS */}
            {wizardStep < 5 && (
              <div className="modal-footer flex-between">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    className="pill-btn-ghost"
                    onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                  >
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pill-btn-ghost"
                    onClick={() => setIsDonationDrawerOpen(false)}
                  >
                    Cancel
                  </button>
                )}

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    className="pill-btn-primary"
                    onClick={() => {
                      if (wizardStep === 1 && donationType === 'campaign' && !campaignId) {
                        showToast('error', 'Please select a campaign');
                        return;
                      }
                      setWizardStep((prev) => (prev + 1) as any);
                    }}
                  >
                    <span>Continue</span>
                    <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pill-btn-primary"
                    disabled={isSaving}
                    onClick={handleSaveDonation}
                  >
                    {isSaving ? <Loader2 size={16} className="spinner" /> : 'Save Donation Record'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. OFFICIAL PRINTABLE DONATION RECEIPT MODAL */}
      {isReceiptModalOpen && receiptRecord && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '640px' }}>
            <div className="modal-header no-print">
              <div>
                <h4>Official Donation Receipt</h4>
                <p className="modal-subtitle">Certified financial receipt generated from Mahall Management System.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsReceiptModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-scrollable padding-md">
              <div className="certificate-modal-container printable-certificate">
                <div className="certificate-header-seal">
                  <div className="flex-row-gap-xs">
                    <HeartHandshake size={32} className="text-success" />
                    <div>
                      <div className="font-weight-800 font-sm text-dark">MAHALL MANAGEMENT SYSTEM</div>
                      <div className="font-xs color-subtle">OFFICIAL COMMUNITY DONATIONS REGISTRY</div>
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
            </div>

            <div className="modal-footer flex-between no-print">
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
          </div>
        </div>
      )}

      {/* 6. RECORD DETAILS DRAWER */}
      {isDetailsDrawerOpen && selectedDonationRecord && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h4>{selectedDonationRecord.donor_name || 'Anonymous Donor'}</h4>
                <p className="modal-subtitle">
                  Receipt: {selectedDonationRecord.receipt_number || `REC-${selectedDonationRecord.id.substring(0, 6)}`}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDetailsDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-scrollable">
              {/* DONOR INFORMATION */}
              <div className="details-section-card">
                <div className="details-section-title">
                  <User size={15} /> Donor Information
                </div>
                <div className="details-grid-2col">
                  <div>
                    <div className="detail-item-label">Donor Name</div>
                    <div className="detail-item-value">{selectedDonationRecord.donor_name || 'Anonymous Donor'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Donor Identity</div>
                    <div className="detail-item-value">{selectedDonationRecord.donor_type ? selectedDonationRecord.donor_type.toUpperCase() : 'EXTERNAL'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Phone Number</div>
                    <div className="detail-item-value">{selectedDonationRecord.donor_phone || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Email Address</div>
                    <div className="detail-item-value">{selectedDonationRecord.donor_email || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* DONATION DETAILS */}
              <div className="details-section-card">
                <div className="details-section-title">
                  <DollarSign size={15} /> Donation & Payment Details
                </div>
                <div className="details-grid-2col">
                  <div>
                    <div className="detail-item-label">Donation Amount</div>
                    <div className="detail-item-value text-success font-weight-800">{formatCurrency(selectedDonationRecord.amount)}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Donation Date</div>
                    <div className="detail-item-value">{selectedDonationRecord.donation_date}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Payment Method</div>
                    <div className="detail-item-value">{selectedDonationRecord.payment_method ? selectedDonationRecord.payment_method.toUpperCase() : 'UPI'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Category</div>
                    <div className="detail-item-value">{selectedDonationRecord.donation_type === 'campaign' ? 'Special Campaign' : 'General Donation'}</div>
                  </div>
                </div>
              </div>

              {/* RECEIPT ACTION CARD */}
              <div className="details-section-card bg-primary-light">
                <div className="details-section-title text-primary">
                  <FileText size={15} /> Official Receipt
                </div>
                <div className="flex-between margin-top-xs">
                  <div>
                    <div className="detail-item-label">Receipt Status</div>
                    <div className="font-weight-700 text-success">🟢 Issued & Certified</div>
                  </div>
                  <div className="flex-row-gap-xs">
                    <button className="pill-btn-primary font-xs" onClick={() => openReceiptModal(selectedDonationRecord)}>
                      <Award size={13} /> View Receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="pill-btn-ghost" onClick={() => setIsDetailsDrawerOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FILTER DRAWER SHEET */}
      {isMobileFilterOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h4>Filter Donations</h4>
              <button className="modal-close-btn" onClick={() => setIsMobileFilterOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body-scrollable">
              <div className="form-group">
                <label className="form-label">Subscription Year</label>
                <YearFilter selectedYearId={selectedYearId} onChange={setSelectedYearId} showAllOption={true} />
              </div>
              <div className="form-group">
                <label className="form-label">Donor Type</label>
                <select className="form-control" value={selectedDonorType} onChange={(e) => setSelectedDonorType(e.target.value as any)}>
                  <option value="">All Donor Types</option>
                  <option value="member">Mahall Member</option>
                  <option value="external">External Donor</option>
                  <option value="anonymous">Anonymous</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                  <option value="">All Methods</option>
                  <option value="upi">UPI / Online</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
            <div className="modal-footer flex-between">
              <button className="pill-btn-ghost" onClick={() => { clearFilters(); setIsMobileFilterOpen(false); }}>
                Reset
              </button>
              <button className="pill-btn-primary" onClick={() => setIsMobileFilterOpen(false)}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h4>Delete Donation Records</h4>
              <button className="modal-close-btn" onClick={() => setIsBulkDeleteModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body-scrollable">
              <p className="font-sm text-dark">
                Are you sure you want to permanently delete {selectedIds.length} selected donation records? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer flex-between">
              <button className="pill-btn-ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="pill-btn-primary bg-danger" onClick={handleBulkDelete}>
                Delete Records
              </button>
            </div>
          </div>
        </div>
      )}

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
        .pill-btn-danger:hover { background: #fecaca !important; color: #7f1d1d !important; }

        @media (min-width: 768px) {
          .desktop-view-only { display: block !important; }
          .mobile-view-only, .mobile-ledger-cards-list, .mobile-cards-directory { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-view-only { display: none !important; }
          .mobile-view-only, .mobile-ledger-cards-list, .mobile-cards-directory { display: flex !important; flex-direction: column !important; }
          .desktop-filters-only { display: none !important; }
          .page-header { flex-direction: column; align-items: stretch; }
          .header-cta-group { flex-direction: column; align-items: stretch; width: 100%; }
          .stats-dashboard-grid-6 { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }

        @media (max-width: 640px) {
          .modal-overlay { align-items: flex-end !important; padding: 0 !important; background: rgba(17, 24, 39, 0.65) !important; }
          .modal-dialog-card {
            border-bottom-left-radius: 0 !important; border-bottom-right-radius: 0 !important;
            border-top-left-radius: 24px !important; border-top-right-radius: 24px !important;
            max-height: 88vh !important; width: 100% !important; margin: 0 !important;
            animation: slideUpMobile 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          }
        }
        @keyframes slideUpMobile {
          from { transform: translateY(100%); opacity: 0.8; }
          to { transform: translateY(0); opacity: 1; }
        }

        .action-row-buttons { display: flex !important; align-items: center !important; gap: 6px !important; justify-content: flex-end !important; }
        .icon-btn-ghost {
          width: 32px !important; height: 32px !important; border-radius: 8px !important;
          background: transparent !important; border: none !important; color: #6b7280 !important;
          display: inline-flex !important; align-items: center !important; justify-content: center !important;
          cursor: pointer !important; transition: all 0.2s ease !important; outline: none !important; padding: 0 !important;
        }
        .icon-btn-ghost:hover { background: #f3f4f6 !important; color: #111827 !important; }
        .icon-btn-ghost.danger:hover { background: #fee2e2 !important; color: #ef4444 !important; }
      `}</style>
    </div>
  );
};

export default Donations;
