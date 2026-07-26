import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../../services/db';
import type { DonationCampaign, Member } from '../../services/db';
import { 
  HeartHandshake, User, DollarSign, 
  CheckCircle, AlertCircle, ArrowLeft, Save, Loader2, Target 
} from 'lucide-react';
import { FormCard } from '../../components/FormCard';

export const DonationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Data States
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

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
      const [allCampaigns, allMembers] = await Promise.all([
        db.donationCampaigns.get(),
        db.members.get()
      ]);
      setCampaigns(allCampaigns);
      setMembers(allMembers);

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

      <div className="canvas-header-bar">
        <div>
          <div className="flex-row-gap-xs font-xs color-subtle margin-bottom-xs">
            <Link to="/admin/dashboard" className="color-subtle hover-primary">Dashboard</Link>
            <span>/</span>
            <Link to="/admin/donations" className="color-subtle hover-primary">Donations</Link>
            <span>/</span>
            <span className="text-dark font-weight-600">{isEditMode ? 'Edit Donation' : 'Record Donation'}</span>
          </div>
          <h2 className="font-weight-800 text-dark">
            {isEditMode ? `Edit Donation Record` : 'Record Community Contribution'}
          </h2>
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

            <FormCard
              title="Donor Attribution & Contact"
              subtitle="Identify whether the donor is a registered member or external contributor."
              icon={User}
            >
              <div className="form-group margin-bottom-md">
                <label className="form-label">Donor Category</label>
                <div className="flex-row-gap-sm">
                  {['member', 'external', 'anonymous'].map((type) => (
                    <button key={type} type="button" className={`pill-btn-ghost ${donorType === type ? 'active' : ''}`} onClick={() => setDonorType(type as any)}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {donorType === 'member' && (
                <div className="form-group">
                  <label className="form-label">Select Registered Member *</label>
                  <select className={`form-control ${fieldErrors.donorMemberId ? 'is-invalid' : ''}`} value={donorMemberId} onChange={(e) => setDonorMemberId(e.target.value)}>
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.phone || 'No phone'})</option>)}
                  </select>
                  {fieldErrors.donorMemberId && <span className="field-error-text">{fieldErrors.donorMemberId}</span>}
                </div>
              )}

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
            </FormCard>
          </div>

          <div className="form-side-column">
            <FormCard
              title="Fund Category & Campaign"
              subtitle="Assign to general fund or active fundraising campaign."
              icon={HeartHandshake}
            >
              <div className="form-group">
                <label className="form-label">Fund Category</label>
                <select className="form-control" value={donationType} onChange={(e) => setDonationType(e.target.value as any)}>
                  <option value="general">General Community Fund</option>
                  <option value="campaign">Special Campaign</option>
                </select>
              </div>
              {donationType === 'campaign' && (
                <div className="form-group margin-top-sm">
                  <label className="form-label">Select Campaign *</label>
                  <select className={`form-control ${fieldErrors.campaignId ? 'is-invalid' : ''}`} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                    <option value="">-- Choose Active Campaign --</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.campaign_name}</option>)}
                  </select>
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
    </div>
  );
};

export default DonationForm;
