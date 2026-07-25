import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { 
  Donation, DonationCampaign, SubscriptionYear, Member, Household 
} from '../../services/db';
import { 
  Plus, Search, Filter, Calendar, X, AlertCircle, 
  CheckCircle, Loader2, Layers, DollarSign, Eye,
  Download, Edit2, Trash2, ChevronDown, User, Users,
  HelpCircle, Check, Printer, RefreshCw, FileText, HeartHandshake
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
  const [selectedStatus, setSelectedStatus] = useState<'' | 'received' | 'pending' | 'cancelled' | 'refunded'>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Mobile Bottom-Sheet Filter State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Export Dropdown Menu State
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Add / Edit Donation Drawer State
  const [isDonationDrawerOpen, setIsDonationDrawerOpen] = useState(false);
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

  // Form Validation Touched State
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Campaign Modal State
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
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'active' | 'completed' | 'cancelled'>('active');

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  // Single Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'donation' | 'campaign'; id: string; name: string } | null>(null);

  // UI Toast State
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Close Export Dropdown on Outside Click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load All Initial Data
  const loadData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [yearList, donList, campList, memberList, houseList] = await Promise.all([
        db.years.get(),
        db.donations.get(),
        db.donationCampaigns.get(),
        db.members.get(),
        db.households.get(),
      ]);
      setYears(yearList);
      setDonations(donList);
      setCampaigns(campList);
      setMembers(memberList);
      setHouseholds(houseList);
    } catch (err) {
      console.error('Failed to load donation data:', err);
      setFetchError(true);
      showToast('error', 'Unable to load donations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Avatar Initials Generator
  const getAvatarInitials = (name: string | null, isAnon: boolean) => {
    if (isAnon || !name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Avatar Background Color Class
  const getAvatarBgClass = (isAnon: boolean, donorMemberId: string | null) => {
    if (isAnon) return 'avatar-anon';
    if (donorMemberId) return 'avatar-member';
    return 'avatar-external';
  };

  // Filtered Donations Logic
  const filteredDonations = useMemo(() => {
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    return donations.filter((d) => {
      // Sub-tab filter: All | General | Campaigns
      if (activeTab === 'general' && d.donation_type !== 'general') return false;
      if (activeTab === 'campaigns' && d.donation_type !== 'campaign') return false;

      const donationYear = new Date(d.donation_date).getFullYear();

      // Search Query
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
  }, [donations, searchQuery, activeTab, selectedYearId, selectedDonationType, selectedCampaignId, selectedMethod, selectedStatus, fromDate, toDate, years, campaigns, members]);

  // Dynamic KPI Summary Metrics (strictly received donations)
  const metrics = useMemo(() => {
    const selectedYearObj = years.find((y) => y.id === selectedYearId) || null;
    const selectedYear = selectedYearObj?.year ?? null;
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

    const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;

    return {
      totalDonations,
      thisYearDonations,
      campaignFunds,
      activeCampaignsCount,
      selectedYearNumber: selectedYearObj ? selectedYearObj.year : 'Across all years',
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

  // Member search results for drawer selector
  const searchedMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members.slice(0, 8);
    const q = memberSearchQuery.toLowerCase();
    return members.filter((m) => {
      const h = households.find((house) => house.id === m.household_id);
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (h && h.house_number.toLowerCase().includes(q))
      );
    }).slice(0, 12);
  }, [members, households, memberSearchQuery]);

  // Auto-generate Receipt Number
  const generateReceiptNumber = () => {
    const yr = new Date(donationDate || Date.now()).getFullYear();
    const seq = String(donations.length + 1).padStart(6, '0');
    return `DON-${yr}-${seq}`;
  };

  // Open Add Donation Drawer
  const openAddDonationDrawer = () => {
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
    setFormSubmitted(false);
    setIsDonationDrawerOpen(true);
  };

  // Open Edit Donation Drawer
  const openEditDonationDrawer = (don: Donation) => {
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
    setFormSubmitted(false);
    setIsDonationDrawerOpen(true);
  };

  // Select Member helper in drawer
  const handleSelectMemberInDrawer = (m: Member) => {
    setDonorMemberId(m.id);
    setDonorName(m.name);
    setDonorPhone(m.phone || '');
    const h = households.find((house) => house.id === m.household_id);
    setDonorAddress(h ? `House H-${h.house_number}, ${h.address || h.area}` : '');
  };

  // Save Donation
  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);

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
        await db.auditLogs.log({
          user_id: user ? user.id : null,
          action: 'update_donation',
          entity_type: 'donation',
          entity_id: editingDonationId,
          new_data: savedDon,
        });
      }

      setIsDonationDrawerOpen(false);
      loadData();

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
    setCampaignStatus(camp.status);
    setIsCampaignModalOpen(true);
  };

  // Save Campaign
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
        cover_image: null,
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

  // Prompt Single Delete
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

  // Export CSV
  const handleExportCSV = () => {
    if (filteredDonations.length === 0) {
      showToast('error', 'No donation records match the selected filters');
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
    link.setAttribute('download', `Mahall_Donations_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportDropdownOpen(false);

    showToast('success', 'Donations CSV exported');
  };

  // Compact Dot Status Badge Renderer
  const renderStatusDotBadge = (st: string = 'received') => {
    switch (st) {
      case 'received':
        return <span className="status-badge-dot success"><span className="dot"></span> Received</span>;
      case 'pending':
        return <span className="status-badge-dot warning"><span className="dot"></span> Pending</span>;
      case 'cancelled':
        return <span className="status-badge-dot danger"><span className="dot"></span> Cancelled</span>;
      case 'refunded':
        return <span className="status-badge-dot secondary"><span className="dot"></span> Refunded</span>;
      default:
        return <span className="status-badge-dot success"><span className="dot"></span> Received</span>;
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDonationType('');
    setSelectedCampaignId('');
    setSelectedMethod('');
    setSelectedStatus('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="subscriptions-page animate-fade-in">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type} animate-bounce-in`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. PAGE HEADER (MATCHING SUBSCRIPTIONS VISUAL REFERENCE) */}
      <div className="page-header-actions">
        <div>
          <h3>Donations</h3>
          <p className="page-subtitle">Manage general donations, special donations, and community fundraising.</p>
        </div>

        <div className="header-cta-group">
          <YearFilter
            selectedYearId={selectedYearId}
            onChange={setSelectedYearId}
            years={years}
            showAllOption={true}
            showFee={false}
          />

          <div className="dropdown-wrapper" ref={exportDropdownRef}>
            <button
              className="add-btn secondary-btn"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            >
              <Download size={15} />
              <span>Export</span>
              <ChevronDown size={14} />
            </button>
            {isExportDropdownOpen && (
              <div className="dropdown-menu-card glass-card shadow-lg animate-scale-up">
                <button className="dropdown-item" onClick={handleExportCSV}>
                  <FileText size={14} />
                  <span>Export CSV</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setIsExportDropdownOpen(false);
                    window.print();
                  }}
                >
                  <Printer size={14} />
                  <span>Print Report</span>
                </button>
              </div>
            )}
          </div>

          <button className="add-btn secondary-btn" onClick={() => openAddCampaignModal()}>
            <Layers size={15} />
            <span>+ Campaign</span>
          </button>

          <button className="add-btn primary-btn" onClick={openAddDonationDrawer}>
            <Plus size={16} />
            <span>Add Donation</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS (4 COMPACT STATS CARDS MATCHING SUBSCRIPTIONS) */}
      <div className="stats-dashboard-grid margin-bottom">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-metric-card shadow-sm">
                <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
                <div className="metric-info margin-left-xs">
                  <div className="skeleton-pulse" style={{ width: '90px', height: '12px' }}></div>
                  <div className="skeleton-pulse margin-top-xs" style={{ width: '110px', height: '22px' }}></div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box emerald">
                <DollarSign size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Collected</span>
                <h3 className="metric-value text-success">{formatCurrency(metrics.totalDonations)}</h3>
                <span className="metric-sub">Across all donations</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box green">
                <Calendar size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">This Year</span>
                <h3 className="metric-value">{formatCurrency(metrics.thisYearDonations)}</h3>
                <span className="metric-sub">{metrics.selectedYearNumber}</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box primary">
                <Layers size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Campaign Donations</span>
                <h3 className="metric-value text-primary">{formatCurrency(metrics.campaignFunds)}</h3>
                <span className="metric-sub">Special funds</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box teal">
                <CheckCircle size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Active Campaigns</span>
                <h3 className="metric-value">{metrics.activeCampaignsCount}</h3>
                <span className="metric-sub">Currently active</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. UNIFIED WORKSPACE MAIN CONTAINER CARD */}
      <div className="workspace-unified-card animate-fade-in">
        {/* WORKSPACE CARD HEADER TABS */}
        <div className="workspace-card-header-tabs">
          <button
            className={`workspace-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <DollarSign size={16} />
            <span>All Donations</span>
          </button>

          <button
            className={`workspace-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <User size={16} />
            <span>General Donations</span>
          </button>

          <button
            className={`workspace-tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setActiveTab('campaigns')}
          >
            <Layers size={16} />
            <span>Campaign Donations ({campaigns.length})</span>
          </button>
        </div>

        {/* TAB VIEWS A & B: DONATIONS LIST (ALL & GENERAL) */}
        {(activeTab === 'all' || activeTab === 'general') && (
          <>
            {/* SEARCH & FILTER TOOLBAR */}
            <div className="workspace-filter-toolbar">
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search donations by donor, receipt, or campaign..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Desktop Filter Selectors */}
              <div className="filter-selectors-grid">
                <div className="filter-select-wrapper">
                  <Filter size={15} className="select-icon" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                  >
                    <option value="">Status: All</option>
                    <option value="received">Received</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                <div className="filter-select-wrapper">
                  <Layers size={15} className="select-icon" />
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                  >
                    <option value="">Campaign: All</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.campaign_name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-select-wrapper">
                  <DollarSign size={15} className="select-icon" />
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                  >
                    <option value="">Method: All</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / Online</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {(searchQuery || selectedStatus || selectedCampaignId || selectedMethod || selectedDonationType || fromDate || toDate) && (
                  <button className="clear-filters-link" onClick={clearFilters}>
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Mobile Filter Button */}
              <div className="mobile-filter-trigger">
                <button className="pill-btn-secondary" onClick={() => setIsMobileFilterOpen(true)}>
                  <Filter size={15} />
                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* Bulk Selection Bar */}
            {selectedIds.length > 0 && (
              <div className="bulk-selection-bar flex-between p-xs bg-primary-light border-rounded margin-sm">
                <span className="font-weight-600 font-sm">{selectedIds.length} selected</span>
                <button className="pill-btn-danger font-xs" onClick={() => setIsBulkDeleteModalOpen(true)}>
                  <Trash2 size={13} /> Delete Selected
                </button>
              </div>
            )}

            {/* WORKSPACE TABLE CONTENT AREA */}
            <div className="workspace-table-content">
              {fetchError ? (
                <div className="empty-state-card">
                  <div className="empty-state-icon neutral">
                    <AlertCircle size={32} className="text-danger" />
                  </div>
                  <h4>Unable to load donations</h4>
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
              ) : filteredDonations.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-state-icon emerald">
                    <HeartHandshake size={28} />
                  </div>
                  <h4>No donations found</h4>
                  <p>
                    {searchQuery || selectedStatus || selectedCampaignId || selectedMethod
                      ? 'No donations match your current filters. Try clearing filters.'
                      : 'Start recording donations to keep track of Mahall contributions.'}
                  </p>
                  {searchQuery || selectedStatus || selectedCampaignId || selectedMethod ? (
                    <button className="clear-filters-link margin-top-xs" onClick={clearFilters}>
                      Clear Filters
                    </button>
                  ) : (
                    <button className="add-btn primary-btn margin-top-sm" onClick={openAddDonationDrawer}>
                      <Plus size={16} />
                      <span>Add Donation</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* DESKTOP TABLE */}
                  <div className="table-responsive desktop-view-only">
                    <table className="subscriptions-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.length === filteredDonations.length && filteredDonations.length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th style={{ textAlign: 'left' }}>Donor</th>
                          <th style={{ textAlign: 'left' }}>Type / Campaign</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                          <th style={{ textAlign: 'left' }}>Payment Method</th>
                          <th style={{ textAlign: 'left' }}>Date</th>
                          <th style={{ textAlign: 'left' }}>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDonations.map((d) => {
                          const campObj = campaigns.find((c) => c.id === d.campaign_id);
                          const isSelected = selectedIds.includes(d.id);
                          const donorNameLabel = d.is_anonymous ? 'Anonymous Donor' : (d.donor_name || 'Wellwisher');
                          const donorTypeLabel = d.is_anonymous ? 'Anonymous' : (d.donor_member_id ? 'Member' : 'External Donor');

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
                                  <div className={`donor-avatar-circle ${getAvatarBgClass(d.is_anonymous, d.donor_member_id)}`}>
                                    {getAvatarInitials(d.donor_name, d.is_anonymous)}
                                  </div>
                                  <div>
                                    <div className="font-weight-600">{donorNameLabel}</div>
                                    <span className="font-xs color-subtle">{donorTypeLabel}</span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                {d.donation_type === 'campaign' ? (
                                  <div>
                                    <div className="font-weight-600 text-dark">Campaign Donation</div>
                                    <span className="font-xs text-muted">{campObj ? campObj.campaign_name : 'Campaign Fund'}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-weight-600 text-dark">General Donation</div>
                                    <span className="font-xs text-muted">{d.purpose || 'General Mahall Activities'}</span>
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="font-semibold text-dark">
                                  {formatCurrency(d.amount)}
                                </span>
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                <span className="method-pill font-xs">{d.payment_method.toUpperCase()}</span>
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                <span className="font-xs font-weight-600">{d.donation_date}</span>
                              </td>
                              <td style={{ textAlign: 'left' }}>{renderStatusDotBadge(d.status)}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="action-row-buttons flex-end gap-xs">
                                  <button
                                    className="icon-btn-ghost"
                                    title="View Receipt"
                                    onClick={() => {
                                      setSelectedDonation(d);
                                      setIsReceiptModalOpen(true);
                                    }}
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    className="icon-btn-ghost"
                                    title="Edit Record"
                                    onClick={() => openEditDonationDrawer(d)}
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    className="icon-btn-ghost danger"
                                    title="Delete"
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

                  {/* MOBILE CARDS VIEW (<768px - 320px, 360px, 375px, 390px, 412px, Samsung G8) */}
                  <div className="mobile-ledger-cards-list mobile-view-only padding-md">
                    {filteredDonations.map((d) => {
                      const campObj = campaigns.find((c) => c.id === d.campaign_id);
                      const isSelected = selectedIds.includes(d.id);
                      const donorNameLabel = d.is_anonymous ? 'Anonymous Donor' : (d.donor_name || 'Wellwisher');
                      const donorTypeLabel = d.is_anonymous ? 'Anonymous' : (d.donor_member_id ? 'Member' : 'External Donor');

                      return (
                        <div key={d.id} className={`mobile-ledger-card ${isSelected ? 'selected' : ''}`}>
                          <div className="mobile-card-top flex-between">
                            <div className="flex-row-gap-xs">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectIndividual(d.id)}
                              />
                              <div className={`donor-avatar-circle sm ${getAvatarBgClass(d.is_anonymous, d.donor_member_id)}`}>
                                {getAvatarInitials(d.donor_name, d.is_anonymous)}
                              </div>
                              <div>
                                <div className="font-weight-600 font-sm">{donorNameLabel}</div>
                                <span className="font-xs color-subtle">{donorTypeLabel}</span>
                              </div>
                            </div>
                            {renderStatusDotBadge(d.status)}
                          </div>

                          <div className="mobile-card-middle flex-between margin-top-sm pt-xs border-top-light">
                            <div>
                              <div className="font-xs font-weight-600 text-dark">
                                {d.donation_type === 'campaign' ? (campObj ? campObj.campaign_name : 'Campaign') : (d.purpose || 'General Donation')}
                              </div>
                              <div className="font-xs color-subtle">{d.donation_date} • {d.payment_method.toUpperCase()}</div>
                            </div>
                            <span className="font-semibold text-dark font-md">{formatCurrency(d.amount)}</span>
                          </div>

                          <div className="mobile-card-actions flex-end gap-xs margin-top-xs pt-xs border-top-light">
                            <button
                              className="pill-btn-ghost font-xs"
                              onClick={() => {
                                setSelectedDonation(d);
                                setIsReceiptModalOpen(true);
                              }}
                            >
                              <Eye size={13} /> Receipt
                            </button>
                            <button className="pill-btn-ghost font-xs" onClick={() => openEditDonationDrawer(d)}>
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

        {/* TAB VIEW C: CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <div className="workspace-table-content animate-fade-in">
            {campaigns.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-icon emerald">
                  <Layers size={28} />
                </div>
                <h4>No donation campaigns yet</h4>
                <p>Create a campaign to start collecting special programme donations.</p>
                <button className="add-btn primary-btn margin-top-sm" onClick={openAddCampaignModal}>
                  <Plus size={16} />
                  <span>Create Campaign</span>
                </button>
              </div>
            ) : (
              <div className="padding-md">
                <div className="flex-between margin-bottom">
                  <div>
                    <h3 className="font-weight-700">Special Donation Campaigns</h3>
                    <p className="page-subtitle">Track targeted programme fundraising drives and target collections.</p>
                  </div>
                  <button className="add-btn primary-btn" onClick={openAddCampaignModal}>
                    <Plus size={16} />
                    <span>Create Campaign</span>
                  </button>
                </div>

                <div className="campaigns-cards-grid">
                {campaigns.map((camp) => {
                  const { collected, donationCount, progress, remaining } = getCampaignMetrics(camp.id, camp.target_amount);

                  return (
                    <div key={camp.id} className="campaign-overview-card glass-card">
                      <div className="campaign-header flex-between">
                        <span className="badge badge-info">{camp.campaign_type}</span>
                        <span className={`badge badge-${camp.status === 'active' ? 'success' : camp.status === 'completed' ? 'primary' : 'secondary'}`}>
                          {camp.status.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="campaign-title font-weight-700 margin-top-xs">{camp.campaign_name}</h3>
                      {camp.description && <p className="campaign-desc font-xs color-subtle">{camp.description}</p>}

                      <div className="campaign-collected-box margin-top-sm">
                        <div className="font-semibold text-success font-lg">{formatCurrency(collected)} collected</div>
                        <div className="font-xs text-muted">
                          Goal: {camp.target_amount > 0 ? formatCurrency(camp.target_amount) : 'Open Goal'}
                        </div>
                      </div>

                      {camp.target_amount > 0 && (
                        <div className="progress-section margin-top-xs">
                          <div className="progress-track-bg">
                            <div className="progress-fill-bar" style={{ width: `${progress}%` }}></div>
                          </div>
                          <div className="flex-between font-xs margin-top-xs color-subtle">
                            <span>{progress}% Achieved</span>
                            <span>Remaining: {formatCurrency(remaining)}</span>
                          </div>
                        </div>
                      )}

                      <div className="campaign-footer flex-between margin-top-md pt-sm border-top">
                        <span className="font-xs font-weight-600 color-subtle">
                          <HeartHandshake size={13} className="inline-block align-middle" /> {donationCount} Donations
                        </span>

                        <div className="flex-row-gap-xs">
                          <button
                            className="pill-btn-ghost font-xs"
                            onClick={() => {
                              setSelectedCampaignId(camp.id);
                              setActiveTab('all');
                            }}
                          >
                            View Donations
                          </button>
                          <button className="icon-btn-ghost" title="Edit" onClick={() => openEditCampaignModal(camp)}>
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="icon-btn-ghost danger"
                            title="Delete"
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT DONATION DRAWER */}
      {isDonationDrawerOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card ledger-drawer-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>{donationModalMode === 'add' ? 'Add Donation' : 'Edit Donation Record'}</h4>
                <p className="modal-subtitle">Record community contribution or campaign fund entry.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDonationDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-scrollable">
              <form onSubmit={handleSaveDonation} className="form-grid gap-sm">
                {/* Donation Type Visual Cards */}
                <div className="form-group">
                  <label className="form-label font-weight-600">Donation Type *</label>
                  <div className="selection-cards-grid col-2">
                    <div
                      className={`selection-card ${donationType === 'general' ? 'selected' : ''}`}
                      onClick={() => setDonationType('general')}
                    >
                      <div className="font-weight-600">General Donation</div>
                      <span className="font-xs text-muted">General Mahall use</span>
                    </div>
                    <div
                      className={`selection-card ${donationType === 'campaign' ? 'selected' : ''}`}
                      onClick={() => setDonationType('campaign')}
                    >
                      <div className="font-weight-600">Campaign Donation</div>
                      <span className="font-xs text-muted">Support a campaign</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Campaign Selector */}
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
                        <option key={c.id} value={c.id}>{c.campaign_name}</option>
                      ))}
                    </select>
                    {formSubmitted && donationType === 'campaign' && !campaignId && (
                      <span className="form-field-error">Please select a campaign.</span>
                    )}
                  </div>
                )}

                {/* Donor Type Visual Cards */}
                <div className="form-group">
                  <label className="form-label font-weight-600">Donor Type *</label>
                  <div className="selection-cards-grid col-3">
                    <div
                      className={`selection-card ${donorType === 'member' ? 'selected' : ''}`}
                      onClick={() => setDonorType('member')}
                    >
                      <User size={18} className="margin-bottom-xs" style={{ margin: '0 auto' }} />
                      <div className="font-weight-600 font-xs">Mahall Member</div>
                      <span className="font-xs text-muted">Registered member</span>
                    </div>
                    <div
                      className={`selection-card ${donorType === 'external' ? 'selected' : ''}`}
                      onClick={() => setDonorType('external')}
                    >
                      <Users size={18} className="margin-bottom-xs" style={{ margin: '0 auto' }} />
                      <div className="font-weight-600 font-xs">External Donor</div>
                      <span className="font-xs text-muted">Other donor</span>
                    </div>
                    <div
                      className={`selection-card ${donorType === 'anonymous' ? 'selected' : ''}`}
                      onClick={() => setDonorType('anonymous')}
                    >
                      <HelpCircle size={18} className="margin-bottom-xs" style={{ margin: '0 auto' }} />
                      <div className="font-weight-600 font-xs">Anonymous</div>
                      <span className="font-xs text-muted">Hidden donor</span>
                    </div>
                  </div>
                </div>

                {/* Member Selection Search */}
                {donorType === 'member' && (
                  <div className="form-group">
                    <label className="form-label font-weight-600">Select Member *</label>
                    <input
                      type="text"
                      className="form-control margin-bottom-xs"
                      placeholder="Search member name or house..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                    />
                    <div className="member-dropdown-list">
                      {searchedMembers.map((m) => {
                        const h = households.find((house) => house.id === m.household_id);
                        const isChosen = donorMemberId === m.id;
                        return (
                          <div
                            key={m.id}
                            className={`member-option-item flex-between ${isChosen ? 'selected' : ''}`}
                            onClick={() => handleSelectMemberInDrawer(m)}
                          >
                            <div>
                              <div className="font-weight-600 font-xs">{m.name}</div>
                              <span className="font-xs text-muted">
                                ID: {m.id.substring(0, 8)} | House: H-{h ? h.house_number : 'N/A'}
                              </span>
                            </div>
                            {isChosen && <Check size={14} className="text-success" />}
                          </div>
                        );
                      })}
                    </div>
                    {formSubmitted && donorType === 'member' && !donorMemberId && (
                      <span className="form-field-error">Please select a registered member.</span>
                    )}
                  </div>
                )}

                {/* External Donor Inputs */}
                {donorType === 'external' && (
                  <>
                    <div className="form-group">
                      <label className="form-label font-weight-600">Donor Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Abdul Rahman"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        required
                      />
                      {formSubmitted && donorType === 'external' && !donorName.trim() && (
                        <span className="form-field-error">Donor name is required.</span>
                      )}
                    </div>
                    <div className="form-row-2col">
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="+91 9876543210"
                          value={donorPhone}
                          onChange={(e) => setDonorPhone(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="donor@gmail.com"
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Amount & Date */}
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label font-weight-600">Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control font-semibold"
                      placeholder="₹5000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                    {formSubmitted && (!amount || Number(amount) <= 0) && (
                      <span className="form-field-error">Amount must be greater than ₹0.</span>
                    )}
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
                      <option value="received">Received</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                {/* Reference Number & Notes */}
                <div className="form-group">
                  <label className="form-label">Reference Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. UPI Ref / Receipt No"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="modal-footer flex-end gap-xs pt-sm border-top margin-top-sm">
                  <button type="button" className="pill-btn-ghost" onClick={() => setIsDonationDrawerOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="add-btn primary-btn" disabled={isSaving}>
                    {isSaving ? <Loader2 size={16} className="spinner-icon" /> : (donationModalMode === 'add' ? 'Save Donation' : 'Update Record')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET FILTER */}
      {isMobileFilterOpen && (
        <div className="bottom-sheet-backdrop" onClick={() => setIsMobileFilterOpen(false)}>
          <div
            className="bottom-sheet-content glass-card animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-header flex-between border-bottom pb-xs margin-bottom-sm">
              <h3 className="font-weight-600 font-md">Filter Donations</h3>
              <button className="icon-btn-ghost" onClick={() => setIsMobileFilterOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="sheet-body form-grid gap-sm">
              <div className="form-group">
                <label className="form-label font-xs">Year</label>
                <YearFilter
                  selectedYearId={selectedYearId}
                  onChange={setSelectedYearId}
                  years={years}
                  showAllOption={true}
                  allOptionLabel="All Years"
                />
              </div>

              <div className="form-group">
                <label className="form-label font-xs">Campaign</label>
                <select
                  className="form-control"
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.campaign_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label font-xs">Status</label>
                <select
                  className="form-control"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                >
                  <option value="">All Statuses</option>
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label font-xs">Payment Method</label>
                <select
                  className="form-control"
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                >
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / Online</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="sheet-footer flex-between margin-top-sm pt-xs border-top">
                <button className="clear-filters-link font-xs" onClick={clearFilters}>
                  Reset
                </button>
                <button className="add-btn primary-btn font-xs" onClick={() => setIsMobileFilterOpen(false)}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CAMPAIGN */}
      {isCampaignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card max-w-md animate-scale-up">
            <div className="modal-header flex-between">
              <h4 className="font-weight-700">
                {campaignModalMode === 'add' ? '+ Create Campaign' : 'Edit Campaign'}
              </h4>
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
                  <label className="form-label">Type</label>
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
                    <option value="Zakat Fund">Zakat Fund</option>
                    <option value="Other">Other</option>
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
                  placeholder="Leave 0 for open goal"
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
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Explain purpose..."
                  value={campaignDesc}
                  onChange={(e) => setCampaignDesc(e.target.value)}
                />
              </div>

              <div className="modal-footer flex-end gap-xs margin-top-sm">
                <button type="button" className="pill-btn-ghost" onClick={() => setIsCampaignModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="add-btn primary-btn" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spinner-icon" /> : (campaignModalMode === 'add' ? 'Create' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE DONATION RECEIPT */}
      {isReceiptModalOpen && selectedDonation && (
        <div className="modal-overlay">
          <div className="modal-dialog-card max-w-md animate-scale-up">
            <div className="modal-header flex-between no-print">
              <h4 className="font-weight-700 flex-row-gap-xs">
                <Printer size={18} /> Contribution Receipt
              </h4>
              <button className="modal-close-btn" onClick={() => setIsReceiptModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="printable-receipt-card padding-md" id="printable-receipt">
              <div className="receipt-header text-center border-bottom pb-sm">
                <h2 className="mahall-receipt-name font-weight-700">Vellikkeel Mahall Management</h2>
                <p className="mahall-receipt-sub font-xs text-muted">Official Contribution Receipt</p>
                <div className="receipt-no-badge margin-top-xs font-mono font-xs">
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
              <button className="add-btn primary-btn" onClick={() => window.print()}>
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR SINGLE DELETE */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="modal-overlay">
          <div className="modal-dialog-card max-w-xs text-center animate-scale-up">
            <AlertCircle size={36} className="text-danger margin-bottom-xs" style={{ margin: '0 auto' }} />
            <h4 className="font-md font-weight-600">Delete {itemToDelete.type === 'donation' ? 'Donation' : 'Campaign'}?</h4>
            <p className="font-xs text-muted margin-top-xs">
              Are you sure you want to delete <strong>{itemToDelete.name}</strong>?
            </p>

            <div className="modal-footer flex-center gap-xs margin-top-md">
              <button className="pill-btn-ghost" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="pill-btn-danger" onClick={handleConfirmSingleDelete} disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="spinner-icon" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR BULK DELETE */}
      {isBulkDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card max-w-xs text-center animate-scale-up">
            <AlertCircle size={36} className="text-danger margin-bottom-xs" style={{ margin: '0 auto' }} />
            <h4 className="font-md font-weight-600">Delete {selectedIds.length} Donations?</h4>
            <p className="font-xs text-muted margin-top-xs">
              Are you sure you want to delete <strong>{selectedIds.length}</strong> selected donation records?
            </p>

            <div className="modal-footer flex-center gap-xs margin-top-md">
              <button className="pill-btn-ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="pill-btn-danger" onClick={handleConfirmBulkDelete} disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="spinner-icon" /> : `Delete (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMBEDDED DEDICATED STYLES FOR PARITY WITH SUBSCRIPTIONS PAGE */}
      <style>{`
        .donations-page {
          display: flex; flex-direction: column; gap: 20px; width: 100%; box-sizing: border-box;
        }

        .toast-notification {
          position: fixed; top: 24px; right: 24px; z-index: 999;
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px; border-radius: var(--radius-pill, 9999px);
          font-weight: 700; font-size: 13.5px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        .toast-notification.success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .toast-notification.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .page-header-actions {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; width: 100%; box-sizing: border-box;
        }
        .page-header-actions h3 { font-size: 22px; font-weight: 800; color: #111827; }
        .page-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

        .header-cta-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .add-btn.primary-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 20px; border-radius: var(--radius-pill, 9999px); background: #00966b;
          color: #ffffff; font-weight: 700; font-size: 13.5px; border: none; cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35); transition: all 0.2s ease;
        }
        .add-btn.secondary-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 18px; border-radius: var(--radius-pill, 9999px); background: #ffffff;
          color: #374151; font-weight: 700; font-size: 13.5px; border: 1px solid var(--border-color, #e5e7eb); cursor: pointer;
        }

        .subscription-nav-tabs {
          display: flex; gap: 8px; background: #ffffff; padding: 6px;
          border-radius: var(--radius-pill, 9999px); border: 1px solid var(--border-color, #e5e7eb);
          width: fit-content; flex-wrap: wrap;
        }
        .tab-pill-btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 18px;
          border-radius: var(--radius-pill, 9999px); border: none; background: transparent;
          color: #4b5563; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s ease;
        }
        .tab-pill-btn.active {
          background: #ecfdf5; color: #00966b; box-shadow: 0 2px 8px rgba(0, 150, 107, 0.15);
        }

        .stats-dashboard-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;
        }
        .stat-metric-card {
          background: #ffffff; border: 1px solid var(--border-color, #e5e7eb); border-radius: var(--radius-xl, 16px);
          padding: 20px; display: flex; align-items: center; gap: 16px;
        }
        .metric-icon-box {
          width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .metric-icon-box.emerald { background: #ecfdf5; color: #00966b; }
        .metric-icon-box.green { background: #d1fae5; color: #059669; }
        .metric-icon-box.amber { background: #fef3c7; color: #d97706; }
        .metric-icon-box.primary { background: #e0e7ff; color: #4338ca; }
        .metric-icon-box.teal { background: #ccfbf1; color: #0d9488; }
        .metric-icon-box.red { background: #fee2e2; color: #dc2626; }

        .metric-info { display: flex; flex-direction: column; gap: 2px; }
        .metric-label { font-size: 11.5px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-value { font-size: 22px; font-weight: 800; color: #111827; }
        .metric-sub { font-size: 11px; color: #9ca3af; }

        .filter-bar {
          display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 14px;
          background: #ffffff; border: 1px solid var(--border-color, #e5e7eb); border-radius: var(--radius-xl, 16px); flex-wrap: wrap; margin-bottom: 16px;
        }
        .search-box { position: relative; display: flex; align-items: center; flex: 1; min-width: 260px; }
        .search-icon { position: absolute; left: 14px; color: #9ca3af; }
        .search-box input {
          width: 100%; padding: 11px 36px 11px 42px; border: 1px solid var(--border-color, #e5e7eb);
          border-radius: var(--radius-pill, 9999px); background: #f9fafb; color: #111827; font-size: 13.5px;
        }
        .clear-search-btn { position: absolute; right: 12px; background: #e5e7eb; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .filter-selectors-grid { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .filter-select-wrapper { position: relative; display: flex; align-items: center; }
        .select-icon { position: absolute; left: 14px; color: #9ca3af; pointer-events: none; }
        .filter-select-wrapper select {
          padding: 10px 32px 10px 36px; border: 1px solid var(--border-color, #e5e7eb); border-radius: var(--radius-pill, 9999px);
          background: #f9fafb; color: #374151; appearance: none; cursor: pointer; font-weight: 600; font-size: 13px;
        }
        .clear-filters-link { background: transparent; border: none; color: #00966b; font-weight: 700; font-size: 13px; cursor: pointer; padding: 6px 12px; }

        .table-container-card { background: #ffffff; border: 1px solid var(--border-color, #e5e7eb); border-radius: var(--radius-xl, 16px); padding: 20px; width: 100%; box-sizing: border-box; }
        .desktop-view-only { display: block; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .subscriptions-table { width: 100%; border-collapse: collapse; text-align: left; }
        .subscriptions-table th { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .subscriptions-table td { padding: 14px 16px; font-size: 13.5px; border-bottom: 1px solid #f3f4f6; color: #111827; }

        .donor-info-cell { display: flex; align-items: center; gap: 10px; }
        .donor-avatar-circle { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; }
        .donor-avatar-circle.sm { width: 30px; height: 30px; font-size: 11px; }
        .avatar-member { background: #e6f4ea; color: #137333; }
        .avatar-external { background: #e8f0fe; color: #1a73e8; }
        .avatar-anon { background: #f3e8ff; color: #7e22ce; }

        .status-badge-dot { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
        .status-badge-dot .dot { width: 7px; height: 7px; border-radius: 50%; }
        .status-badge-dot.success { color: #15803d; } .status-badge-dot.success .dot { background: #22c55e; }
        .status-badge-dot.warning { color: #b45309; } .status-badge-dot.warning .dot { background: #f59e0b; }
        .status-badge-dot.danger { color: #b91c1c; } .status-badge-dot.danger .dot { background: #ef4444; }
        .status-badge-dot.secondary { color: #4b5563; } .status-badge-dot.secondary .dot { background: #9ca3af; }

        .method-pill { display: inline-block; padding: 2px 8px; border-radius: 12px; background: #f3f4f6; color: #4b5563; font-weight: 700; }

        .mobile-ledger-cards-list { display: none; flex-direction: column; gap: 14px; width: 100%; box-sizing: border-box; }
        .mobile-ledger-card { background: #ffffff; border: 1px solid var(--border-color, #e5e7eb); border-radius: var(--radius-lg, 12px); padding: 16px; display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.55); backdrop-filter: blur(4px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
        .modal-dialog-card { width: 100%; max-width: 560px; background: #ffffff; border-radius: var(--radius-xl, 16px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); overflow: hidden; border: 1px solid var(--border-color, #e5e7eb); box-sizing: border-box; }
        .modal-header { padding: 18px 20px; display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
        .modal-header h4 { font-size: 17px; font-weight: 800; color: #111827; }
        .modal-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .modal-close-btn { background: transparent; border: none; color: #9ca3af; cursor: pointer; }

        /* FORM CONTROLS & MODAL STYLING FIXES */
        .form-group {
          display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box;
        }
        .form-label, .form-group label {
          font-size: 12.5px; font-weight: 700; color: #374151; display: block;
        }
        .form-control, .form-group input, .form-group select, .form-group textarea,
        .modal-body input, .modal-body select, .modal-body textarea,
        .drawer-body input, .drawer-body select, .drawer-body textarea {
          width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px;
          background: #ffffff; color: #111827; font-size: 13.5px; box-sizing: border-box;
          transition: all 0.2s ease; font-family: inherit;
        }
        .form-control:focus, .form-group input:focus, .form-group select:focus, .form-group textarea:focus,
        .modal-body input:focus, .modal-body select:focus, .modal-body textarea:focus,
        .drawer-body input:focus, .drawer-body select:focus, .drawer-body textarea:focus {
          outline: none; border-color: #00966b; box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12); background: #ffffff;
        }
        .form-row-2col {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; width: 100%; box-sizing: border-box;
        }
        .modal-body, .modal-body-scrollable, .drawer-body, .modal-form {
          padding: 20px; max-height: 75vh; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box;
        }
        .modal-footer, .drawer-footer {
          padding: 16px 20px; display: flex; align-items: center; justify-content: flex-end; gap: 10px;
          border-top: 1px solid #e5e7eb; background: #f9fafb; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;
        }
        .pill-btn-ghost, .btn-cancel {
          padding: 9px 18px; border-radius: 9999px; background: #ffffff; border: 1px solid #d1d5db;
          color: #374151; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        }
        .pill-btn-ghost:hover, .btn-cancel:hover { background: #f3f4f6; color: #111827; }
        .pill-btn-primary, .submit-pill-btn {
          padding: 10px 22px; border-radius: 9999px; background: #00966b; color: #ffffff;
          font-size: 13.5px; font-weight: 700; border: none; cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35); transition: all 0.2s ease;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        }
        .pill-btn-primary:hover, .submit-pill-btn:hover { background: #007d59; }

        .selection-cards-grid { display: grid; gap: 10px; width: 100%; }
        .selection-cards-grid.col-2 { grid-template-columns: repeat(2, 1fr); }
        .selection-cards-grid.col-3 { grid-template-columns: repeat(3, 1fr); }
        .selection-card {
          padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 10px; background: #ffffff;
          cursor: pointer; text-align: center; transition: all 0.2s ease;
        }
        .selection-card:hover { border-color: #00966b; background: #f0fdf4; }
        .selection-card.selected { border-color: #00966b; background: #e6f4ea; box-shadow: 0 0 0 2px rgba(0, 150, 107, 0.2); }

        /* UNIFIED WORKSPACE MAIN CONTAINER & TABS ALIGNMENT */
        .workspace-unified-card {
          background: #ffffff;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: var(--radius-xl, 16px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          overflow: hidden;
          width: 100%;
          box-sizing: border-box;
        }

        .workspace-card-header-tabs {
          padding: 16px 20px 0 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .workspace-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 9999px;
          border: none;
          background: transparent;
          color: #6b7280;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 12px;
        }

        .workspace-tab-btn:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .workspace-tab-btn.active {
          background: #ecfdf5;
          color: #00966b;
          box-shadow: 0 2px 8px rgba(0, 150, 107, 0.15);
        }

        .workspace-filter-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          gap: 14px;
          background: #ffffff;
          border-bottom: 1px solid #f3f4f6;
          flex-wrap: wrap;
        }

        .workspace-table-content {
          padding: 0;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 991px) {
          .stats-dashboard-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .page-header-actions { flex-direction: column; align-items: stretch; gap: 12px; }
          .header-cta-group { flex-direction: column; align-items: stretch; }
          .filter-selectors-grid { grid-template-columns: 1fr; width: 100%; }
          .form-row-2col { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .desktop-view-only { display: none; }
          .mobile-ledger-cards-list { display: flex; }
          .stats-dashboard-grid { grid-template-columns: 1fr; }
          .selection-cards-grid.col-2, .selection-cards-grid.col-3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Donations;
