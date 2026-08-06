import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../services/db';
import type { Member, Household } from '../../services/db';
import { 
  User, CheckCircle, AlertCircle, 
  ArrowLeft, Save, Loader2, Calendar, Search, Award
} from 'lucide-react';

export const DeathForm: React.FC = () => {
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

  // Member Search Query
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isLinkedMember, setIsLinkedMember] = useState(true);

  // Form Fields
  const [deceasedName, setDeceasedName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [dateOfDeath, setDateOfDeath] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDeath, setTimeOfDeath] = useState('');
  const [placeOfDeath, setPlaceOfDeath] = useState('Hospital');
  const [causeOfDeath, setCauseOfDeath] = useState('Natural');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
  const [cemeteryPlace, setCemeteryPlace] = useState('Central Mahall Qabristan');
  const [plotNumber, setPlotNumber] = useState('');
  const [medicallyCertified, setMedicallyCertified] = useState(false);
  const [certifierName, setCertifierName] = useState('');
  const [certificateNumber, setCertificateNumber] = useState(`DC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [wardOrArea, setWardOrArea] = useState('');
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
        const allDeaths = await db.deaths.get();
        const current = allDeaths.find((d) => d.id === id);
        if (current) {
          setDeceasedName(current.deceased_name || '');
          setMemberId(current.member_id || '');
          setIsLinkedMember(Boolean(current.member_id));
          setDateOfDeath(current.date_of_death || new Date().toISOString().split('T')[0]);
          setTimeOfDeath(current.burial_time || '');
          setPlaceOfDeath(current.place_of_death || 'Hospital');
          setCauseOfDeath(current.cause_of_death || 'Natural');
          setAge(current.age || '');
          setGender(current.gender || 'male');
          setFatherOrHusbandName(current.father_or_husband_name || '');
          setCemeteryPlace('Central Mahall Qabristan');
          setPlotNumber('');
          setMedicallyCertified(current.medically_certified ?? false);
          setCertifierName(current.certifier_name || '');
          setCertificateNumber(current.certificate_url || '');
          setWardOrArea(current.ward_or_area || '');
          setNotes(current.notes || '');
        } else {
          showToast('error', 'Death record not found');
          setTimeout(() => navigate('/admin/deaths'), 1500);
        }
      }
    } catch (err) {
      console.error('Error fetching death record:', err);
      showToast('error', 'Failed to load death record data');
    } finally {
      setLoading(false);
    }
  };

  const searchableMembers = members.filter((m) => {
    const query = memberSearchQuery.toLowerCase();
    return m.name.toLowerCase().includes(query) || (m.phone && m.phone.includes(query)) || m.id.includes(query);
  });

  const handleSelectMember = (m: Member) => {
    if (memberId === m.id) {
      // Toggle Unselect!
      setMemberId('');
      setDeceasedName('');
    } else {
      // Select!
      setMemberId(m.id);
      setDeceasedName(m.name);
      const house = households.find((h) => h.id === m.household_id);
      if (house && house.area) setWardOrArea(house.area);
    }
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!deceasedName.trim()) {
      errors.deceasedName = 'Deceased person name is required';
    }
    if (!dateOfDeath) {
      errors.dateOfDeath = 'Date of death is required';
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
        deceased_name: deceasedName.trim(),
        member_id: isLinkedMember && memberId ? memberId : null,
        date_of_death: dateOfDeath,
        time_of_death: timeOfDeath.trim() || null,
        place_of_death: placeOfDeath.trim() || null,
        cause_of_death: causeOfDeath.trim() || null,
        age: age ? Number(age) : null,
        gender,
        father_or_husband_name: fatherOrHusbandName.trim() || null,
        mother_name: null,
        cemetery_place: cemeteryPlace.trim() || null,
        burial_date: dateOfDeath,
        burial_time: null,
        plot_number: plotNumber.trim() || null,
        medically_certified: medicallyCertified,
        certifier_name: certifierName.trim() || null,
        certificate_number: certificateNumber.trim() || null,
        ward_or_area: wardOrArea.trim() || null,
        notes: notes.trim() || null,
        address: null,
        created_by: null,
        certificate_url: certificateNumber.trim() || null
      };

      if (isEditMode && id) {
        await db.deaths.update(id, payload);
        showToast('success', 'Death record updated successfully');
      } else {
        await db.deaths.create(payload);
        // Automatically deactivate member status if linked
        if (isLinkedMember && memberId) {
          await db.members.update(memberId, { status: 'inactive' });
        }
        showToast('success', 'Death record saved to Supabase');
      }
      setTimeout(() => navigate('/admin/deaths'), 1000);
    } catch (err) {
      console.error('Error saving death record:', err);
      showToast('error', 'Failed to save death record');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center py-2xl">
        <Loader2 className="spinner text-primary" size={36} />
        <span className="margin-left-sm font-weight-600 color-subtle">Loading Death Record Form...</span>
      </div>
    );
  }

  return (
    <div className="death-form-page animate-fade-in padding-md">
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
            {isEditMode ? 'Edit Death Record' : 'Record Deceased Member'}
          </h2>
          <p className="font-sm color-subtle margin-top-xs">
            Capture death record details, medical certification, and burial location.
          </p>
        </div>

        <div className="flex-row-gap-xs">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/deaths')}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <button 
            type="submit" 
            form="death-form"
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving...' : isEditMode ? 'Update Record' : 'Save Record'}</span>
          </button>
        </div>
      </div>

      <form id="death-form" onSubmit={handleSubmit} className="flex-col gap-lg max-width-1100 margin-auto">
        {/* SECTION 1: DECEASED MEMBER LINK */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <User size={18} className="text-primary" />
            <span className="form-section-title">Deceased Person Identification</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group full-width">
              <label className="checkbox-label margin-bottom-sm">
                <input
                  type="checkbox"
                  checked={isLinkedMember}
                  onChange={(e) => {
                    setIsLinkedMember(e.target.checked);
                    if (!e.target.checked) setMemberId('');
                  }}
                />
                <span>Deceased person is a registered Mahall Member</span>
              </label>
            </div>

            {isLinkedMember && (
              <div className="form-group full-width">
                <div className="flex-between margin-bottom-xs align-items-center">
                  <label className="form-label margin-bottom-0">Search & Select Member Database *</label>
                  {memberId && (
                    <button
                      type="button"
                      className="pill-btn-ghost font-xs text-danger"
                      onClick={() => { setMemberId(''); setDeceasedName(''); }}
                    >
                      ✕ Unselect Member
                    </button>
                  )}
                </div>

                <div className="margin-bottom-xs">
                  <select
                    className="form-control"
                    value={memberId}
                    onChange={(e) => {
                      const selected = members.find((m) => m.id === e.target.value);
                      if (selected) {
                        setMemberId(selected.id);
                        setDeceasedName(selected.name);
                        const house = households.find((h) => h.id === selected.household_id);
                        if (house && house.area) setWardOrArea(house.area);
                      } else {
                        setMemberId('');
                        setDeceasedName('');
                      }
                    }}
                  >
                    <option value="">-- Select Member from Dropdown --</option>
                    {members.map((m) => {
                      const house = households.find((h) => h.id === m.household_id);
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.relationship || 'Member'}) {house ? `• House #${house.house_number}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="search-box margin-bottom-xs">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search member by name, ID, phone..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                  />
                </div>

                <div className="member-search-cards-list max-height-240">
                  {searchableMembers.slice(0, 8).map((m) => {
                    const house = households.find((h) => h.id === m.household_id);
                    const isSel = memberId === m.id;

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
                              House #{house ? house.house_number : 'N/A'} • Relation: {m.relationship}
                            </span>
                          </div>
                        </div>
                        <button type="button" className={`pill-btn-ghost font-xs ${isSel ? 'bg-success text-white' : ''}`}>
                          {isSel ? 'Selected ✓ (Click to Unselect)' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Deceased Full Name *</label>
              <input
                type="text"
                className={`form-control ${fieldErrors.deceasedName ? 'is-invalid' : ''}`}
                value={deceasedName}
                onChange={(e) => setDeceasedName(e.target.value)}
                placeholder="Full Name of deceased person"
              />
              {fieldErrors.deceasedName && <span className="field-error-text">{fieldErrors.deceasedName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Father / Husband Name</label>
              <input
                type="text"
                className="form-control"
                value={fatherOrHusbandName}
                onChange={(e) => setFatherOrHusbandName(e.target.value)}
                placeholder="Relative Name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Age at Death</label>
              <input
                type="number"
                className="form-control"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                placeholder="Age in years"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-control"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: DEATH & MEDICAL DETAILS */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <Calendar size={18} className="text-primary" />
            <span className="form-section-title">Death Details & Medical Certification</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group">
              <label className="form-label">Date of Death *</label>
              <input
                type="date"
                className={`form-control ${fieldErrors.dateOfDeath ? 'is-invalid' : ''}`}
                value={dateOfDeath}
                onChange={(e) => setDateOfDeath(e.target.value)}
              />
              {fieldErrors.dateOfDeath && <span className="field-error-text">{fieldErrors.dateOfDeath}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Time of Death</label>
              <input
                type="time"
                className="form-control"
                value={timeOfDeath}
                onChange={(e) => setTimeOfDeath(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Place of Death</label>
              <select
                className="form-control"
                value={placeOfDeath}
                onChange={(e) => setPlaceOfDeath(e.target.value)}
              >
                <option value="Hospital">Hospital</option>
                <option value="Home">Home</option>
                <option value="Other">Other Location</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cause of Death</label>
              <select
                className="form-control"
                value={causeOfDeath}
                onChange={(e) => setCauseOfDeath(e.target.value)}
              >
                <option value="Natural">Natural Causes</option>
                <option value="Illness">Illness / Disease</option>
                <option value="Accident">Accident</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ward / Area</label>
              <input
                type="text"
                className="form-control"
                value={wardOrArea}
                onChange={(e) => setWardOrArea(e.target.value)}
                placeholder="e.g. Ward 2 / North Street"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attending Doctor / Certifier Name</label>
              <input
                type="text"
                className="form-control"
                value={certifierName}
                onChange={(e) => setCertifierName(e.target.value)}
                placeholder="Dr. Name or Medical Officer"
              />
            </div>

            <div className="form-group full-width">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={medicallyCertified}
                  onChange={(e) => setMedicallyCertified(e.target.checked)}
                />
                <span>Medically Certified Death Record</span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: BURIAL & CERTIFICATE DETAILS */}
        <div className="form-section-card shadow-sm">
          <div className="form-section-header">
            <Award size={18} className="text-primary" />
            <span className="form-section-title">Burial Qabristan & Death Certificate Serial</span>
          </div>

          <div className="form-grid-2col padding-md">
            <div className="form-group">
              <label className="form-label">Cemetery / Qabristan Name</label>
              <input
                type="text"
                className="form-control"
                value={cemeteryPlace}
                onChange={(e) => setCemeteryPlace(e.target.value)}
                placeholder="e.g. Central Mahall Qabristan"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Khabar / Plot Number</label>
              <input
                type="text"
                className="form-control"
                value={plotNumber}
                onChange={(e) => setPlotNumber(e.target.value)}
                placeholder="e.g. Plot B-14"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Certificate Serial Number</label>
              <input
                type="text"
                className="form-control font-weight-600"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Special Remarks / Notes</label>
              <textarea
                className="form-control"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
              />
            </div>
          </div>
        </div>

        {/* FORM FOOTER CTAS */}
        <div className="flex-between margin-top-md pt-md border-top">
          <button 
            type="button" 
            className="pill-btn-ghost" 
            onClick={() => navigate('/admin/deaths')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="pill-btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            <span>{isSaving ? 'Saving Record...' : isEditMode ? 'Update Record' : 'Save Record'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeathForm;
