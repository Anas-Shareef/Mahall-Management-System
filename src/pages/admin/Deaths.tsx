import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { DeathRecord, Member, Household } from '../../services/db';
import { 
  UserX, Plus, Search, 
  Trash2, Edit2, Eye, CheckCircle, AlertCircle, 
  X, Loader2 
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Deaths: React.FC = () => {

  // Data States
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDeathRecord, setSelectedDeathRecord] = useState<DeathRecord | null>(null);

  // Form Fields
  const [isLinkedMember, setIsLinkedMember] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [deceasedName, setDeceasedName] = useState('');
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
  const [dateOfDeath, setDateOfDeath] = useState(new Date().toISOString().split('T')[0]);
  const [burialDate, setBurialDate] = useState('');
  const [burialTime, setBurialTime] = useState('');
  const [placeOfDeath, setPlaceOfDeath] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [address, setAddress] = useState('');
  const [wardOrArea, setWardOrArea] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [medicallyCertified, setMedicallyCertified] = useState(false);
  const [certifierName, setCertifierName] = useState('');
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
      const [deathList, memberList, houseList] = await Promise.all([
        db.deaths.get(),
        db.members.get(),
        db.households.get(),
      ]);
      setDeaths(deathList);
      setMembers(memberList);
      setHouseholds(houseList);
    } catch (err) {
      console.error('Failed to load death records:', err);
      showToast('error', 'Failed to load death records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered death list
  const filteredDeaths = useMemo(() => {
    return deaths.filter((d) => {
      const matchSearch =
        d.deceased_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.father_or_husband_name && d.father_or_husband_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.ward_or_area && d.ward_or_area.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchYear = !selectedYearId || d.date_of_death.startsWith(selectedYearId);
      const matchWard = !selectedWard || d.ward_or_area === selectedWard;
      const matchGender = !selectedGender || d.gender === selectedGender;

      return matchSearch && matchYear && matchWard && matchGender;
    });
  }, [deaths, searchQuery, selectedYearId, selectedWard, selectedGender]);

  const uniqueWards = useMemo(() => {
    const set = new Set<string>();
    deaths.forEach((d) => { if (d.ward_or_area) set.add(d.ward_or_area); });
    households.forEach((h) => { if (h.area) set.add(h.area); });
    return Array.from(set);
  }, [deaths, households]);

  const handleSelectMember = (mId: string) => {
    setSelectedMemberId(mId);
    const m = members.find((x) => x.id === mId);
    if (m) {
      setDeceasedName(m.name);
      setFatherOrHusbandName(m.relationship || '');
      const h = households.find((x) => x.id === m.household_id);
      if (h) {
        setAddress(h.address || '');
        setWardOrArea(h.area || '');
      }
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setCurrentId(null);
    setIsLinkedMember(true);
    setSelectedMemberId('');
    setDeceasedName('');
    setFatherOrHusbandName('');
    setDateOfDeath(new Date().toISOString().split('T')[0]);
    setBurialDate('');
    setBurialTime('');
    setPlaceOfDeath('');
    setAge('');
    setGender('male');
    setAddress('');
    setWardOrArea('');
    setCauseOfDeath('');
    setMedicallyCertified(false);
    setCertifierName('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (d: DeathRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setCurrentId(d.id);
    setIsLinkedMember(!!d.member_id);
    setSelectedMemberId(d.member_id || '');
    setDeceasedName(d.deceased_name);
    setFatherOrHusbandName(d.father_or_husband_name || '');
    setDateOfDeath(d.date_of_death);
    setBurialDate(d.burial_date || '');
    setBurialTime(d.burial_time || '');
    setPlaceOfDeath(d.place_of_death || '');
    setAge(d.age !== null ? d.age : '');
    setGender(d.gender || 'male');
    setAddress(d.address || '');
    setWardOrArea(d.ward_or_area || '');
    setCauseOfDeath(d.cause_of_death || '');
    setMedicallyCertified(d.medically_certified);
    setCertifierName(d.certifier_name || '');
    setNotes(d.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deceasedName.trim()) {
      showToast('error', 'Deceased person name is required');
      return;
    }
    if (!dateOfDeath) {
      showToast('error', 'Date of death is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<DeathRecord, 'id' | 'created_at' | 'updated_at'> = {
        deceased_name: deceasedName.trim(),
        member_id: isLinkedMember && selectedMemberId ? selectedMemberId : null,
        father_or_husband_name: fatherOrHusbandName.trim() || null,
        date_of_death: dateOfDeath,
        burial_date: burialDate || null,
        burial_time: burialTime || null,
        place_of_death: placeOfDeath.trim() || null,
        age: age !== '' ? Number(age) : null,
        gender: gender,
        address: address.trim() || null,
        ward_or_area: wardOrArea.trim() || null,
        cause_of_death: causeOfDeath.trim() || null,
        medically_certified: medicallyCertified,
        certifier_name: medicallyCertified ? certifierName.trim() || null : null,
        notes: notes.trim() || null,
        certificate_url: null,
        created_by: null,
      };

      if (modalMode === 'add') {
        await db.deaths.create(payload);
        // If linked to existing member, update status to deceased
        if (isLinkedMember && selectedMemberId) {
          await db.members.update(selectedMemberId, { status: 'inactive' });
        }
        showToast('success', 'Death record created successfully');
      } else if (currentId) {
        await db.deaths.update(currentId, payload);
        showToast('success', 'Death record updated successfully');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving death record:', err);
      showToast('error', 'Failed to save death record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this death record?')) return;
    try {
      await db.deaths.delete(id);
      showToast('success', 'Death record deleted');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete record');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredDeaths.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDeaths.map((d) => d.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map((id) => db.deaths.delete(id)));
      showToast('success', `${selectedIds.length} death records deleted`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to bulk delete records');
    }
  };

  return (
    <div className="deaths-page animate-fade-in">
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
            <UserX size={20} color="#ffffff" />
          </div>
          <div>
            <h2 className="canvas-page-title">Death Information</h2>
            <p className="summary-card-sub">Manage and maintain records of deceased community members.</p>
          </div>
        </div>

        <div className="header-action-btns">
          <button className="pill-btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            <span>+ Add Death Record</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card filter-bar margin-bottom">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by deceased name, father name, or ward..."
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

          <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)}>
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
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

      {/* Death Records Directory Table */}
      <div className="glass-card main-table-card">
        {loading ? (
          <div className="loading-spinner-box"><Loader2 size={24} className="spinner" /></div>
        ) : filteredDeaths.length === 0 ? (
          <div className="notif-empty">No death records found matching criteria.</div>
        ) : (
          <>
            <div className="table-responsive desktop-view-only">
              <table className="lessa-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredDeaths.length && filteredDeaths.length > 0}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th>Deceased Name</th>
                    <th>Father / Husband</th>
                    <th>Date of Death</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Ward / Area</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeaths.map((d) => (
                    <tr key={d.id} className={selectedIds.includes(d.id) ? 'selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={() => handleToggleSelect(d.id)}
                        />
                      </td>
                      <td className="bold-name">{d.deceased_name}</td>
                      <td>{d.father_or_husband_name || 'N/A'}</td>
                      <td>{d.date_of_death}</td>
                      <td>{d.age !== null ? `${d.age} yrs` : 'N/A'}</td>
                      <td><span className="badge-pill info">{d.gender || 'male'}</span></td>
                      <td>{d.ward_or_area || 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-button-wrapper">
                          <button className="action-btn view" onClick={() => { setSelectedDeathRecord(d); setIsDetailsOpen(true); }}><Eye size={15} /></button>
                          <button className="action-btn edit" onClick={(e) => openEditModal(d, e)}><Edit2 size={15} /></button>
                          <button className="action-btn delete" onClick={(e) => handleDelete(d.id, e)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-directory">
              {filteredDeaths.map((d) => (
                <div key={d.id} className="mobile-notif-card">
                  <div className="card-head">
                    <h4 className="notif-title">{d.deceased_name}</h4>
                    <span className="badge-pill info">{d.gender}</span>
                  </div>
                  <div className="card-body font-xs">
                    <p><strong>Father/Husband:</strong> {d.father_or_husband_name || 'N/A'}</p>
                    <p><strong>Date of Death:</strong> {d.date_of_death}</p>
                    <p><strong>Ward:</strong> {d.ward_or_area || 'N/A'}</p>
                  </div>
                  <div className="card-footer">
                    <button className="pill-btn-secondary" onClick={() => openEditModal(d)}><Edit2 size={14} /> Edit</button>
                    <button className="pill-btn-danger" onClick={() => handleDelete(d.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ADD / EDIT DEATH MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card animate-fade-in">
            <div className="modal-header">
              <h3>{modalMode === 'add' ? '+ Add Death Record' : 'Edit Death Record'}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="modal-body-scroll">
              <div className="form-section-title">Section A — Deceased Person</div>
              
              <div className="toggle-switch-row margin-bottom font-sm">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isLinkedMember} onChange={(e) => setIsLinkedMember(e.target.checked)} />
                  <span>Link to Existing Mahall Member</span>
                </label>
              </div>

              {isLinkedMember && (
                <div className="form-group">
                  <label>Select Member</label>
                  <select value={selectedMemberId} onChange={(e) => handleSelectMember(e.target.value)}>
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Deceased Person Name *</label>
                <input type="text" required value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Father / Husband Name</label>
                <input type="text" value={fatherOrHusbandName} onChange={(e) => setFatherOrHusbandName(e.target.value)} />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Date of Death *</label>
                  <input type="date" required value={dateOfDeath} onChange={(e) => setDateOfDeath(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')} />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Burial Date</label>
                  <input type="date" value={burialDate} onChange={(e) => setBurialDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Burial Time</label>
                  <input type="time" value={burialTime} onChange={(e) => setBurialTime(e.target.value)} />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value as any)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ward / Area</label>
                  <input type="text" value={wardOrArea} onChange={(e) => setWardOrArea(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Cause of Death</label>
                <input type="text" value={causeOfDeath} onChange={(e) => setCauseOfDeath(e.target.value)} />
              </div>

              <div className="modal-footer">
                <button type="button" className="pill-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="pill-btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spinner" /> : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS VIEW MODAL */}
      {isDetailsOpen && selectedDeathRecord && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card animate-fade-in">
            <div className="modal-header">
              <h3>{selectedDeathRecord.deceased_name}</h3>
              <button className="modal-close-btn" onClick={() => setIsDetailsOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body-scroll font-sm">
              <p><strong>Father / Husband:</strong> {selectedDeathRecord.father_or_husband_name || 'N/A'}</p>
              <p><strong>Date of Death:</strong> {selectedDeathRecord.date_of_death}</p>
              <p><strong>Burial Date/Time:</strong> {selectedDeathRecord.burial_date || 'N/A'} {selectedDeathRecord.burial_time || ''}</p>
              <p><strong>Age:</strong> {selectedDeathRecord.age || 'N/A'} | <strong>Gender:</strong> {selectedDeathRecord.gender}</p>
              <p><strong>Ward / Area:</strong> {selectedDeathRecord.ward_or_area || 'N/A'}</p>
              <p><strong>Cause of Death:</strong> {selectedDeathRecord.cause_of_death || 'N/A'}</p>
              <p><strong>Medically Certified:</strong> {selectedDeathRecord.medically_certified ? `Yes (${selectedDeathRecord.certifier_name || 'Doctor'})` : 'No'}</p>
            </div>
            <div className="modal-footer">
              <button className="pill-btn-secondary" onClick={() => setIsDetailsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card">
            <h3>Confirm Bulk Delete</h3>
            <p>Are you sure you want to delete {selectedIds.length} selected death records?</p>
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

export default Deaths;
