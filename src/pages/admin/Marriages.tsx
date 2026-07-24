import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { MarriageRecord, Member, Household, SubscriptionYear } from '../../services/db';
import { 
  Heart, Plus, Search, 
  Trash2, Edit2, Eye, CheckCircle, AlertCircle, 
  X, Loader2 
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Marriages: React.FC = () => {

  // Data States
  const [marriages, setMarriages] = useState<MarriageRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedMarriage, setSelectedMarriage] = useState<MarriageRecord | null>(null);

  // Form Fields
  // Groom
  const [isGroomMember, setIsGroomMember] = useState(true);
  const [groomMemberId, setGroomMemberId] = useState('');
  const [groomName, setGroomName] = useState('');
  const [groomFatherName, setGroomFatherName] = useState('');
  const [groomPhone, setGroomPhone] = useState('');
  const [groomHouseNumber, setGroomHouseNumber] = useState('');
  const [groomWard, setGroomWard] = useState('');
  const [groomAddress, setGroomAddress] = useState('');

  // Bride
  const [brideType, setBrideType] = useState<'member' | 'external'>('external');
  const [brideMemberId, setBrideMemberId] = useState('');
  const [brideName, setBrideName] = useState('');
  const [brideFatherName, setBrideFatherName] = useState('');
  const [bridePhone, setBridePhone] = useState('');
  const [brideAddress, setBrideAddress] = useState('');
  const [brideWard, setBrideWard] = useState('');

  // Nikah Info
  const [nikahDate, setNikahDate] = useState(new Date().toISOString().split('T')[0]);
  const [nikahTime, setNikahTime] = useState('');
  const [nikahVenue, setNikahVenue] = useState('Vellikkeel Mahall Juma Masjid');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [conductedBy, setConductedBy] = useState('');
  const [nikahType, setNikahType] = useState('Mahall Nikah');

  // Wali Info
  const [waliName, setWaliName] = useState('');
  const [waliRelationship, setWaliRelationship] = useState('Father');
  const [waliPhone, setWaliPhone] = useState('');

  // Witnesses
  const [witness1Name, setWitness1Name] = useState('');
  const [witness1Phone, setWitness1Phone] = useState('');
  const [witness2Name, setWitness2Name] = useState('');
  const [witness2Phone, setWitness2Phone] = useState('');

  // Mahr Info
  const [mahrType, setMahrType] = useState('Gold');
  const [mahrDescription, setMahrDescription] = useState('');
  const [mahrPaymentStatus, setMahrPaymentStatus] = useState('Paid Immediately');
  const [mahrNotes, setMahrNotes] = useState('');

  // Status & Notes
  const [status, setStatus] = useState<'completed' | 'cancelled'>('completed');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [marriageList, memberList, houseList, yearList] = await Promise.all([
        db.marriages.get(),
        db.members.get(),
        db.households.get(),
        db.years.get(),
      ]);
      setMarriages(marriageList);
      setMembers(memberList);
      setHouseholds(houseList);
      setYears(yearList);
    } catch (err) {
      console.error('Failed to load marriage records:', err);
      showToast('error', 'Failed to load marriage records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMarriages = useMemo(() => {
    // Resolve the selected year's numeric value from subscription_years
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    return marriages.filter((m) => {
      const matchSearch =
        m.groom_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.bride_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.registration_number && m.registration_number.toLowerCase().includes(searchQuery.toLowerCase()));

      // Compare year extracted from nikah_date against numeric year from subscription_years
      const matchYear = !selectedYearId || !selectedYear ||
        new Date(m.nikah_date).getFullYear() === selectedYear;
      const matchWard = !selectedWard || m.groom_ward === selectedWard || m.bride_ward === selectedWard;
      const matchStatus = !selectedStatus || m.status === selectedStatus;

      return matchSearch && matchYear && matchWard && matchStatus;
    });
  }, [marriages, searchQuery, selectedYearId, selectedWard, selectedStatus, years]);

  const uniqueWards = useMemo(() => {
    const set = new Set<string>();
    marriages.forEach((m) => {
      if (m.groom_ward) set.add(m.groom_ward);
      if (m.bride_ward) set.add(m.bride_ward);
    });
    households.forEach((h) => { if (h.area) set.add(h.area); });
    return Array.from(set);
  }, [marriages, households]);

  const handleSelectGroomMember = (mId: string) => {
    setGroomMemberId(mId);
    const m = members.find((x) => x.id === mId);
    if (m) {
      setGroomName(m.name);
      setGroomPhone(m.phone || '');
      const h = households.find((x) => x.id === m.household_id);
      if (h) {
        setGroomHouseNumber(`H-${h.house_number}`);
        setGroomWard(h.area || '');
        setGroomAddress(h.address || '');
      }
    }
  };

  const handleSelectBrideMember = (mId: string) => {
    setBrideMemberId(mId);
    const m = members.find((x) => x.id === mId);
    if (m) {
      setBrideName(m.name);
      setBridePhone(m.phone || '');
      const h = households.find((x) => x.id === m.household_id);
      if (h) {
        setBrideWard(h.area || '');
        setBrideAddress(h.address || '');
      }
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setCurrentId(null);
    setIsGroomMember(true);
    setGroomMemberId('');
    setGroomName('');
    setGroomFatherName('');
    setGroomPhone('');
    setGroomHouseNumber('');
    setGroomWard('');
    setGroomAddress('');

    setBrideType('external');
    setBrideMemberId('');
    setBrideName('');
    setBrideFatherName('');
    setBridePhone('');
    setBrideAddress('');
    setBrideWard('');

    setNikahDate(new Date().toISOString().split('T')[0]);
    setNikahTime('');
    setNikahVenue('Vellikkeel Mahall Juma Masjid');
    setRegistrationNumber('');
    setConductedBy('');
    setNikahType('Mahall Nikah');

    setWaliName('');
    setWaliRelationship('Father');
    setWaliPhone('');

    setWitness1Name('');
    setWitness1Phone('');
    setWitness2Name('');
    setWitness2Phone('');

    setMahrType('Gold');
    setMahrDescription('');
    setMahrPaymentStatus('Paid Immediately');
    setMahrNotes('');

    setStatus('completed');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (m: MarriageRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setCurrentId(m.id);

    setIsGroomMember(!!m.groom_member_id);
    setGroomMemberId(m.groom_member_id || '');
    setGroomName(m.groom_name);
    setGroomFatherName(m.groom_father_name || '');
    setGroomPhone(m.groom_phone || '');
    setGroomHouseNumber(m.groom_house_number || '');
    setGroomWard(m.groom_ward || '');
    setGroomAddress(m.groom_address || '');

    setBrideType(m.bride_type);
    setBrideMemberId(m.bride_member_id || '');
    setBrideName(m.bride_name);
    setBrideFatherName(m.bride_father_name || '');
    setBridePhone(m.bride_phone || '');
    setBrideAddress(m.bride_address || '');
    setBrideWard(m.bride_ward || '');

    setNikahDate(m.nikah_date);
    setNikahTime(m.nikah_time || '');
    setNikahVenue(m.nikah_venue || '');
    setRegistrationNumber(m.registration_number || '');
    setConductedBy(m.conducted_by || '');
    setNikahType(m.nikah_type || '');

    setWaliName(m.wali_name || '');
    setWaliRelationship(m.wali_relationship || 'Father');
    setWaliPhone(m.wali_phone || '');

    setWitness1Name(m.witness1_name || '');
    setWitness1Phone(m.witness1_phone || '');
    setWitness2Name(m.witness2_name || '');
    setWitness2Phone(m.witness2_phone || '');

    setMahrType(m.mahr_type || 'Gold');
    setMahrDescription(m.mahr_description || '');
    setMahrPaymentStatus(m.mahr_payment_status || 'Paid Immediately');
    setMahrNotes(m.mahr_notes || '');

    setStatus(m.status);
    setNotes(m.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groomName.trim()) {
      showToast('error', 'Groom name is required');
      return;
    }
    if (!brideName.trim()) {
      showToast('error', 'Bride name is required');
      return;
    }
    if (!nikahDate) {
      showToast('error', 'Nikah date is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<MarriageRecord, 'id' | 'created_at' | 'updated_at'> = {
        groom_name: groomName.trim(),
        groom_member_id: isGroomMember && groomMemberId ? groomMemberId : null,
        groom_father_name: groomFatherName.trim() || null,
        groom_phone: groomPhone.trim() || null,
        groom_house_number: groomHouseNumber.trim() || null,
        groom_ward: groomWard.trim() || null,
        groom_address: groomAddress.trim() || null,

        bride_type: brideType,
        bride_name: brideName.trim(),
        bride_member_id: brideType === 'member' && brideMemberId ? brideMemberId : null,
        bride_father_name: brideFatherName.trim() || null,
        bride_phone: bridePhone.trim() || null,
        bride_address: brideAddress.trim() || null,
        bride_ward: brideWard.trim() || null,

        nikah_date: nikahDate,
        nikah_time: nikahTime || null,
        nikah_venue: nikahVenue.trim() || null,
        registration_number: registrationNumber.trim() || null,
        conducted_by: conductedBy.trim() || null,
        nikah_type: nikahType.trim() || null,

        wali_name: waliName.trim() || null,
        wali_relationship: waliRelationship.trim() || null,
        wali_phone: waliPhone.trim() || null,

        witness1_name: witness1Name.trim() || null,
        witness1_phone: witness1Phone.trim() || null,
        witness2_name: witness2Name.trim() || null,
        witness2_phone: witness2Phone.trim() || null,

        mahr_type: mahrType || null,
        mahr_description: mahrDescription.trim() || null,
        mahr_payment_status: mahrPaymentStatus || null,
        mahr_notes: mahrNotes.trim() || null,

        status: status,
        certificate_url: null,
        notes: notes.trim() || null,
        created_by: null,
      };

      if (modalMode === 'add') {
        await db.marriages.create(payload);
        showToast('success', 'Marriage record created successfully');
      } else if (currentId) {
        await db.marriages.update(currentId, payload);
        showToast('success', 'Marriage record updated successfully');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving marriage record:', err);
      showToast('error', 'Failed to save marriage record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this marriage record?')) return;
    try {
      await db.marriages.delete(id);
      showToast('success', 'Marriage record deleted');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete marriage record');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMarriages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMarriages.map((m) => m.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map((id) => db.marriages.delete(id)));
      showToast('success', `${selectedIds.length} marriage records deleted`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to bulk delete records');
    }
  };

  return (
    <div className="marriages-page animate-fade-in">
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
            <Heart size={20} color="#ffffff" />
          </div>
          <div>
            <h2 className="canvas-page-title">Marriage Information</h2>
            <p className="summary-card-sub">Manage marriage records and matrimonial information of the Mahall community.</p>
          </div>
        </div>

        <div className="header-action-btns">
          <button className="pill-btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            <span>+ Add Marriage Record</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card filter-bar margin-bottom">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by groom, bride, or registration number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-selectors-grid">
          <YearFilter selectedYearId={selectedYearId} onChange={setSelectedYearId} showAllOption={true} />

          <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
            <option value="">All Wards / Areas</option>
            {uniqueWards.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">Status: All</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-toolbar glass-card margin-bottom">
          <span>{selectedIds.length} records selected</span>
          <button className="pill-btn-danger" onClick={() => setIsBulkDeleteModalOpen(true)}>
            <Trash2 size={15} />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {/* Marriage Table Directory */}
      <div className="glass-card main-table-card">
        {loading ? (
          <div className="loading-spinner-box"><Loader2 size={24} className="spinner" /></div>
        ) : filteredMarriages.length === 0 ? (
          <div className="notif-empty">No marriage records found matching criteria.</div>
        ) : (
          <>
            <div className="table-responsive desktop-view-only">
              <table className="lessa-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredMarriages.length && filteredMarriages.length > 0}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th>Groom</th>
                    <th>Bride</th>
                    <th>Nikah Date</th>
                    <th>Venue</th>
                    <th>Groom House</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarriages.map((m) => (
                    <tr key={m.id} className={selectedIds.includes(m.id) ? 'selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(m.id)}
                          onChange={() => handleToggleSelect(m.id)}
                        />
                      </td>
                      <td className="bold-name">{m.groom_name}</td>
                      <td>{m.bride_name} ({m.bride_type === 'member' ? 'Member' : 'External'})</td>
                      <td>{m.nikah_date}</td>
                      <td>{m.nikah_venue || 'N/A'}</td>
                      <td>{m.groom_house_number || 'N/A'}</td>
                      <td><span className={`badge-pill ${m.status === 'completed' ? 'success' : 'error'}`}>{m.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-button-wrapper">
                          <button className="action-btn view" onClick={() => { setSelectedMarriage(m); setIsDetailsOpen(true); }}><Eye size={15} /></button>
                          <button className="action-btn edit" onClick={(e) => openEditModal(m, e)}><Edit2 size={15} /></button>
                          <button className="action-btn delete" onClick={(e) => handleDelete(m.id, e)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-directory">
              {filteredMarriages.map((m) => (
                <div key={m.id} className="mobile-notif-card">
                  <div className="card-head">
                    <h4 className="notif-title">{m.groom_name} & {m.bride_name}</h4>
                    <span className="badge-pill success">{m.status}</span>
                  </div>
                  <div className="card-body font-xs">
                    <p><strong>Nikah Date:</strong> {m.nikah_date}</p>
                    <p><strong>Venue:</strong> {m.nikah_venue || 'N/A'}</p>
                    <p><strong>Groom House:</strong> {m.groom_house_number || 'N/A'}</p>
                  </div>
                  <div className="card-footer">
                    <button className="pill-btn-secondary" onClick={() => openEditModal(m)}><Edit2 size={14} /> Edit</button>
                    <button className="pill-btn-danger" onClick={() => handleDelete(m.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ADD / EDIT MARRIAGE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card animate-fade-in" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3>{modalMode === 'add' ? '+ Add Marriage Record' : 'Edit Marriage Record'}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="modal-body-scroll">
              {/* SECTION A — GROOM INFORMATION */}
              <div className="form-section-title">SECTION A — GROOM INFORMATION</div>
              <div className="toggle-switch-row margin-bottom font-sm">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isGroomMember} onChange={(e) => setIsGroomMember(e.target.checked)} />
                  <span>Groom is Existing Mahall Member</span>
                </label>
              </div>

              {isGroomMember && (
                <div className="form-group">
                  <label>Select Groom Member</label>
                  <select value={groomMemberId} onChange={(e) => handleSelectGroomMember(e.target.value)}>
                    <option value="">-- Choose Groom Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Groom Name *</label>
                <input type="text" required value={groomName} onChange={(e) => setGroomName(e.target.value)} />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Father's Name</label>
                  <input type="text" value={groomFatherName} onChange={(e) => setGroomFatherName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" value={groomPhone} onChange={(e) => setGroomPhone(e.target.value)} />
                </div>
              </div>

              {/* SECTION B — BRIDE INFORMATION */}
              <div className="form-section-title">SECTION B — BRIDE INFORMATION</div>
              <div className="form-group">
                <label>Bride Type</label>
                <div className="flex-row-gap margin-top font-sm">
                  <label><input type="radio" name="brideType" value="member" checked={brideType === 'member'} onChange={() => setBrideType('member')} /> Mahall Member</label>
                  <label><input type="radio" name="brideType" value="external" checked={brideType === 'external'} onChange={() => setBrideType('external')} /> External / Non-Member</label>
                </div>
              </div>

              {brideType === 'member' && (
                <div className="form-group">
                  <label>Select Bride Member</label>
                  <select value={brideMemberId} onChange={(e) => handleSelectBrideMember(e.target.value)}>
                    <option value="">-- Choose Bride Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Bride Name *</label>
                <input type="text" required value={brideName} onChange={(e) => setBrideName(e.target.value)} />
              </div>

              {/* SECTION C — NIKAH INFORMATION */}
              <div className="form-section-title">SECTION C — NIKAH INFORMATION</div>
              <div className="form-row-grid">
                <div className="form-group">
                  <label>Nikah Date *</label>
                  <input type="date" required value={nikahDate} onChange={(e) => setNikahDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Nikah Time</label>
                  <input type="time" value={nikahTime} onChange={(e) => setNikahTime(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Nikah Venue</label>
                <input type="text" value={nikahVenue} onChange={(e) => setNikahVenue(e.target.value)} />
              </div>

              {/* SECTION D & E — WALI & WITNESSES */}
              <div className="form-section-title">SECTION D — WALI & WITNESS DETAILS</div>
              <div className="form-row-grid">
                <div className="form-group">
                  <label>Wali Name</label>
                  <input type="text" value={waliName} onChange={(e) => setWaliName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Wali Phone</label>
                  <input type="text" value={waliPhone} onChange={(e) => setWaliPhone(e.target.value)} />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Witness 1 Name</label>
                  <input type="text" value={witness1Name} onChange={(e) => setWitness1Name(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Witness 2 Name</label>
                  <input type="text" value={witness2Name} onChange={(e) => setWitness2Name(e.target.value)} />
                </div>
              </div>

              {/* SECTION F — MAHR INFORMATION */}
              <div className="form-section-title">SECTION F — MAHR / SADAQ INFORMATION</div>
              <div className="form-row-grid">
                <div className="form-group">
                  <label>Mahr Type</label>
                  <select value={mahrType} onChange={(e) => setMahrType(e.target.value)}>
                    <option value="Gold">Gold</option>
                    <option value="Cash">Cash</option>
                    <option value="Property">Property</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Mahr Description / Amount</label>
                  <input type="text" placeholder="e.g. 5 Sovereign Gold" value={mahrDescription} onChange={(e) => setMahrDescription(e.target.value)} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="pill-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="pill-btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spinner" /> : 'Save Marriage Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS VIEW MODAL */}
      {isDetailsOpen && selectedMarriage && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card animate-fade-in">
            <div className="modal-header">
              <h3>{selectedMarriage.groom_name} & {selectedMarriage.bride_name}</h3>
              <button className="modal-close-btn" onClick={() => setIsDetailsOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body-scroll font-sm">
              <p><strong>Groom:</strong> {selectedMarriage.groom_name} ({selectedMarriage.groom_phone || 'No phone'})</p>
              <p><strong>Bride:</strong> {selectedMarriage.bride_name} ({selectedMarriage.bride_type === 'member' ? 'Member' : 'External'})</p>
              <p><strong>Nikah Date & Time:</strong> {selectedMarriage.nikah_date} {selectedMarriage.nikah_time || ''}</p>
              <p><strong>Venue:</strong> {selectedMarriage.nikah_venue || 'N/A'}</p>
              <p><strong>Officiant:</strong> {selectedMarriage.conducted_by || 'N/A'}</p>
              <p><strong>Wali:</strong> {selectedMarriage.wali_name || 'N/A'} ({selectedMarriage.wali_relationship || 'Father'})</p>
              <p><strong>Mahr:</strong> {selectedMarriage.mahr_type} - {selectedMarriage.mahr_description || 'N/A'}</p>
            </div>
            <div className="modal-footer">
              <button className="pill-btn-secondary" onClick={() => setIsDetailsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card">
            <h3>Confirm Bulk Delete</h3>
            <p>Are you sure you want to delete {selectedIds.length} selected marriage records?</p>
            <div className="modal-footer">
              <button className="pill-btn-secondary" onClick={() => setIsBulkDeleteModalOpen(false)}>Cancel</button>
              <button className="pill-btn-danger" onClick={handleBulkDelete}>Delete Records</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marriages;
