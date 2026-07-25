import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../../services/db';
import type { DonationCampaign, Member, Household } from '../../services/db';
import { 
  HeartHandshake, User, Users, DollarSign, 
  CheckCircle, AlertCircle, ArrowLeft, Save, Loader2, Target, HelpCircle, Search
} from 'lucide-react';

export const DonationForm: React.FC = () => {
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

  // Search State for Member Picker
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Form Fields
  const [donationType, setDonationType] = useState<'general' | 'campaign'>('general');
  const [campaignId, setCampaignId] = useState('');
  const [donorType, setDonorType] = useState<'member' | 'external' | 'anonymous'>('member');
  const [donorMemberId, setDonorMemberId] = useState('');
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
        db.households.get()
      ]);
      setCampaigns(allCampaigns);
      setMembers(allMembers);
      setHouseholds(allHouseholds);

      if (isEditMode && id) {
        const allDonations = await db.donations.get();
        const current = allDonations.find((d) => d.id === id);
        if (current) {
          setDonationType(current.donation_type || 'general');
          setCampaignId(current.campaign_id || '');
          setDonorType(current.donor_type || 'member');
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

  const searchableMembers = members.filter((m) => {
    const query = memberSearchQuery.toLowerCase();
    return m.name.toLowerCase().includes(query) || (m.phone && m.phone.includes(query)) || m.id.includes(query);
  });

  const handleSelectMember = (m: Member) => {
    setDonorMemberId(m.id);
    setDonorName(m.name);
    setDonorPhone(m.phone || '');
    setDonorEmail(m.email || '');
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
      const payload = {
        donation_type: donationType,
        campaign_id: donationType === 'campaign' ? campaignId : null,
        donor_type: donorType,
        donor_member_id: donorType === 'member' ? donorMemberId : null,
        donor_name: donorType === 'anonymous' ? 'Anonymous Donor' : donorName.trim(),
        donor_phone: donorType === 'anonymous' ? null : (donorPhone.trim() || null),
        donor_email: donorType === 'anonymous' ? null : (donorEmail.trim() || null),
        amount: Number(amount),
        payment_method: paymentMethod,
        donation_date: donationDate,
        receipt_number: receiptNumber.trim() || null,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        recorded_by: null,
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

  return (
    <div className="donation-form-page animate-fade-in padding-md">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`}>
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER BAR & BREADCRUMBS */}
      <div className="flex-between margin-bottom-lg flex-wrap gap-md">
        <div>
          <div className="flex-row-gap-xs font-xs color-subtle margin-bottom-xs">
            <Link to="/admin/dashboard" className="color-subtle hover-primary">Dashboard</Link>
            <span>/</span>
            <Link to="/admin/donations" className="color-subtle hover-primary">Donations</Link>
            <span>/</span>
            <span className="text-dark font-weight-600">{isEditMode ? 'Edit Donation' : 'Record New Donation'}</span>
          </div>
          <h2 className="font-weight-800 text-dark flex-row-gap-xs">
            <HeartHandshake className="text-success" size={26} />
            <span>{isEditMode ? `Edit Donation Record` : 'Record Community Contribution'}</span>
          </h2>
          <p className="font-sm color-subtle">
            Record general or campaign donations with complete donor attribution, receipt generation, and transaction tracking.
          </p>
        </div>

        <div className="flex-row-gap-xs">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/donations')}
          >
            <ArrowLeft size={16} />
            <span>Back to Donations</span>
          </button>
          <button 
            type="submit" 
            form="donation-form"
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving Record...' : isEditMode ? 'Update Donation' : 'Save Donation'}</span>
          </button>
        </div>
      </div>

      <form id="donation-form" onSubmit={handleSubmit} className="flex-col gap-lg max-width-1100 margin-auto">
        {/* SECTION 1: CATEGORY & CAMPAIGN */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <HeartHandshake size={18} className="text-success" />
            <span className="form-section-title">Donation Category & Fund Assignment</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group full-width">
              <label className="form-label">Select Fund Category *</label>
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
                      <div className="font-weight-700 font-sm text-dark">General Community Fund</div>
                      <span className="font-xs color-subtle">Unrestricted general community maintenance fund</span>
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
                      <div className="font-weight-700 font-sm text-dark">Special Campaign Donation</div>
                      <span className="font-xs color-subtle">Dedicated project collection (Building, Charity, festival, etc.)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {donationType === 'campaign' && (
              <div className="form-group full-width">
                <label className="form-label">Assign to Active Campaign *</label>
                <select
                  className={`form-control ${fieldErrors.campaignId ? 'is-invalid' : ''}`}
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                >
                  <option value="">-- Choose Dedicated Campaign --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.campaign_name}</option>
                  ))}
                </select>
                {fieldErrors.campaignId && <span className="field-error-text">{fieldErrors.campaignId}</span>}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: DONOR ATTRIBUTION */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <User size={18} className="text-primary" />
            <span className="form-section-title">Donor Attribution & Information</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group full-width">
              <label className="form-label">Donor Type *</label>
              <div className="flex-row-gap-sm flex-wrap">
                <button
                  type="button"
                  className={`pill-btn-ghost ${donorType === 'member' ? 'bg-primary text-white' : ''}`}
                  onClick={() => setDonorType('member')}
                >
                  <User size={15} /> Mahall Member
                </button>
                <button
                  type="button"
                  className={`pill-btn-ghost ${donorType === 'external' ? 'bg-primary text-white' : ''}`}
                  onClick={() => setDonorType('external')}
                >
                  <Users size={15} /> External Well-Wisher
                </button>
                <button
                  type="button"
                  className={`pill-btn-ghost ${donorType === 'anonymous' ? 'bg-primary text-white' : ''}`}
                  onClick={() => {
                    setDonorType('anonymous');
                    setDonorName('Anonymous Donor');
                  }}
                >
                  <HelpCircle size={15} /> Anonymous
                </button>
              </div>
            </div>

            {donorType === 'member' && (
              <div className="form-group full-width">
                <label className="form-label">Search & Select Registered Member *</label>
                <div className="search-box margin-bottom-xs">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search member by name, phone, house..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                  />
                </div>

                <div className="member-search-cards-list max-height-240">
                  {searchableMembers.slice(0, 8).map((m) => {
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
                              House #{house ? house.house_number : 'N/A'} • Phone: {m.phone || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <button type="button" className={`pill-btn-ghost font-xs ${isSel ? 'bg-success text-white' : ''}`}>
                          {isSel ? 'Selected ✓' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {fieldErrors.donorMemberId && <span className="field-error-text">{fieldErrors.donorMemberId}</span>}
              </div>
            )}

            {donorType !== 'anonymous' && (
              <>
                <div className="form-group">
                  <label className="form-label">Donor Name *</label>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors.donorName ? 'is-invalid' : ''}`}
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Full Name"
                  />
                  {fieldErrors.donorName && <span className="field-error-text">{fieldErrors.donorName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Donor Contact Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    placeholder="+91 Mobile number"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION 3: AMOUNT & PAYMENT METHOD */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <DollarSign size={18} className="text-success" />
            <span className="form-section-title">Contribution Amount & Payment Transaction</span>
          </div>

          <div className="form-grid-2col padding-md">
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
              {fieldErrors.donationDate && <span className="field-error-text">{fieldErrors.donationDate}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cash">Cash Collection</option>
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Receipt Number</label>
              <input
                type="text"
                className="form-control font-weight-600"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reference / Txn ID #</label>
              <input
                type="text"
                className="form-control"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="UPI Ref No / Cheque No"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Remarks / Special Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions or donor intention..."
              />
            </div>
          </div>
        </div>

        {/* FORM FOOTER CTAS */}
        <div className="flex-between margin-top-md pt-md border-top">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/donations')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving Record...' : isEditMode ? 'Update Donation' : 'Save Donation'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default DonationForm;
