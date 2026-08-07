import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { DonationCampaign, Member, Household } from '../../services/db';
import { 
  HeartHandshake, User, DollarSign, 
  CheckCircle, AlertCircle, ArrowLeft, Save, Loader2, Target,
  Plus, Megaphone, Home, X
} from 'lucide-react';
import { FormCard } from '../../components/FormCard';
import { Modal } from '../../components/Modal';

export const DonationForm: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Data States
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Quick-Create Campaign Modal State
  const [isQuickCampaignModalOpen, setIsQuickCampaignModalOpen] = useState(false);
  const [isSavingQuickCampaign, setIsSavingQuickCampaign] = useState(false);
  const [quickCampaignForm, setQuickCampaignForm] = useState({
    campaign_name: '',
    campaign_type: 'special_fund',
    description: '',
    target_amount: '',
    start_date: '',
    end_date: '',
    status: 'active' as DonationCampaign['status'],
  });

  // Form Fields
  const [donationType, setDonationType] = useState<'general' | 'campaign'>('general');
  const [campaignId, setCampaignId] = useState('');
  const [donorType, setDonorType] = useState<'member' | 'household' | 'external' | 'anonymous'>('member');
  const [donorMemberId, setDonorMemberId] = useState('');
  const [donorHouseholdId, setDonorHouseholdId] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'>('upi');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [allCampaigns, allMembers, allHouseholds] = await Promise.all([
        db.donationCampaigns.get(),
        db.members.get(),
        db.households.get(),
      ]);
      setCampaigns(allCampaigns);
      setMembers(allMembers);
      setHouseholds(allHouseholds);

      if (isEditMode && id) {
        const allDonations = await db.donations.get();
        const current = allDonations.find((d) => d.id === id);
        if (current) {
          // Detect campaign matching by ID, purpose, or notes
          let resolvedCampaignId = current.campaign_id || '';
          if (!resolvedCampaignId && (current.purpose || current.notes)) {
            const searchStr = `${current.purpose || ''} ${current.notes || ''}`.toLowerCase();
            const matchedCamp = allCampaigns.find((c) => c.campaign_name && searchStr.includes(c.campaign_name.toLowerCase()));
            if (matchedCamp) resolvedCampaignId = matchedCamp.id;
          }

          const isCampaign = Boolean(current.donation_type === 'campaign' || resolvedCampaignId || current.purpose);
          setDonationType(isCampaign ? 'campaign' : 'general');
          setCampaignId(resolvedCampaignId);

          // Detect household donor type matching from notes or donor_type
          let resolvedDonorType: 'member' | 'household' | 'external' | 'anonymous' = (current.donor_type as any) || 'member';
          let resolvedHouseholdId = '';

          if (current.notes && current.notes.includes('Household:')) {
            resolvedDonorType = 'household';
            const houseMatch = current.notes.match(/Household:\s*([^\s—•]+)/i);
            if (houseMatch && houseMatch[1]) {
              const houseNo = houseMatch[1].trim();
              const foundHouse = allHouseholds.find((h) => h.house_number === houseNo);
              if (foundHouse) resolvedHouseholdId = foundHouse.id;
            }
          }

          setDonorType(resolvedDonorType);
          setDonorHouseholdId(resolvedHouseholdId);
          setDonorMemberId(current.donor_member_id || '');
          setDonorName(current.donor_name || '');
          setDonorPhone(current.donor_phone || '');
          setDonorEmail(current.donor_email || '');
          setAmount(current.amount || '');
          setPaymentMethod(current.payment_method || 'upi');
          setDonationDate(current.donation_date || new Date().toISOString().split('T')[0]);
          setReceiptNumber(current.receipt_number || '');
          setReferenceNumber(current.reference_number || '');
          setNotes(current.notes || '');
        } else {
          showToast('error', 'Donation record not found');
          setTimeout(() => navigate('/admin/donations'), 1500);
        }
      }
    } catch (err) {
      console.error('Error loading donation details:', err);
      showToast('error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  // Quick-create a new campaign inline
  const handleQuickCreateCampaign = async () => {
    if (!quickCampaignForm.campaign_name.trim()) {
      showToast('error', 'Campaign name is required');
      return;
    }
    setIsSavingQuickCampaign(true);
    try {
      const created = await db.donationCampaigns.create({
        campaign_name: quickCampaignForm.campaign_name.trim(),
        campaign_type: quickCampaignForm.campaign_type,
        description: quickCampaignForm.description.trim() || null,
        target_amount: parseFloat(quickCampaignForm.target_amount) || 0,
        start_date: quickCampaignForm.start_date || null,
        end_date: quickCampaignForm.end_date || null,
        cover_image: null,
        status: quickCampaignForm.status,
        created_by: null,
      });
      // Refresh campaigns list and auto-select the new one
      const updated = await db.donationCampaigns.get();
      setCampaigns(updated);
      setCampaignId(created.id);
      setDonationType('campaign');
      setIsQuickCampaignModalOpen(false);
      setQuickCampaignForm({ campaign_name: '', campaign_type: 'special_fund', description: '', target_amount: '', start_date: '', end_date: '', status: 'active' });
      showToast('success', `Campaign "${created.campaign_name}" created and selected`);
    } catch (err) {
      showToast('error', 'Failed to create campaign');
    } finally {
      setIsSavingQuickCampaign(false);
    }
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (donationType === 'campaign' && !campaignId) {
      errors.campaignId = 'Please select a campaign for this donation';
    }
    if (donorType === 'external' && !donorName.trim()) {
      errors.donorName = 'Donor name is required for external well-wishers';
    }
    if (donorType === 'member' && !donorName.trim() && !donorMemberId) {
      errors.donorMemberId = 'Please select a registered member';
    }
    if (donorType === 'household' && !donorHouseholdId) {
      errors.donorHouseholdId = 'Please select a household';
    }
    if (!amount || Number(amount) <= 0) {
      errors.amount = 'Please enter a valid donation amount';
    }
    if (!donationDate) {
      errors.donationDate = 'Donation date is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const selectedMem = members.find((m) => m.id === donorMemberId);
      const selectedHouse = households.find((h) => h.id === donorHouseholdId);

      const resolvedDonorName = 
        donorType === 'anonymous' 
          ? 'Anonymous Donor' 
          : donorType === 'member' 
            ? (selectedMem?.name || donorName.trim() || 'Community Member')
            : donorType === 'household'
              ? (selectedHouse?.house_owner_name || `House No. ${selectedHouse?.house_number}` || donorName.trim() || 'Household Donor')
              : (donorName.trim() || 'External Donor');

      const resolvedDonorPhone =
        donorType === 'anonymous' ? null
          : donorType === 'member' ? (donorPhone.trim() || selectedMem?.phone || null)
          : donorType === 'household' ? (selectedHouse?.house_owner_phone || null)
          : (donorPhone.trim() || null);

      const selectedCampaign = campaigns.find((c) => c.id === campaignId);

      const payload = {
        donation_type: donationType,
        campaign_id: donationType === 'campaign' ? (campaignId || null) : null,
        purpose: donationType === 'campaign' ? (selectedCampaign?.campaign_name || null) : null,
        donor_type: donorType,
        donor_member_id: donorType === 'member' ? (donorMemberId || null) : null,
        donor_name: resolvedDonorName,
        donor_phone: resolvedDonorPhone,
        donor_email: donorType === 'anonymous' ? null : (donorEmail.trim() || selectedMem?.email || null),
        amount: Number(amount),
        payment_method: paymentMethod,
        donation_date: donationDate,
        receipt_number: receiptNumber.trim() || `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        reference_number: referenceNumber.trim() || null,
        notes: donorType === 'household' 
          ? `Household: ${selectedHouse?.house_number || ''}${selectedCampaign?.campaign_name ? ` • Campaign: ${selectedCampaign.campaign_name}` : ''} ${notes.trim() ? `— ${notes.trim()}` : ''}`.trim()
          : (selectedCampaign?.campaign_name && !notes.includes(selectedCampaign.campaign_name) ? `[Campaign: ${selectedCampaign.campaign_name}] ${notes.trim()}`.trim() : (notes.trim() || null)),
        recorded_by: user?.id || null,
        is_anonymous: donorType === 'anonymous'
      };

      if (isEditMode && id) {
        await db.donations.update(id, payload);
        showToast('success', 'Donation record updated successfully');
      } else {
        await db.donations.create(payload);
        showToast('success', 'Donation record saved to Supabase');
      }
      setTimeout(() => navigate('/admin/donations'), 1000);
    } catch (err) {
      console.error('Error saving donation record:', err);
      showToast('error', 'Failed to save donation record');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center py-2xl">
        <Loader2 className="spinner text-primary" size={36} />
        <span className="margin-left-sm font-weight-600 color-subtle">Loading Donation Form...</span>
      </div>
    );
  }

  const donorTypeOptions: { key: 'member' | 'household' | 'external' | 'anonymous'; label: string; icon: React.ReactNode }[] = [
    { key: 'member', label: 'Member', icon: <User size={13} /> },
    { key: 'household', label: 'Household', icon: <Home size={13} /> },
    { key: 'external', label: 'External', icon: <HeartHandshake size={13} /> },
    { key: 'anonymous', label: 'Anonymous', icon: <X size={13} /> },
  ];

  return (
    <div className="donation-form-page animate-fade-in padding-md">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`}>
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="canvas-header-bar">
        <div>
          <h2 className="font-weight-800 text-dark">
            {isEditMode ? 'Edit Donation' : 'Record Donation'}
          </h2>
          <p className="font-sm color-subtle margin-top-xs">
            Record general or campaign donations with complete donor attribution.
          </p>
        </div>

        <div className="flex-row-gap-xs">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/donations')}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <button 
            type="submit" 
            form="donation-form"
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving...' : isEditMode ? 'Update Donation' : 'Save Donation'}</span>
          </button>
        </div>
      </div>

      <form id="donation-form" onSubmit={handleSubmit}>
        <div className="form-grid-layout-2col">
          <div className="form-main-column">
            <FormCard
              title="Contribution Amount & Transaction"
              subtitle="Donation amount, payment date, and transaction method."
              icon={DollarSign}
            >
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">Donation Amount (₹) *</label>
                  <input
                    type="number"
                    className={`form-control font-weight-700 text-success ${fieldErrors.amount ? 'is-invalid' : ''}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 5000"
                  />
                  {fieldErrors.amount && <span className="field-error-text">{fieldErrors.amount}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Contribution Date *</label>
                  <input
                    type="date"
                    className={`form-control ${fieldErrors.donationDate ? 'is-invalid' : ''}`}
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="cash">Cash Collection</option>
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference / Txn ID #</label>
                  <input type="text" className="form-control" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="UPI Ref No" />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Remarks / Special Notes</label>
                  <textarea className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..." />
                </div>
              </div>
            </FormCard>

            {/* DONOR ATTRIBUTION */}
            <FormCard
              title="Donor Attribution & Contact"
              subtitle="Identify whether the donor is a registered member, household, or external contributor."
              icon={User}
            >
              {/* Donor Type Pill Tabs */}
              <div className="form-group margin-bottom-md">
                <label className="form-label">Donor Category</label>
                <div className="donor-type-tabs">
                  {donorTypeOptions.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      type="button"
                      className={`donor-type-tab ${donorType === key ? 'active' : ''}`}
                      onClick={() => {
                        setDonorType(key);
                        setDonorMemberId('');
                        setDonorHouseholdId('');
                        setDonorName('');
                        setDonorPhone('');
                        setDonorEmail('');
                      }}
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Member selector */}
              {donorType === 'member' && (
                <div className="form-group">
                  <label className="form-label">Select Registered Member *</label>
                  <select 
                    className={`form-control ${fieldErrors.donorMemberId ? 'is-invalid' : ''}`} 
                    value={donorMemberId} 
                    onChange={(e) => {
                      const memId = e.target.value;
                      setDonorMemberId(memId);
                      const m = members.find((item) => item.id === memId);
                      if (m) {
                        setDonorName(m.name);
                        setDonorPhone(m.phone || '');
                        setDonorEmail(m.email || '');
                      }
                    }}
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.phone || 'No phone'})</option>)}
                  </select>
                  {fieldErrors.donorMemberId && <span className="field-error-text">{fieldErrors.donorMemberId}</span>}
                </div>
              )}

              {/* Household selector */}
              {donorType === 'household' && (
                <div className="form-group">
                  <label className="form-label">Select Household *</label>
                  <select
                    className={`form-control ${fieldErrors.donorHouseholdId ? 'is-invalid' : ''}`}
                    value={donorHouseholdId}
                    onChange={(e) => {
                      const hId = e.target.value;
                      setDonorHouseholdId(hId);
                      const h = households.find((item) => item.id === hId);
                      if (h) {
                        setDonorName(h.house_owner_name);
                        setDonorPhone(h.house_owner_phone || '');
                      }
                    }}
                  >
                    <option value="">-- Choose Household --</option>
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>
                        House No. {h.house_number} — {h.house_owner_name}
                        {h.house_owner_phone ? ` (${h.house_owner_phone})` : ''}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.donorHouseholdId && <span className="field-error-text">{fieldErrors.donorHouseholdId}</span>}
                  {donorHouseholdId && (() => {
                    const h = households.find(x => x.id === donorHouseholdId);
                    return h ? (
                      <div className="household-selected-preview">
                        <Home size={14} className="text-emerald" />
                        <div>
                          <div className="font-weight-700 text-dark">House No. {h.house_number}</div>
                          <div className="font-xs color-subtle">{h.house_owner_name} • {h.house_owner_phone || 'No phone'}</div>
                          {h.address && <div className="font-xs color-subtle">{h.address}</div>}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* External donor fields */}
              {donorType === 'external' && (
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label">Donor Full Name *</label>
                    <input type="text" className={`form-control ${fieldErrors.donorName ? 'is-invalid' : ''}`} value={donorName} onChange={(e) => setDonorName(e.target.value)} />
                    {fieldErrors.donorName && <span className="field-error-text">{fieldErrors.donorName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-control" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Anonymous message */}
              {donorType === 'anonymous' && (
                <div className="anonymous-notice">
                  <CheckCircle size={15} className="text-success" />
                  <span>This donation will be recorded anonymously. No personal details will be stored.</span>
                </div>
              )}
            </FormCard>
          </div>

          <div className="form-side-column">
            {/* FUND CATEGORY WITH QUICK-CREATE CAMPAIGN */}
            <FormCard
              title="Fund Category & Campaign"
              subtitle="Assign to general fund or active fundraising campaign."
              icon={HeartHandshake}
            >
              <div className="form-group">
                <label className="form-label">Fund Category</label>
                <select
                  className="form-control"
                  value={donationType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setDonationType(newType);
                    if (newType === 'campaign' && !campaignId && campaigns.length > 0) {
                      setCampaignId(campaigns[0].id);
                    }
                  }}
                >
                  <option value="general">General Community Fund</option>
                  <option value="campaign">Special Campaign</option>
                </select>
              </div>
              {donationType === 'campaign' && (
                <div className="form-group margin-top-sm">
                  <div className="campaign-select-label-row">
                    <label className="form-label" style={{ marginBottom: 0 }}>Select Campaign *</label>
                    <button
                      type="button"
                      className="quick-add-campaign-btn"
                      onClick={() => setIsQuickCampaignModalOpen(true)}
                      title="Create new campaign"
                    >
                      <Plus size={13} />
                      <span>New Campaign</span>
                    </button>
                  </div>
                  <select
                    className={`form-control margin-top-xs ${fieldErrors.campaignId ? 'is-invalid' : ''}`}
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                  >
                    <option value="">-- Choose Active Campaign --</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.campaign_name} {c.status !== 'active' ? `(${c.status})` : ''}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.campaignId && <span className="field-error-text">{fieldErrors.campaignId}</span>}
                  {/* Selected campaign info */}
                  {campaignId && (() => {
                    const c = campaigns.find(x => x.id === campaignId);
                    return c ? (
                      <div className="campaign-selected-preview">
                        <Target size={14} className="text-purple" />
                        <div>
                          <div className="font-weight-700 text-dark">{c.campaign_name}</div>
                          <div className="font-xs color-subtle">
                            Goal: ₹{c.target_amount.toLocaleString('en-IN')}
                            {c.end_date ? ` • Ends ${c.end_date}` : ''}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </FormCard>

            <FormCard
              title="Receipt Identification"
              subtitle="Generated receipt number."
              icon={Target}
            >
              <div className="form-group">
                <label className="form-label">Receipt Number</label>
                <input type="text" className="form-control font-weight-700" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
              </div>
            </FormCard>
          </div>
        </div>
      </form>

      {/* QUICK CREATE CAMPAIGN MODAL */}
      <Modal
        isOpen={isQuickCampaignModalOpen}
        onClose={() => setIsQuickCampaignModalOpen(false)}
        title="Create New Campaign"
        subtitle="Set up a new fundraising campaign and it will be auto-selected."
        icon={<Megaphone size={20} className="text-purple" />}
        size="md"
        footer={
          <div className="flex-between width-100">
            <button className="pill-btn-ghost" onClick={() => setIsQuickCampaignModalOpen(false)}>Cancel</button>
            <button
              className="add-btn primary-btn"
              onClick={handleQuickCreateCampaign}
              disabled={isSavingQuickCampaign}
            >
              {isSavingQuickCampaign ? 'Creating...' : 'Create & Select Campaign'}
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Campaign Name <span className="text-danger">*</span></label>
          <input
            className="form-control"
            placeholder="e.g. Masjid Construction Fund"
            value={quickCampaignForm.campaign_name}
            onChange={(e) => setQuickCampaignForm((f) => ({ ...f, campaign_name: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="form-grid-2col margin-top-sm">
          <div className="form-group">
            <label className="form-label">Campaign Type</label>
            <select
              className="form-control"
              value={quickCampaignForm.campaign_type}
              onChange={(e) => setQuickCampaignForm((f) => ({ ...f, campaign_type: e.target.value }))}
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
            <label className="form-label">Target Amount (₹)</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 500000"
              value={quickCampaignForm.target_amount}
              onChange={(e) => setQuickCampaignForm((f) => ({ ...f, target_amount: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-group margin-top-sm">
          <label className="form-label">Description <span className="font-xs color-subtle">(optional)</span></label>
          <textarea
            className="form-control"
            rows={2}
            placeholder="Purpose of this campaign..."
            value={quickCampaignForm.description}
            onChange={(e) => setQuickCampaignForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="form-grid-2col margin-top-sm">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input type="date" className="form-control" value={quickCampaignForm.start_date} onChange={(e) => setQuickCampaignForm((f) => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input type="date" className="form-control" value={quickCampaignForm.end_date} onChange={(e) => setQuickCampaignForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* INLINE STYLES */}
      <style>{`
        .donor-type-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .donor-type-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 600;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .donor-type-tab:hover { border-color: #00966b; color: #00966b; background: #f0fdf4; }
        .donor-type-tab.active { border-color: #00966b; background: #00966b; color: #ffffff; }

        .campaign-select-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .quick-add-campaign-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 700;
          background: linear-gradient(135deg, #f3e8ff, #ede9fe);
          border: 1.5px solid #c4b5fd;
          color: #7c3aed;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .quick-add-campaign-btn:hover { background: #7c3aed; color: #ffffff; border-color: #7c3aed; }

        .campaign-selected-preview {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 10px;
          padding: 10px 12px;
          background: linear-gradient(135deg, #faf5ff, #f3e8ff);
          border: 1px solid #e9d5ff;
          border-radius: 10px;
        }
        .household-selected-preview {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 10px;
          padding: 10px 12px;
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1px solid #bbf7d0;
          border-radius: 10px;
        }
        .anonymous-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          background: #f0fdf4;
          border: 1px solid #a7f3d0;
          border-radius: 10px;
          font-size: 13px;
          color: #064e3b;
          font-weight: 500;
        }
        .text-purple { color: #7c3aed; }
        .margin-top-xs { margin-top: 6px; }
      `}</style>
    </div>
  );
};

export default DonationForm;
