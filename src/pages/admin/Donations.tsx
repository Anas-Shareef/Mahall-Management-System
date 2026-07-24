import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { Donation, DonationCampaign, SubscriptionYear, Member, Household } from '../../services/db';
import { useAuth } from '../../contexts/AuthContext';
import { 
  HeartHandshake, Plus, Search, 
  CheckCircle, AlertCircle, 
  X, Loader2, Printer, Layers,
  Download, Edit2, Trash2, Eye,
  UserX, FileText, RefreshCw
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Donations: React.FC = () => {
  const { user } = useAuth();

  // Active Main Tab: Overview | All Donations | Campaigns
  const [activeTab, setActiveTab] = useState<'overview' | 'donations' | 'campaigns'>('donations');

  // Data States
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedDonationType, setSelectedDonationType] = useState<'' | 'general' | 'campaign'>('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'' | 'received' | 'pending' | 'cancelled' | 'refunded'>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Donation Modal State (Add / Edit)
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donationModalMode, setDonationModalMode] = useState<'add' | 'edit'>('add');
  const [editingDonationId, setEditingDonationId] = useState<string | null>(null);

  // Form Fields - Record / Edit Donation
  const [donationType, setDonationType] = useState<'general' | 'campaign'>('general');
  const [campaignId, setCampaignId] = useState('');
  const [donorType, setDonorType] = useState<'member' | 'external' | 'anonymous'>('external');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [donorMemberId, setDonorMemberId] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'>('cash');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [purpose, setPurpose] = useState('General Mahall Activities');
  const [status, setStatus] = useState<'received' | 'pending' | 'cancelled' | 'refunded'>('received');
  const [notes, setNotes] = useState('');

  // Campaign Modal State (Add / Edit)
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignModalMode, setCampaignModalMode] = useState<'add' | 'edit'>('add');
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Form Fields - Campaign
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('Programme Fund');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'active' | 'completed' | 'cancelled'>('active');

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  // Single Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'donation' | 'campaign'; id: string; name: string } | null>(null);

  // UI Toast & Loading State
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  // Load all initial data from DB
  const loadData = async () => {
    setLoading(true);
    try {
      const [donList, campList, memberList, houseList, yearList] = await Promise.all([
        db.donations.get(),
        db.donationCampaigns.get(),
        db.members.get(),
        db.households.get(),
        db.years.get(),
      ]);
      setDonations(donList);
      setCampaigns(campList);
      setMembers(memberList);
      setHouseholds(houseList);
      setYears(yearList);
    } catch (err) {
      console.error('Failed to load donation data:', err);
      showToast('error', 'Unable to load donations. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered donations memoized logic
  const filteredDonations = useMemo(() => {
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    return donations.filter((d) => {
      const donationYear = new Date(d.donation_date).getFullYear();

      // Search Query Filter
      const donorLabel = d.is_anonymous ? 'anonymous donor' : (d.donor_name || '').toLowerCase();
      const recNo = (d.receipt_number || '').toLowerCase();
      const refNo = (d.reference_number || '').toLowerCase();
      const phone = (d.donor_phone || '').toLowerCase();
      const campObj = campaigns.find((c) => c.id === d.campaign_id);
      const campName = campObj ? campObj.campaign_name.toLowerCase() : '';
      const memObj = members.find((m) => m.id === d.donor_member_id);
      const memName = memObj ? memObj.name.toLowerCase() : '';
      const memCode = memObj ? memObj.id.toLowerCase() : '';

      const query = searchQuery.trim().toLowerCase();
      const matchSearch = !query ||
        donorLabel.includes(query) ||
        recNo.includes(query) ||
        refNo.includes(query) ||
        phone.includes(query) ||
        campName.includes(query) ||
        memName.includes(query) ||
        memCode.includes(query);

      // Filters
      const matchYear = !selectedYearId || !selectedYear || donationYear === selectedYear;
      const matchType = !selectedDonationType || d.donation_type === selectedDonationType;
      const matchCampaign = !selectedCampaignId || d.campaign_id === selectedCampaignId;
      const matchMethod = !selectedMethod || d.payment_method === selectedMethod;
      const matchStatus = !selectedStatus || (d.status || 'received') === selectedStatus;

      // Date Range Filter
      let matchDateRange = true;
      if (fromDate) {
        matchDateRange = matchDateRange && new Date(d.donation_date) >= new Date(fromDate);
      }
      if (toDate) {
        matchDateRange = matchDateRange && new Date(d.donation_date) <= new Date(toDate);
      }

      return matchSearch && matchYear && matchType && matchCampaign && matchMethod && matchStatus && matchDateRange;
    });
  }, [donations, searchQuery, selectedYearId, selectedDonationType, selectedCampaignId, selectedMethod, selectedStatus, fromDate, toDate, years, campaigns, members]);

  // Derived KPI Metrics (Crucial Rule: Only 'received' donations count toward financial totals)
  const metrics = useMemo(() => {
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    // Filter strictly received donations
    const receivedDonations = donations.filter((d) => (d.status || 'received') === 'received');

    const totalDonations = receivedDonations.reduce((sum, d) => sum + Number(d.amount), 0);

    const thisYearDonations = receivedDonations
      .filter((d) => {
        if (selectedYear) {
          return new Date(d.donation_date).getFullYear() === selectedYear;
        }
        return new Date(d.donation_date).getFullYear() === new Date().getFullYear();
      })
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const campaignFunds = receivedDonations
      .filter((d) => d.donation_type === 'campaign')
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const generalDonations = receivedDonations
      .filter((d) => d.donation_type === 'general')
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;
    const count = receivedDonations.length;
    const avgDonation = count > 0 ? Math.round(totalDonations / count) : 0;

    return {
      totalDonations,
      thisYearDonations,
      campaignFunds,
      generalDonations,
      activeCampaignsCount,
      count,
      avgDonation,
    };
  }, [donations, campaigns, selectedYearId, years]);

  // Campaign Progress calculation helper
  const getCampaignMetrics = (campId: string, goalAmount: number) => {
    const campDons = donations.filter((d) => d.campaign_id === campId && (d.status || 'received') === 'received');
    const collected = campDons.reduce((sum, d) => sum + Number(d.amount), 0);
    const donationCount = campDons.length;
    const progress = goalAmount > 0 ? Math.min(100, Math.round((collected / goalAmount) * 100)) : 0;
    const remaining = goalAmount > 0 ? Math.max(0, goalAmount - collected) : 0;

    return { collected, donationCount, progress, remaining };
  };

  // Filtered members list for modal dropdown
  const searchedMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members.slice(0, 10);
    const q = memberSearchQuery.toLowerCase();
    return members.filter((m) => {
      const h = households.find((house) => house.id === m.household_id);
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (h && h.house_number.toLowerCase().includes(q))
      );
    }).slice(0, 15);
  }, [members, households, memberSearchQuery]);

  // Generate Receipt Number
  const generateReceiptNumber = () => {
    const yr = new Date(donationDate || Date.now()).getFullYear();
    const seq = String(donations.length + 1).padStart(6, '0');
    return `DON-${yr}-${seq}`;
  };

  // Open Add Donation Modal
  const openAddDonationModal = () => {
    setDonationModalMode('add');
    setEditingDonationId(null);
    setDonationType('general');
    setCampaignId(campaigns[0]?.id || '');
    setDonorType('external');
    setDonorMemberId('');
    setDonorName('');
    setDonorPhone('');
    setDonorEmail('');
    setDonorAddress('');
    setAmount('');
    setPaymentMethod('cash');
    setDonationDate(new Date().toISOString().split('T')[0]);
    setReceiptNumber(generateReceiptNumber());
    setReferenceNumber('');
    setPurpose('General Mahall Activities');
    setStatus('received');
    setNotes('');
    setMemberSearchQuery('');
    setIsDonationModalOpen(true);
  };

  // Open Edit Donation Modal
  const openEditDonationModal = (don: Donation) => {
    setDonationModalMode('edit');
    setEditingDonationId(don.id);
    setDonationType(don.donation_type);
    setCampaignId(don.campaign_id || campaigns[0]?.id || '');
    
    if (don.is_anonymous) {
      setDonorType('anonymous');
    } else if (don.donor_member_id) {
      setDonorType('member');
      setDonorMemberId(don.donor_member_id);
    } else {
      setDonorType('external');
    }

    setDonorName(don.donor_name || '');
    setDonorPhone(don.donor_phone || '');
    setDonorEmail(don.donor_email || '');
    setDonorAddress(don.donor_address || '');
    setAmount(don.amount);
    setPaymentMethod(don.payment_method);
    setDonationDate(don.donation_date);
    setReceiptNumber(don.receipt_number || generateReceiptNumber());
    setReferenceNumber(don.reference_number || '');
    setPurpose(don.purpose || 'General Mahall Activities');
    setStatus(don.status || 'received');
    setNotes(don.notes || '');
    setMemberSearchQuery('');
    setIsDonationModalOpen(true);
  };

  // Select Member helper in form
  const handleSelectMemberInForm = (m: Member) => {
    setDonorMemberId(m.id);
    setDonorName(m.name);
    setDonorPhone(m.phone || '');
    const h = households.find((house) => house.id === m.household_id);
    setDonorAddress(h ? `House H-${h.house_number}, ${h.address || h.area}` : '');
  };

  // Save Donation (Create / Edit)
  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showToast('error', 'Donation amount must be greater than zero');
      return;
    }
    if (donationType === 'campaign' && !campaignId) {
      showToast('error', 'Please select a campaign for campaign donation');
      return;
    }
    if (donorType === 'member' && !donorMemberId) {
      showToast('error', 'Please select a registered member');
      return;
    }
    if (donorType === 'external' && !donorName.trim()) {
      showToast('error', 'Donor name is required for external donor');
      return;
    }

    setIsSaving(true);
    try {
      const isAnon = donorType === 'anonymous';
      const resolvedDonorName = isAnon ? 'Anonymous Donor' : donorName.trim();

      const payload: Omit<Donation, 'id' | 'created_at' | 'updated_at'> = {
        donation_type: donationType,
        campaign_id: donationType === 'campaign' ? campaignId : null,
        donor_type: donorType,
        donor_name: resolvedDonorName,
        donor_phone: isAnon ? null : (donorPhone.trim() || null),
        donor_email: isAnon ? null : (donorEmail.trim() || null),
        donor_address: isAnon ? null : (donorAddress.trim() || null),
        donor_member_id: donorType === 'member' ? donorMemberId : null,
        is_anonymous: isAnon,
        amount: Number(amount),
        payment_method: paymentMethod,
        donation_date: donationDate,
        receipt_number: receiptNumber.trim() || generateReceiptNumber(),
        reference_number: referenceNumber.trim() || null,
        purpose: donationType === 'general' ? (purpose.trim() || 'General Mahall Activities') : null,
        status: status,
        notes: notes.trim() || null,
        recorded_by: user ? user.id : null,
      };

      let savedDon: Donation;
      if (donationModalMode === 'add') {
        savedDon = await db.donations.create(payload);
        showToast('success', 'Donation recorded successfully');

        // Audit Log
        await db.auditLogs.log({
          user_id: user ? user.id : null,
          action: 'create_donation',
          entity_type: 'donation',
          entity_id: savedDon.id,
          new_data: savedDon,
        });
      } else {
        if (!editingDonationId) return;
        savedDon = await db.donations.update(editingDonationId, payload);
        showToast('success', 'Donation record updated');

        // Audit Log
        await db.auditLogs.log({
          user_id: user ? user.id : null,
          action: 'update_donation',
          entity_type: 'donation',
          entity_id: editingDonationId,
          new_data: savedDon,
        });
      }

      setIsDonationModalOpen(false);
      loadData();

      // Show printable receipt for new donations
      if (donationModalMode === 'add') {
        setSelectedDonation(savedDon);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Error saving donation:', err);
      showToast('error', 'Unable to save this donation. Please check details.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Add Campaign Modal
  const openAddCampaignModal = () => {
    setCampaignModalMode('add');
    setEditingCampaignId(null);
    setCampaignName('');
    setCampaignType('Programme Fund');
    setCampaignDesc('');
    setTargetAmount('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setCoverImage('');
    setCampaignStatus('active');
    setIsCampaignModalOpen(true);
  };

  // Open Edit Campaign Modal
  const openEditCampaignModal = (camp: DonationCampaign) => {
    setCampaignModalMode('edit');
    setEditingCampaignId(camp.id);
    setCampaignName(camp.campaign_name);
    setCampaignType(camp.campaign_type || 'Programme Fund');
    setCampaignDesc(camp.description || '');
    setTargetAmount(camp.target_amount > 0 ? camp.target_amount : '');
    setStartDate(camp.start_date || '');
    setEndDate(camp.end_date || '');
    setCoverImage(camp.cover_image || '');
    setCampaignStatus(camp.status);
    setIsCampaignModalOpen(true);
  };

  // Save Campaign (Create / Edit)
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      showToast('error', 'Campaign name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<DonationCampaign, 'id' | 'created_at' | 'updated_at'> = {
        campaign_name: campaignName.trim(),
        campaign_type: campaignType,
        description: campaignDesc.trim() || null,
        target_amount: targetAmount ? Number(targetAmount) : 0,
        start_date: startDate || null,
        end_date: endDate || null,
        cover_image: coverImage.trim() || null,
        status: campaignStatus,
        created_by: user ? user.id : null,
      };

      if (campaignModalMode === 'add') {
        const newCamp = await db.donationCampaigns.create(payload);
        showToast('success', 'Donation campaign created');
        await db.auditLogs.log({
          user_id: user ? user.id : null,
          action: 'create_campaign',
          entity_type: 'donation_campaign',
          entity_id: newCamp.id,
          new_data: newCamp,
        });
      } else {
        if (!editingCampaignId) return;
        const updatedCamp = await db.donationCampaigns.update(editingCampaignId, payload);
        showToast('success', 'Donation campaign updated');
        await db.auditLogs.log({
          user_id: user ? user.id : null,
          action: 'update_campaign',
          entity_type: 'donation_campaign',
          entity_id: editingCampaignId,
          new_data: updatedCamp,
        });
      }

      setIsCampaignModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving campaign:', err);
      showToast('error', 'Unable to save campaign. Please check details.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Action Trigger
  const promptDelete = (type: 'donation' | 'campaign', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setIsDeleteModalOpen(true);
  };

  // Confirm Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setIsSaving(true);
    try {
      if (itemToDelete.type === 'donation') {
        await db.donations.delete(itemToDelete.id);
        showToast('success', 'Donation record deleted');
        await db.auditLogs.log({
          user_id: user ? user.id : null,
          action: 'delete_donation',
          entity_type: 'donation',
          entity_id: itemToDelete.id,
        });
      } else {
        await db.donationCampaigns.delete(itemToDelete.id);
        showToast('success', 'Campaign deleted');
        await db.auditLogs.log({
          user_id: user ? user.id : null,
          action: 'delete_campaign',
          entity_type: 'donation_campaign',
          entity_id: itemToDelete.id,
        });
      }
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting record:', err);
      showToast('error', 'Failed to delete record');
    } finally {
      setIsSaving(false);
    }
  };

  // Checkbox Select All / Individual
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredDonations.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectIndividual = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Confirm Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSaving(true);
    try {
      await db.donations.deleteMultiple(selectedIds);
      showToast('success', `${selectedIds.length} donations deleted successfully`);
      await db.auditLogs.log({
        user_id: user ? user.id : null,
        action: 'bulk_delete_donations',
        entity_type: 'donation',
        old_data: { count: selectedIds.length, ids: selectedIds },
      });
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error bulk deleting donations:', err);
      showToast('error', 'Failed to delete selected donations');
    } finally {
      setIsSaving(false);
    }
  };

  // Export CSV respecting currently applied filters
  const handleExportCSV = () => {
    if (filteredDonations.length === 0) {
      showToast('error', 'No donation records match the selected filters to export');
      return;
    }

    const headers = [
      'Receipt No',
      'Date',
      'Donor Name',
      'Donor Type',
      'Member ID',
      'Donation Type',
      'Campaign / Purpose',
      'Amount (INR)',
      'Payment Method',
      'Status',
      'Reference No',
      'Notes'
    ];

    const rows = filteredDonations.map((d) => {
      const camp = campaigns.find((c) => c.id === d.campaign_id);
      const mem = members.find((m) => m.id === d.donor_member_id);
      const campOrPurpose = d.donation_type === 'campaign' ? (camp ? camp.campaign_name : 'Campaign') : (d.purpose || 'General Mahall Activities');
      const donorTypeLabel = d.is_anonymous ? 'Anonymous' : (d.donor_member_id ? 'Member' : 'External');
      const donorNameLabel = d.is_anonymous ? 'Anonymous Donor' : (d.donor_name || 'Wellwisher');

      return [
        `"${d.receipt_number || ''}"`,
        `"${d.donation_date}"`,
        `"${donorNameLabel.replace(/"/g, '""')}"`,
        `"${donorTypeLabel}"`,
        `"${mem ? mem.id : ''}"`,
        `"${d.donation_type}"`,
        `"${campOrPurpose.replace(/"/g, '""')}"`,
        d.amount,
        `"${d.payment_method}"`,
        `"${d.status || 'received'}"`,
        `"${d.reference_number || ''}"`,
        `"${(d.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mahall_Donations_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Donations report CSV exported successfully');
  };

  // Helper function to render status badges
  const renderStatusBadge = (st: string = 'received') => {
    switch (st) {
      case 'received':
        return <span className="badge badge-success">Received</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'cancelled':
        return <span className="badge badge-danger">Cancelled</span>;
      case 'refunded':
        return <span className="badge badge-secondary">Refunded</span>;
      default:
        return <span className="badge badge-success">Received</span>;
    }
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

      {/* Header Bar */}
      <div className="canvas-header-bar margin-bottom">
        <div className="canvas-title-group">
          <div className="canvas-title-icon-box">
            <HeartHandshake size={22} color="#ffffff" />
          </div>
          <div>
            <h2 className="canvas-page-title">Donations & Campaigns</h2>
            <p className="summary-card-sub">Manage general donations, member contributions, and special fundraising campaigns.</p>
          </div>
        </div>

        <div className="header-action-btns flex-row-gap">
          <button className="pill-btn-primary" onClick={openAddDonationModal}>
            <Plus size={16} />
            <span>+ Record Donation</span>
          </button>
          <button className="pill-btn-secondary" onClick={openAddCampaignModal}>
            <Layers size={16} />
            <span>+ Create Campaign</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="dues-metrics-row margin-bottom">
        <div className="metric-box glass-card">
          <span className="metric-label">Total Donations Collected</span>
          <h3 className="metric-value text-success">{formatCurrency(metrics.totalDonations)}</h3>
          <span className="metric-sub">{metrics.count} received contributions</span>
        </div>
        <div className="metric-box glass-card">
          <span className="metric-label">Selected / Active Year</span>
          <h3 className="metric-value">{formatCurrency(metrics.thisYearDonations)}</h3>
          <span className="metric-sub">Received in active year</span>
        </div>
        <div className="metric-box glass-card">
          <span className="metric-label">Campaign Funds</span>
          <h3 className="metric-value text-primary">{formatCurrency(metrics.campaignFunds)}</h3>
          <span className="metric-sub">{metrics.activeCampaignsCount} active campaigns</span>
        </div>
        <div className="metric-box glass-card">
          <span className="metric-label">General Donations</span>
          <h3 className="metric-value">{formatCurrency(metrics.generalDonations)}</h3>
          <span className="metric-sub">General Mahall activities</span>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="reports-nav-tabs margin-bottom">
        <button
          className={`tab-pill-btn ${activeTab === 'donations' ? 'active' : ''}`}
          onClick={() => setActiveTab('donations')}
        >
          <HeartHandshake size={15} />
          <span>All Donations ({donations.length})</span>
        </button>
        <button
          className={`tab-pill-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          <Layers size={15} />
          <span>Special Campaigns ({campaigns.length})</span>
        </button>
        <button
          className={`tab-pill-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FileText size={15} />
          <span>Analytics & Reports</span>
        </button>
      </div>

      {/* TAB 1: ALL DONATIONS */}
      {activeTab === 'donations' && (
        <>
          {/* Multi-Row Dynamic Filter Toolbar */}
          <div className="glass-card filter-bar margin-bottom">
            <div className="search-box margin-bottom-sm">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search donor name, member ID, phone, receipt or campaign..."
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
                allOptionLabel="All Years"
              />

              <select value={selectedDonationType} onChange={(e) => setSelectedDonationType(e.target.value as any)}>
                <option value="">All Donation Types</option>
                <option value="general">General Donation</option>
                <option value="campaign">Campaign Donation</option>
              </select>

              <select value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)}>
                <option value="">All Campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.campaign_name}</option>
                ))}
              </select>

              <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                <option value="">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI / Online</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>

              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
                <option value="">All Statuses</option>
                <option value="received">Received</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>

              <div className="date-range-group flex-row-gap-sm">
                <input
                  type="date"
                  className="date-picker-input"
                  title="From Date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span className="text-muted font-xs">to</span>
                <input
                  type="date"
                  className="date-picker-input"
                  title="To Date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            {/* Toolbar Action Bar */}
            <div className="filter-actions-bar flex-between margin-top-sm">
              <div className="flex-row-gap-sm">
                {selectedIds.length > 0 && (
                  <button className="pill-btn-danger" onClick={() => setIsBulkDeleteModalOpen(true)}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedIds.length})</span>
                  </button>
                )}
                {(selectedYearId || selectedDonationType || selectedCampaignId || selectedMethod || selectedStatus || fromDate || toDate || searchQuery) && (
                  <button
                    className="pill-btn-ghost font-xs"
                    onClick={() => {
                      setSelectedYearId('');
                      setSelectedDonationType('');
                      setSelectedCampaignId('');
                      setSelectedMethod('');
                      setSelectedStatus('');
                      setFromDate('');
                      setToDate('');
                      setSearchQuery('');
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              <button className="pill-btn-secondary font-xs" onClick={handleExportCSV}>
                <Download size={14} />
                <span>Export CSV ({filteredDonations.length})</span>
              </button>
            </div>
          </div>

          {/* Donations Data View */}
          <div className="glass-card main-table-card">
            {loading ? (
              <div className="loading-spinner-box">
                <Loader2 size={24} className="spinner" />
                <span>Loading donations...</span>
              </div>
            ) : filteredDonations.length === 0 ? (
              <div className="notif-empty">
                <HeartHandshake size={36} className="empty-icon" />
                <p className="empty-title">No donation records found</p>
                <p className="empty-sub">Record your first donation or adjust filters to view contributions.</p>
                <button className="pill-btn-primary margin-top-sm" onClick={openAddDonationModal}>
                  + Record Donation
                </button>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="desktop-table-container">
                  <table className="custom-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.length === filteredDonations.length && filteredDonations.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th>Receipt No</th>
                        <th>Date</th>
                        <th>Donor</th>
                        <th>Type & Campaign / Purpose</th>
                        <th>Amount</th>
                        <th>Payment Method</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonations.map((d) => {
                        const campObj = campaigns.find((c) => c.id === d.campaign_id);
                        const memObj = members.find((m) => m.id === d.donor_member_id);
                        const isSelected = selectedIds.includes(d.id);

                        return (
                          <tr key={d.id} className={isSelected ? 'selected-row' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectIndividual(d.id)}
                              />
                            </td>
                            <td className="font-semibold text-primary">
                              {d.receipt_number || 'N/A'}
                            </td>
                            <td className="font-xs color-subtle">{d.donation_date}</td>
                            <td>
                              {d.is_anonymous ? (
                                <span className="anonymous-tag font-weight-600">
                                  <UserX size={13} /> Anonymous Donor
                                </span>
                              ) : (
                                <div>
                                  <div className="font-weight-600">{d.donor_name || 'Wellwisher'}</div>
                                  {memObj ? (
                                    <span className="member-code-badge font-xs">
                                      Member ID: {memObj.id.substring(0, 8)}
                                    </span>
                                  ) : (
                                    d.donor_phone && <span className="font-xs text-muted">{d.donor_phone}</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              {d.donation_type === 'campaign' ? (
                                <div>
                                  <span className="badge badge-info margin-bottom-xs">Campaign</span>
                                  <div className="font-weight-600">{campObj ? campObj.campaign_name : 'Campaign Fund'}</div>
                                </div>
                              ) : (
                                <div>
                                  <span className="badge badge-secondary margin-bottom-xs">General</span>
                                  <div className="font-xs text-muted">{d.purpose || 'General Mahall Activities'}</div>
                                </div>
                              )}
                            </td>
                            <td className="font-weight-700 text-success" style={{ fontSize: '15px' }}>
                              {formatCurrency(d.amount)}
                            </td>
                            <td>
                              <span className="payment-method-pill">{d.payment_method.toUpperCase()}</span>
                            </td>
                            <td>{renderStatusBadge(d.status)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-group">
                                <button
                                  className="icon-action-btn"
                                  title="View Receipt"
                                  onClick={() => {
                                    setSelectedDonation(d);
                                    setIsReceiptModalOpen(true);
                                  }}
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  className="icon-action-btn"
                                  title="Edit Donation"
                                  onClick={() => openEditDonationModal(d)}
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  className="icon-action-btn danger"
                                  title="Delete Donation"
                                  onClick={() => promptDelete('donation', d.id, `Receipt #${d.receipt_number}`)}
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

                {/* Mobile View Cards (<768px) */}
                <div className="mobile-cards-container">
                  {filteredDonations.map((d) => {
                    const campObj = campaigns.find((c) => c.id === d.campaign_id);
                    const isSelected = selectedIds.includes(d.id);

                    return (
                      <div key={d.id} className={`mobile-record-card glass-card ${isSelected ? 'selected' : ''}`}>
                        <div className="mobile-card-header flex-between">
                          <div className="flex-row-gap-xs">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectIndividual(d.id)}
                            />
                            <span className="font-weight-700 text-primary">{d.receipt_number || 'N/A'}</span>
                          </div>
                          {renderStatusBadge(d.status)}
                        </div>

                        <div className="mobile-card-body margin-top-xs">
                          <div className="mobile-card-row flex-between">
                            <span className="mobile-card-label">Donor:</span>
                            <span className="font-weight-600">
                              {d.is_anonymous ? 'Anonymous Donor' : (d.donor_name || 'Wellwisher')}
                            </span>
                          </div>

                          <div className="mobile-card-row flex-between">
                            <span className="mobile-card-label">Amount:</span>
                            <span className="font-weight-700 text-success">{formatCurrency(d.amount)}</span>
                          </div>

                          <div className="mobile-card-row flex-between">
                            <span className="mobile-card-label">Type / Purpose:</span>
                            <span className="font-xs">
                              {d.donation_type === 'campaign' ? (campObj ? campObj.campaign_name : 'Campaign') : (d.purpose || 'General')}
                            </span>
                          </div>

                          <div className="mobile-card-row flex-between">
                            <span className="mobile-card-label">Date & Method:</span>
                            <span className="font-xs text-muted">{d.donation_date} ({d.payment_method.toUpperCase()})</span>
                          </div>
                        </div>

                        <div className="mobile-card-footer flex-end gap-xs margin-top-sm">
                          <button
                            className="pill-btn-ghost font-xs"
                            onClick={() => {
                              setSelectedDonation(d);
                              setIsReceiptModalOpen(true);
                            }}
                          >
                            <Eye size={13} /> Receipt
                          </button>
                          <button className="pill-btn-ghost font-xs" onClick={() => openEditDonationModal(d)}>
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            className="pill-btn-danger font-xs"
                            onClick={() => promptDelete('donation', d.id, `Receipt #${d.receipt_number}`)}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* TAB 2: SPECIAL CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="campaigns-section animate-fade-in">
          <div className="flex-between margin-bottom">
            <div>
              <h3 className="section-title">Special Fundraising Campaigns</h3>
              <p className="summary-card-sub">Manage active, completed, or upcoming community fundraising drives.</p>
            </div>
            <button className="pill-btn-primary" onClick={openAddCampaignModal}>
              <Plus size={16} />
              <span>+ Create Campaign</span>
            </button>
          </div>

          {loading ? (
            <div className="loading-spinner-box">
              <Loader2 size={24} className="spinner" />
              <span>Loading campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="glass-card notif-empty">
              <Layers size={36} className="empty-icon" />
              <p className="empty-title">No donation campaigns yet</p>
              <p className="empty-sub">Create a campaign to start collecting special programme donations.</p>
              <button className="pill-btn-primary margin-top-sm" onClick={openAddCampaignModal}>
                + Create Campaign
              </button>
            </div>
          ) : (
            <div className="campaigns-grid">
              {campaigns.map((camp) => {
                const { collected, donationCount, progress, remaining } = getCampaignMetrics(camp.id, camp.target_amount);

                return (
                  <div key={camp.id} className="campaign-card glass-card shadow-sm">
                    <div className="campaign-card-header flex-between">
                      <span className="badge badge-info">{camp.campaign_type}</span>
                      <span className={`badge badge-${camp.status === 'active' ? 'success' : camp.status === 'completed' ? 'primary' : 'secondary'}`}>
                        {camp.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="campaign-card-title margin-top-xs">{camp.campaign_name}</h3>
                    {camp.description && <p className="campaign-card-desc">{camp.description}</p>}

                    <div className="campaign-stats-grid margin-top-sm">
                      <div>
                        <span className="stat-label">Collected</span>
                        <h4 className="stat-val text-success">{formatCurrency(collected)}</h4>
                      </div>
                      <div>
                        <span className="stat-label">Goal Target</span>
                        <h4 className="stat-val">{camp.target_amount > 0 ? formatCurrency(camp.target_amount) : 'Open'}</h4>
                      </div>
                    </div>

                    {camp.target_amount > 0 && (
                      <div className="progress-bar-box margin-top-xs">
                        <div className="progress-bar-header flex-between font-xs">
                          <span>Progress: {progress}%</span>
                          <span>Remaining: {formatCurrency(remaining)}</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    )}

                    <div className="campaign-footer-meta flex-between margin-top-sm pt-xs border-top">
                      <span className="font-xs color-subtle">
                        <HeartHandshake size={13} className="inline-block align-middle" /> {donationCount} Donations
                      </span>
                      <div className="action-buttons-group">
                        <button className="icon-action-btn" title="Edit Campaign" onClick={() => openEditCampaignModal(camp)}>
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="icon-action-btn danger"
                          title="Delete Campaign"
                          onClick={() => promptDelete('campaign', camp.id, camp.campaign_name)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="overview-analytics-section animate-fade-in">
          <div className="glass-card margin-bottom">
            <h3 className="section-title margin-bottom-xs">Donation Analytics & Breakdown</h3>
            <p className="summary-card-sub margin-bottom">Real-time consolidated donation performance across general and campaign funds.</p>

            <div className="analytics-kpi-grid">
              <div className="analytics-card">
                <span className="analytics-label">Total Contributions Received</span>
                <h2 className="analytics-val text-success">{formatCurrency(metrics.totalDonations)}</h2>
                <p className="analytics-sub">{metrics.count} total records</p>
              </div>

              <div className="analytics-card">
                <span className="analytics-label">Average Donation Size</span>
                <h2 className="analytics-val">{formatCurrency(metrics.avgDonation)}</h2>
                <p className="analytics-sub">Per donor transaction</p>
              </div>

              <div className="analytics-card">
                <span className="analytics-label">General Fund Collection</span>
                <h2 className="analytics-val">{formatCurrency(metrics.generalDonations)}</h2>
                <p className="analytics-sub">Unrestricted Mahall funds</p>
              </div>

              <div className="analytics-card">
                <span className="analytics-label">Special Campaign Collection</span>
                <h2 className="analytics-val text-primary">{formatCurrency(metrics.campaignFunds)}</h2>
                <p className="analytics-sub">Restricted programme funds</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DONATION */}
      {isDonationModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content-card glass-card max-w-lg animate-scale-up">
            <div className="modal-header flex-between">
              <h3 className="modal-title">
                {donationModalMode === 'add' ? '+ Record New Donation' : 'Edit Donation Record'}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsDonationModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDonation} className="modal-body form-grid gap-sm">
              {/* Donation Type Toggle */}
              <div className="form-group">
                <label className="form-label font-weight-600">Donation Category *</label>
                <div className="toggle-btn-group">
                  <button
                    type="button"
                    className={`toggle-option-btn ${donationType === 'general' ? 'active' : ''}`}
                    onClick={() => setDonationType('general')}
                  >
                    General Donation
                  </button>
                  <button
                    type="button"
                    className={`toggle-option-btn ${donationType === 'campaign' ? 'active' : ''}`}
                    onClick={() => setDonationType('campaign')}
                  >
                    Special Campaign
                  </button>
                </div>
              </div>

              {/* Campaign Dropdown if Campaign type selected */}
              {donationType === 'campaign' && (
                <div className="form-group">
                  <label className="form-label font-weight-600">Select Campaign *</label>
                  <select
                    className="form-control"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Campaign --</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.campaign_name} ({c.campaign_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Donor Type Selector */}
              <div className="form-group">
                <label className="form-label font-weight-600">Donor Type *</label>
                <div className="toggle-btn-group">
                  <button
                    type="button"
                    className={`toggle-option-btn ${donorType === 'member' ? 'active' : ''}`}
                    onClick={() => setDonorType('member')}
                  >
                    Registered Member
                  </button>
                  <button
                    type="button"
                    className={`toggle-option-btn ${donorType === 'external' ? 'active' : ''}`}
                    onClick={() => setDonorType('external')}
                  >
                    External Donor
                  </button>
                  <button
                    type="button"
                    className={`toggle-option-btn ${donorType === 'anonymous' ? 'active' : ''}`}
                    onClick={() => setDonorType('anonymous')}
                  >
                    Anonymous
                  </button>
                </div>
              </div>

              {/* Donor Type 1: Member Linkage */}
              {donorType === 'member' && (
                <div className="form-group member-picker-box">
                  <label className="form-label font-weight-600">Search & Select Member *</label>
                  <input
                    type="text"
                    className="form-control margin-bottom-xs"
                    placeholder="Search member name, ID, or house number..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                  />
                  <div className="member-select-list">
                    {searchedMembers.map((m) => {
                      const h = households.find((house) => house.id === m.household_id);
                      const isChosen = donorMemberId === m.id;
                      return (
                        <div
                          key={m.id}
                          className={`member-select-item flex-between ${isChosen ? 'selected' : ''}`}
                          onClick={() => handleSelectMemberInForm(m)}
                        >
                          <div>
                            <div className="font-weight-600">{m.name}</div>
                            <span className="font-xs text-muted">
                              ID: {m.id.substring(0, 8)} | House: H-{h ? h.house_number : 'N/A'}
                            </span>
                          </div>
                          {isChosen && <CheckCircle size={16} className="text-success" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Donor Type 2: External Donor Details */}
              {donorType === 'external' && (
                <>
                  <div className="form-group">
                    <label className="form-label font-weight-600">Donor Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Muhammad Anas"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. +91 9876543210"
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="e.g. donor@gmail.com"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Donor Type 3: Anonymous Notice */}
              {donorType === 'anonymous' && (
                <div className="info-banner-box">
                  <UserX size={16} />
                  <span>Anonymous Donation: Personal donor identity will be omitted from public records.</span>
                </div>
              )}

              {/* Amount & Date */}
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label font-weight-600">Donation Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control font-weight-700 text-success"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label font-weight-600">Donation Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Payment Method & Status */}
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label font-weight-600">Payment Method *</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / Online</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label font-weight-600">Status *</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="received">Received (Collected)</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              {/* Receipt No & Purpose */}
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Receipt Number</label>
                  <input
                    type="text"
                    className="form-control font-mono"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                  />
                </div>
                {donationType === 'general' && (
                  <div className="form-group">
                    <label className="form-label">Purpose</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="General Mahall Activities"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes / Remarks</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Optional remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer flex-end gap-xs margin-top-sm">
                <button type="button" className="pill-btn-ghost" onClick={() => setIsDonationModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pill-btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spinner" /> : (donationModalMode === 'add' ? 'Save Donation' : 'Update Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT CAMPAIGN */}
      {isCampaignModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content-card glass-card max-w-md animate-scale-up">
            <div className="modal-header flex-between">
              <h3 className="modal-title">
                {campaignModalMode === 'add' ? '+ Create Fundraising Campaign' : 'Edit Campaign Details'}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsCampaignModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="modal-body form-grid gap-sm">
              <div className="form-group">
                <label className="form-label font-weight-600">Campaign Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rabeeh Programme Fund 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Campaign Type</label>
                  <select
                    className="form-control"
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                  >
                    <option value="Programme Fund">Programme Fund</option>
                    <option value="Masjid Renovation">Masjid Renovation</option>
                    <option value="Madrasa Development">Madrasa Development</option>
                    <option value="Poor Family Support">Poor Family Support</option>
                    <option value="Education Fund">Education Fund</option>
                    <option value="Medical Assistance">Medical Assistance</option>
                    <option value="Zakat Fund">Zakat Fund</option>
                    <option value="Other">Other Initiative</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={campaignStatus}
                    onChange={(e) => setCampaignStatus(e.target.value as any)}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Goal Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="Leave 0 for open/unlimited goal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Purpose</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Explain campaign purpose and objectives..."
                  value={campaignDesc}
                  onChange={(e) => setCampaignDesc(e.target.value)}
                />
              </div>

              <div className="modal-footer flex-end gap-xs margin-top-sm">
                <button type="button" className="pill-btn-ghost" onClick={() => setIsCampaignModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pill-btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spinner" /> : (campaignModalMode === 'add' ? 'Create Campaign' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE / VIEW DONATION RECEIPT */}
      {isReceiptModalOpen && selectedDonation && (
        <div className="modal-backdrop">
          <div className="modal-content-card glass-card max-w-md animate-scale-up">
            <div className="modal-header flex-between no-print">
              <h3 className="modal-title flex-row-gap-xs">
                <Printer size={18} /> Donation Receipt
              </h3>
              <button className="modal-close-btn" onClick={() => setIsReceiptModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="printable-receipt-card padding-md" id="printable-receipt">
              <div className="receipt-header text-center border-bottom pb-sm">
                <h2 className="mahall-receipt-name">Vellikkeel Mahall Management</h2>
                <p className="mahall-receipt-sub">Official Contribution Receipt</p>
                <div className="receipt-no-badge margin-top-xs font-mono">
                  Receipt No: {selectedDonation.receipt_number || 'DON-REC'}
                </div>
              </div>

              <div className="receipt-details-list margin-top-md font-sm">
                <div className="receipt-row flex-between py-xs border-bottom-light">
                  <span className="text-muted">Date:</span>
                  <span className="font-weight-600">{selectedDonation.donation_date}</span>
                </div>

                <div className="receipt-row flex-between py-xs border-bottom-light">
                  <span className="text-muted">Donor Name:</span>
                  <span className="font-weight-700">
                    {selectedDonation.is_anonymous ? 'Anonymous Donor' : (selectedDonation.donor_name || 'Wellwisher')}
                  </span>
                </div>

                <div className="receipt-row flex-between py-xs border-bottom-light">
                  <span className="text-muted">Category:</span>
                  <span className="font-weight-600">
                    {selectedDonation.donation_type === 'campaign' ? 'Special Campaign' : 'General Donation'}
                  </span>
                </div>

                {selectedDonation.campaign_id && (
                  <div className="receipt-row flex-between py-xs border-bottom-light">
                    <span className="text-muted">Campaign:</span>
                    <span className="font-weight-600">
                      {campaigns.find((c) => c.id === selectedDonation.campaign_id)?.campaign_name || 'Campaign'}
                    </span>
                  </div>
                )}

                {selectedDonation.purpose && selectedDonation.donation_type === 'general' && (
                  <div className="receipt-row flex-between py-xs border-bottom-light">
                    <span className="text-muted">Purpose:</span>
                    <span className="font-weight-600">{selectedDonation.purpose}</span>
                  </div>
                )}

                <div className="receipt-row flex-between py-xs border-bottom-light">
                  <span className="text-muted">Payment Method:</span>
                  <span className="font-weight-600">{selectedDonation.payment_method.toUpperCase()}</span>
                </div>

                <div className="receipt-amount-banner margin-top-md text-center py-sm glass-card bg-success-light">
                  <span className="font-xs text-muted">Amount Received</span>
                  <h2 className="text-success font-weight-800 margin-top-xs">
                    {formatCurrency(selectedDonation.amount)}
                  </h2>
                </div>
              </div>

              <div className="receipt-footer text-center margin-top-md pt-sm border-top font-xs text-muted">
                <p>May Allah accept your generous contribution. Jazakallah Khair.</p>
              </div>
            </div>

            <div className="modal-footer flex-end gap-xs margin-top-sm no-print">
              <button className="pill-btn-ghost" onClick={() => setIsReceiptModalOpen(false)}>
                Close
              </button>
              <button className="pill-btn-primary" onClick={() => window.print()}>
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMATION FOR SINGLE DELETE */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="modal-backdrop">
          <div className="modal-content-card glass-card max-w-xs text-center animate-scale-up">
            <AlertCircle size={40} className="text-danger margin-bottom-xs" style={{ margin: '0 auto' }} />
            <h3 className="modal-title">Delete {itemToDelete.type === 'donation' ? 'Donation Record' : 'Campaign'}?</h3>
            <p className="summary-card-sub margin-top-xs">
              Are you sure you want to delete <strong>{itemToDelete.name}</strong>? This action cannot be undone.
            </p>

            <div className="modal-footer flex-center gap-xs margin-top-md">
              <button className="pill-btn-ghost" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="pill-btn-danger" onClick={handleConfirmSingleDelete} disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="spinner" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRMATION FOR BULK DELETE */}
      {isBulkDeleteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content-card glass-card max-w-xs text-center animate-scale-up">
            <AlertCircle size={40} className="text-danger margin-bottom-xs" style={{ margin: '0 auto' }} />
            <h3 className="modal-title">Delete {selectedIds.length} Donations?</h3>
            <p className="summary-card-sub margin-top-xs">
              Are you sure you want to permanently delete the <strong>{selectedIds.length}</strong> selected donation records?
            </p>

            <div className="modal-footer flex-center gap-xs margin-top-md">
              <button className="pill-btn-ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="pill-btn-danger" onClick={handleConfirmBulkDelete} disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="spinner" /> : `Delete ${selectedIds.length} Records`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donations;
