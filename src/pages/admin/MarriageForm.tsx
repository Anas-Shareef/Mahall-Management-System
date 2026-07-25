import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { db } from '../../services/db';
import type { Member, Household } from '../../services/db';
import { 
  Heart, User, Calendar, CheckCircle, AlertCircle, 
  ArrowLeft, Save, Loader2, Search
} from 'lucide-react';

export const MarriageForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // Data States
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Search Query for Groom & Bride
  const [groomSearchQuery, setGroomSearchQuery] = useState('');
  const [brideSearchQuery, setBrideSearchQuery] = useState('');

  // Form Fields
  const [groomName, setGroomName] = useState('');
  const [groomMemberId, setGroomMemberId] = useState('');
  const [groomFatherName, setGroomFatherName] = useState('');
  const [groomAddress, setGroomAddress] = useState('');

  const [brideName, setBrideName] = useState('');
  const [brideMemberId, setBrideMemberId] = useState('');
  const [brideFatherName, setBrideFatherName] = useState('');
  const [brideAddress, setBrideAddress] = useState('');

  const [marriageDate, setMarriageDate] = useState(new Date().toISOString().split('T')[0]);
  const [marriagePlace, setMarriagePlace] = useState('Central Mahall Mosque Auditorium');
  const [nikahBy, setNikahBy] = useState('');
  const [witness1Name, setWitness1Name] = useState('');
  const [witness2Name, setWitness2Name] = useState('');
  const [mahallRegistrationNumber, setMahallRegistrationNumber] = useState(`M-REG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [certificateNumber, setCertificateNumber] = useState(`MC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [status, setStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');
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
      const [allMembers, allHouseholds] = await Promise.all([
        db.members.get(),
        db.households.get()
      ]);
      setMembers(allMembers);
      setHouseholds(allHouseholds);

      if (isEditMode && id) {
        const allMarriages = await db.marriages.get();
        const current = allMarriages.find((m) => m.id === id);
        if (current) {
          setGroomName(current.groom_name || '');
          setGroomMemberId(current.groom_member_id || '');
          setGroomFatherName(current.groom_father_name || '');
          setGroomAddress(current.groom_address || '');

          setBrideName(current.bride_name || '');
          setBrideMemberId(current.bride_member_id || '');
          setBrideFatherName(current.bride_father_name || '');
          setBrideAddress(current.bride_address || '');

          setMarriageDate(current.nikah_date || new Date().toISOString().split('T')[0]);
          setMarriagePlace(current.nikah_venue || 'Central Mahall Mosque Auditorium');
          setNikahBy(current.conducted_by || '');
          setWitness1Name(current.witness1_name || '');
          setWitness2Name(current.witness2_name || '');
          setMahallRegistrationNumber(current.registration_number || '');
          setCertificateNumber(current.certificate_url || '');
          setStatus(current.status === 'completed' ? 'approved' : 'rejected');
          setNotes(current.notes || '');
        } else {
          showToast('error', 'Marriage record not found');
          setTimeout(() => navigate('/admin/marriages'), 1500);
        }
      }
    } catch (err) {
      console.error('Error loading marriage record:', err);
      showToast('error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const filteredGrooms = members.filter((m) => {
    const q = groomSearchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.phone && m.phone.includes(q));
  });

  const filteredBrides = members.filter((m) => {
    const q = brideSearchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.phone && m.phone.includes(q));
  });

  const handleSelectGroom = (m: Member) => {
    setGroomMemberId(m.id);
    setGroomName(m.name);
    const house = households.find((h) => h.id === m.household_id);
    if (house) {
      setGroomFatherName(house.house_owner_name);
      if (house.address) setGroomAddress(house.address);
    }
  };

  const handleSelectBride = (m: Member) => {
    setBrideMemberId(m.id);
    setBrideName(m.name);
    const house = households.find((h) => h.id === m.household_id);
    if (house) {
      setBrideFatherName(house.house_owner_name);
      if (house.address) setBrideAddress(house.address);
    }
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!groomName.trim()) errors.groomName = 'Groom name is required';
    if (!brideName.trim()) errors.brideName = 'Bride name is required';
    if (!marriageDate) errors.marriageDate = 'Marriage date is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        groom_name: groomName.trim(),
        groom_member_id: groomMemberId || null,
        groom_father_name: groomFatherName.trim() || null,
        groom_phone: null,
        groom_house_number: null,
        groom_ward: null,
        groom_address: groomAddress.trim() || null,

        bride_type: (brideMemberId ? 'member' : 'external') as any,
        bride_name: brideName.trim(),
        bride_member_id: brideMemberId || null,
        bride_father_name: brideFatherName.trim() || null,
        bride_phone: null,
        bride_address: brideAddress.trim() || null,
        bride_ward: null,

        nikah_date: marriageDate,
        nikah_time: null,
        nikah_venue: marriagePlace.trim() || null,
        registration_number: mahallRegistrationNumber.trim() || null,
        conducted_by: nikahBy.trim() || null,
        nikah_type: 'Mahall Nikah',

        wali_name: null,
        wali_relationship: null,
        wali_phone: null,

        witness1_name: witness1Name.trim() || null,
        witness1_phone: null,
        witness2_name: witness2Name.trim() || null,
        witness2_phone: null,

        mahr_type: 'Gold',
        mahr_description: null,
        mahr_payment_status: 'Paid Immediately',
        mahr_notes: null,

        status: (status === 'rejected' ? 'cancelled' : 'completed') as any,
        certificate_url: certificateNumber.trim() || null,
        notes: notes.trim() || null,
        created_by: null
      };

      if (isEditMode && id) {
        await db.marriages.update(id, payload);
        showToast('success', 'Marriage record updated successfully');
      } else {
        await db.marriages.create(payload);
        showToast('success', 'Marriage record registered to Supabase');
      }
      setTimeout(() => navigate('/admin/marriages'), 1000);
    } catch (err) {
      console.error('Error saving marriage record:', err);
      showToast('error', 'Failed to save marriage record');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center py-2xl">
        <Loader2 className="spinner text-primary" size={36} />
        <span className="margin-left-sm font-weight-600 color-subtle">Loading Marriage Registration Form...</span>
      </div>
    );
  }

  return (
    <div className="marriage-form-page animate-fade-in padding-md">
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
            <Link to="/admin/marriages" className="color-subtle hover-primary">Marriage Registry</Link>
            <span>/</span>
            <span className="text-dark font-weight-600">{isEditMode ? 'Edit Record' : 'Register New Marriage'}</span>
          </div>
          <h2 className="font-weight-800 text-dark flex-row-gap-xs">
            <Heart className="text-danger" size={26} />
            <span>{isEditMode ? `Edit Marriage Record` : 'Register Nikah & Marriage'}</span>
          </h2>
          <p className="font-sm color-subtle">
            Complete Nikah marriage registration with Groom & Bride member links, witnesses, Nikah khateeb details, and certificate numbers.
          </p>
        </div>

        <div className="flex-row-gap-xs">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/marriages')}
          >
            <ArrowLeft size={16} />
            <span>Back to Registry</span>
          </button>
          <button 
            type="submit" 
            form="marriage-form"
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving Record...' : isEditMode ? 'Update Record' : 'Register Marriage'}</span>
          </button>
        </div>
      </div>

      <form id="marriage-form" onSubmit={handleSubmit} className="flex-col gap-lg max-width-1100 margin-auto">
        {/* SECTION 1: GROOM DETAILS */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <User size={18} className="text-primary" />
            <span className="form-section-title">Groom Information & Member Link</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group full-width">
              <label className="form-label">Search & Select Groom from Member Database</label>
              <div className="search-box margin-bottom-xs">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search groom by name or phone..."
                  value={groomSearchQuery}
                  onChange={(e) => setGroomSearchQuery(e.target.value)}
                />
              </div>
              <div className="member-search-cards-list max-height-180">
                {filteredGrooms.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className={`member-select-card ${groomMemberId === m.id ? 'selected' : ''}`}
                    onClick={() => handleSelectGroom(m)}
                  >
                    <div className="flex-row-gap-sm">
                      <div className="donor-avatar-circle sm avatar-member">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-weight-700 font-sm text-dark">{m.name}</div>
                        <span className="font-xs color-subtle">ID: {m.id.substring(0, 8)} • Phone: {m.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <button type="button" className={`pill-btn-ghost font-xs ${groomMemberId === m.id ? 'bg-success text-white' : ''}`}>
                      {groomMemberId === m.id ? 'Selected ✓' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Groom Full Name *</label>
              <input
                type="text"
                className={`form-control ${fieldErrors.groomName ? 'is-invalid' : ''}`}
                value={groomName}
                onChange={(e) => setGroomName(e.target.value)}
                placeholder="Full Name"
              />
              {fieldErrors.groomName && <span className="field-error-text">{fieldErrors.groomName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Groom Father Name</label>
              <input
                type="text"
                className="form-control"
                value={groomFatherName}
                onChange={(e) => setGroomFatherName(e.target.value)}
                placeholder="Father Name"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Groom Address & Mahall Location</label>
              <input
                type="text"
                className="form-control"
                value={groomAddress}
                onChange={(e) => setGroomAddress(e.target.value)}
                placeholder="Full Address"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: BRIDE DETAILS */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <User size={18} className="text-danger" />
            <span className="form-section-title">Bride Information & Member Link</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group full-width">
              <label className="form-label">Search & Select Bride from Member Database</label>
              <div className="search-box margin-bottom-xs">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search bride by name or phone..."
                  value={brideSearchQuery}
                  onChange={(e) => setBrideSearchQuery(e.target.value)}
                />
              </div>
              <div className="member-search-cards-list max-height-180">
                {filteredBrides.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className={`member-select-card ${brideMemberId === m.id ? 'selected' : ''}`}
                    onClick={() => handleSelectBride(m)}
                  >
                    <div className="flex-row-gap-sm">
                      <div className="donor-avatar-circle sm avatar-member">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-weight-700 font-sm text-dark">{m.name}</div>
                        <span className="font-xs color-subtle">ID: {m.id.substring(0, 8)} • Phone: {m.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <button type="button" className={`pill-btn-ghost font-xs ${brideMemberId === m.id ? 'bg-success text-white' : ''}`}>
                      {brideMemberId === m.id ? 'Selected ✓' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bride Full Name *</label>
              <input
                type="text"
                className={`form-control ${fieldErrors.brideName ? 'is-invalid' : ''}`}
                value={brideName}
                onChange={(e) => setBrideName(e.target.value)}
                placeholder="Full Name"
              />
              {fieldErrors.brideName && <span className="field-error-text">{fieldErrors.brideName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Bride Father Name</label>
              <input
                type="text"
                className="form-control"
                value={brideFatherName}
                onChange={(e) => setBrideFatherName(e.target.value)}
                placeholder="Father Name"
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Bride Address & Location</label>
              <input
                type="text"
                className="form-control"
                value={brideAddress}
                onChange={(e) => setBrideAddress(e.target.value)}
                placeholder="Full Address"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: NIKAH CEREMONY & REGISTRATION */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <Calendar size={18} className="text-primary" />
            <span className="form-section-title">Nikah Ceremony, Witnesses & Certificate Codes</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group">
              <label className="form-label">Date of Marriage *</label>
              <input
                type="date"
                className={`form-control ${fieldErrors.marriageDate ? 'is-invalid' : ''}`}
                value={marriageDate}
                onChange={(e) => setMarriageDate(e.target.value)}
              />
              {fieldErrors.marriageDate && <span className="field-error-text">{fieldErrors.marriageDate}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Place of Marriage / Venue</label>
              <input
                type="text"
                className="form-control"
                value={marriagePlace}
                onChange={(e) => setMarriagePlace(e.target.value)}
                placeholder="Auditorium / Mosque venue"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nikah Performed By (Khateeb / Officiant)</label>
              <input
                type="text"
                className="form-control"
                value={nikahBy}
                onChange={(e) => setNikahBy(e.target.value)}
                placeholder="Name of Khateeb / Qazi"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Approval & Registration Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="approved">Approved & Certified</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected / Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Witness 1 Name</label>
              <input
                type="text"
                className="form-control"
                value={witness1Name}
                onChange={(e) => setWitness1Name(e.target.value)}
                placeholder="Full Name of 1st Witness"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Witness 2 Name</label>
              <input
                type="text"
                className="form-control"
                value={witness2Name}
                onChange={(e) => setWitness2Name(e.target.value)}
                placeholder="Full Name of 2nd Witness"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mahall Register Serial #</label>
              <input
                type="text"
                className="form-control font-weight-600"
                value={mahallRegistrationNumber}
                onChange={(e) => setMahallRegistrationNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Certificate Serial #</label>
              <input
                type="text"
                className="form-control font-weight-600"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Additional Remarks / Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special notes or Nikah register details..."
              />
            </div>
          </div>
        </div>

        {/* FORM FOOTER CTAS */}
        <div className="flex-between margin-top-md pt-md border-top">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/marriages')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving Record...' : isEditMode ? 'Update Record' : 'Register Marriage'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default MarriageForm;
