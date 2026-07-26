import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../../services/db';
import type { Member } from '../../services/db';
import { 
  Home, Phone, MapPin, Building2, CheckCircle, AlertCircle, 
  ArrowLeft, Save, Loader2, Users, ShieldCheck 
} from 'lucide-react';
import { FormCard } from '../../components/FormCard';

export const HouseholdForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Data States
  const [loading, setLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Form Fields
  const [houseNumber, setHouseNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Linked members if editing
  const [linkedMembers, setLinkedMembers] = useState<Member[]>([]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (isEditMode && id) {
      loadHousehold(id);
    }
  }, [id]);

  const loadHousehold = async (householdId: string) => {
    setLoading(true);
    try {
      const allHouseholds = await db.households.get();
      const current = allHouseholds.find((h) => h.id === householdId);
      if (current) {
        setHouseNumber(current.house_number || '');
        setOwnerName(current.house_owner_name || '');
        setOwnerPhone(current.house_owner_phone || '');
        setAddress(current.address || '');
        setArea(current.area || '');
        setStatus(current.status || 'active');

        // Fetch linked members
        const allMembers = await db.members.get();
        const family = allMembers.filter((m) => m.household_id === householdId);
        setLinkedMembers(family);
      } else {
        showToast('error', 'Household record not found');
        setTimeout(() => navigate('/admin/households'), 1500);
      }
    } catch (err) {
      console.error('Error loading household details:', err);
      showToast('error', 'Failed to load household data');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!houseNumber.trim()) errors.houseNumber = 'House Number or ID is required';
    if (!ownerName.trim()) errors.ownerName = 'House owner or family head name is required';
    if (ownerPhone.trim() && !/^\+?[0-9\s-]{8,15}$/.test(ownerPhone.trim())) {
      errors.ownerPhone = 'Please enter a valid mobile number';
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
        house_number: houseNumber.trim(),
        house_owner_name: ownerName.trim(),
        house_owner_phone: ownerPhone.trim() || null,
        address: address.trim() || null,
        area: area.trim() || null,
        status
      };

      if (isEditMode && id) {
        await db.households.update(id, payload);
        showToast('success', 'Household details updated successfully');
      } else {
        await db.households.create(payload);
        showToast('success', 'New Household created successfully');
      }
      setTimeout(() => navigate('/admin/households'), 1000);
    } catch (err) {
      console.error('Error saving household:', err);
      showToast('error', 'Failed to save household details');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center py-2xl">
        <Loader2 className="spinner text-primary" size={36} />
        <span className="margin-left-sm font-weight-600 color-subtle">Loading Household Details...</span>
      </div>
    );
  }

  return (
    <div className="household-form-page animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`}>
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER BAR & BREADCRUMBS */}
      <div className="canvas-header-bar">
        <div>
          <div className="flex-row-gap-xs font-xs color-subtle margin-bottom-xs">
            <Link to="/admin/dashboard" className="color-subtle hover-primary">Dashboard</Link>
            <span>/</span>
            <Link to="/admin/households" className="color-subtle hover-primary">Households</Link>
            <span>/</span>
            <span className="text-dark font-weight-600">{isEditMode ? 'Edit Household' : 'Add Household'}</span>
          </div>
          <h2 className="font-weight-800 text-dark">
            {isEditMode ? `Edit Household #${houseNumber}` : 'Register New Household'}
          </h2>
          <p className="font-sm color-subtle margin-top-xs">
            {isEditMode 
              ? 'Update family head details, address, ward area, and review linked family members.'
              : 'Enter household identification, family head name, phone, address, and ward assignment.'}
          </p>
        </div>

        <div className="flex-row-gap-xs">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/households')}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <button 
            type="submit" 
            form="household-form"
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving...' : isEditMode ? 'Update Household' : 'Create Household'}</span>
          </button>
        </div>
      </div>

      <form id="household-form" onSubmit={handleSubmit}>
        <div className="form-grid-layout-2col">
          {/* MAIN COLUMN (LEFT - 8 COLS) */}
          <div className="form-main-column">
            {/* CARD 1: HOUSEHOLD IDENTIFICATION */}
            <FormCard
              title="Household Identification & Head Info"
              subtitle="Unique house code and primary owner / family head contact."
              icon={Home}
            >
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">House Number / ID *</label>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors.houseNumber ? 'is-invalid' : ''}`}
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="e.g. H-104 / 45-B"
                  />
                  {fieldErrors.houseNumber && <span className="field-error-text">{fieldErrors.houseNumber}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Head of Family / Owner Name *</label>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors.ownerName ? 'is-invalid' : ''}`}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Full name of family head"
                  />
                  {fieldErrors.ownerName && <span className="field-error-text">{fieldErrors.ownerName}</span>}
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Primary Contact Phone</label>
                  <div className="input-with-icon">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.ownerPhone ? 'is-invalid' : ''}`}
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="+91 Mobile number"
                    />
                  </div>
                  {fieldErrors.ownerPhone && <span className="field-error-text">{fieldErrors.ownerPhone}</span>}
                </div>
              </div>
            </FormCard>

            {/* CARD 2: LOCATION & ADDRESS */}
            <FormCard
              title="Location & Ward Address"
              subtitle="Physical door address and assigned Mahallu ward area."
              icon={MapPin}
            >
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">Ward / Sub-Area Name</label>
                  <div className="input-with-icon">
                    <Building2 size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-control"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Ward 3 / North Street"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Complete Street Address</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Door number, landmark, locality..."
                  />
                </div>
              </div>
            </FormCard>

            {/* CARD 3: LINKED FAMILY MEMBERS (WHEN EDITING) */}
            {isEditMode && (
              <FormCard
                title={`Registered Family Members (${linkedMembers.length})`}
                subtitle="Members linked to this household ledger."
                icon={Users}
              >
                {linkedMembers.length === 0 ? (
                  <div className="empty-state-card py-md text-center">
                    <p className="font-sm color-subtle">No individual members currently linked to this household.</p>
                  </div>
                ) : (
                  <div className="member-search-cards-list">
                    {linkedMembers.map((m) => (
                      <div key={m.id} className="member-select-card margin-bottom-xs">
                        <div className="flex-row-gap-sm">
                          <div className="donor-avatar-circle sm avatar-member">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-weight-700 font-sm text-dark">{m.name}</div>
                            <span className="font-xs color-subtle">
                              Relation: {m.relationship} • Phone: {m.phone || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <Link 
                          to={`/admin/members/${m.id}/edit`} 
                          className="pill-btn-ghost font-xs hover-primary"
                        >
                          Edit Profile
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </FormCard>
            )}
          </div>

          {/* SIDE COLUMN (RIGHT - 4 COLS) */}
          <div className="form-side-column">
            {/* CARD 4: HOUSEHOLD STATUS */}
            <FormCard
              title="Household Status"
              subtitle="Active or relocated status."
              icon={ShieldCheck}
            >
              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="active">Active Household</option>
                  <option value="inactive">Inactive / Relocated</option>
                </select>
              </div>
            </FormCard>
          </div>
        </div>
      </form>
    </div>
  );
};

export default HouseholdForm;
