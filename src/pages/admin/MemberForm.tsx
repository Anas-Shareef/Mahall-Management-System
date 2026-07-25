import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../../services/db';
import type { Household } from '../../services/db';
import { 
  User, Phone, Mail, CheckCircle, AlertCircle, 
  ArrowLeft, Save, Loader2 
} from 'lucide-react';

export const MemberForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Data States
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Form Fields
  const [householdId, setHouseholdId] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Head of Family');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isSubscriptionAccountable, setIsSubscriptionAccountable] = useState(true);

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
      const allHouseholds = await db.households.get();
      setHouseholds(allHouseholds);

      if (isEditMode && id) {
        const allMembers = await db.members.get();
        const current = allMembers.find((m) => m.id === id);
        if (current) {
          setHouseholdId(current.household_id || '');
          setName(current.name || '');
          setRelationship(current.relationship || 'Head of Family');
          setPhone(current.phone || '');
          setEmail(current.email || '');
          setStatus(current.status || 'active');
          setIsSubscriptionAccountable(current.is_subscription_accountable ?? true);
        } else {
          showToast('error', 'Member record not found');
          setTimeout(() => navigate('/admin/members'), 1500);
        }
      }
    } catch (err) {
      console.error('Error fetching member details:', err);
      showToast('error', 'Failed to load member data');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!name.trim()) errors.name = 'Member full name is required';
    if (!householdId) errors.householdId = 'Please select a household';
    if (phone.trim() && !/^\+?[0-9\s-]{8,15}$/.test(phone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
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
        user_id: null,
        household_id: householdId,
        name: name.trim(),
        relationship: relationship.trim() || 'Head of Family',
        phone: phone.trim() || null,
        email: email.trim() || null,
        status,
        is_subscription_accountable: isSubscriptionAccountable
      };

      if (isEditMode && id) {
        await db.members.update(id, payload);
        showToast('success', 'Member profile updated successfully');
      } else {
        await db.members.create(payload);
        showToast('success', 'New Member registered successfully');
      }
      setTimeout(() => navigate('/admin/members'), 1000);
    } catch (err) {
      console.error('Error saving member:', err);
      showToast('error', 'Failed to save member. Check database permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center py-2xl">
        <Loader2 className="spinner text-primary" size={36} />
        <span className="margin-left-sm font-weight-600 color-subtle">Loading Member Profile...</span>
      </div>
    );
  }

  return (
    <div className="member-form-page animate-fade-in padding-md">
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
            <Link to="/admin/members" className="color-subtle hover-primary">Members</Link>
            <span>/</span>
            <span className="text-dark font-weight-600">{isEditMode ? 'Edit Member' : 'Register New Member'}</span>
          </div>
          <h2 className="font-weight-800 text-dark flex-row-gap-xs">
            <User className="text-primary" size={26} />
            <span>{isEditMode ? `Edit Member: ${name}` : 'Register New Member'}</span>
          </h2>
          <p className="font-sm color-subtle">
            {isEditMode 
              ? 'Update member personal details, household relationship, and subscription fee status.'
              : 'Link new individual member to a household, configure contact info and membership status.'}
          </p>
        </div>

        <div className="flex-row-gap-xs">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/members')}
          >
            <ArrowLeft size={16} />
            <span>Back to Members</span>
          </button>
          <button 
            type="submit" 
            form="member-form"
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving Profile...' : isEditMode ? 'Update Profile' : 'Register Member'}</span>
          </button>
        </div>
      </div>

      <form id="member-form" onSubmit={handleSubmit} className="flex-col gap-lg max-width-1100 margin-auto">
        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <User size={18} className="text-primary" />
            <span className="form-section-title">Personal Information & Household Assignment</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name as per official records"
              />
              {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Household *</label>
              <select
                className={`form-control ${fieldErrors.householdId ? 'is-invalid' : ''}`}
                value={householdId}
                onChange={(e) => setHouseholdId(e.target.value)}
              >
                <option value="">-- Choose Household --</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    House #{h.house_number} ({h.house_owner_name})
                  </option>
                ))}
              </select>
              {fieldErrors.householdId && <span className="field-error-text">{fieldErrors.householdId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Family Relationship</label>
              <select
                className="form-control"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="Head of Family">Head of Family</option>
                <option value="Spouse">Spouse</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Other Relative">Other Relative</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Membership Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="active">Active Member</option>
                <option value="inactive">Inactive / Deceased / Transferred</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: CONTACT & SUBSCRIPTION SETTINGS */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <Phone size={18} className="text-primary" />
            <span className="form-section-title">Contact Information & Subscription Accountability</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div className="input-with-icon">
                <Phone size={16} className="input-icon" />
                <input
                  type="text"
                  className={`form-control ${fieldErrors.phone ? 'is-invalid' : ''}`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 Mobile Number"
                />
              </div>
              {fieldErrors.phone && <span className="field-error-text">{fieldErrors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
            </div>

            <div className="form-group full-width">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isSubscriptionAccountable}
                  onChange={(e) => setIsSubscriptionAccountable(e.target.checked)}
                />
                <span>Accountable for Annual Subscription Ledger Fee</span>
              </label>
              <span className="form-help-text margin-top-xs">
                When checked, annual subscription fee ledgers will be automatically calculated for this member.
              </span>
            </div>
          </div>
        </div>

        {/* FORM FOOTER CTAS */}
        <div className="flex-between margin-top-md pt-md border-top">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/members')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving Profile...' : isEditMode ? 'Update Profile' : 'Register Member'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default MemberForm;
