import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { DeathRecord, Member, Household, SubscriptionYear } from '../../services/db';
import { 
  UserX, Plus, Search, Trash2, Edit2, Eye, CheckCircle, AlertCircle, 
  X, Loader2, Calendar, CalendarDays, FileWarning, Clock, Download, 
  Filter, ChevronRight, User, Printer, RefreshCw, FileText, Check
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Deaths: React.FC = () => {

  // Data States
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedCertStatus, setSelectedCertStatus] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<string>('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modal / Drawer States
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDeathRecord, setSelectedDeathRecord] = useState<DeathRecord | null>(null);

  // Form Fields
  const [memberSearch, setMemberSearch] = useState('');
  const [isLinkedMember, setIsLinkedMember] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [deceasedName, setDeceasedName] = useState('');
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
  const [dateOfDeath, setDateOfDeath] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDeath, setTimeOfDeath] = useState('');
  const [burialDate, setBurialDate] = useState('');
  const [burialTime, setBurialTime] = useState('');
  const [burialLocation, setBurialLocation] = useState('');
  const [placeOfDeath, setPlaceOfDeath] = useState<'Home' | 'Hospital' | 'Other' | string>('Hospital');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [address, setAddress] = useState('');
  const [wardOrArea, setWardOrArea] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [medicallyCertified, setMedicallyCertified] = useState(true);
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
    setFetchError(false);
    try {
      const [deathList, memberList, houseList, yearList] = await Promise.all([
        db.deaths.get(),
        db.members.get(),
        db.households.get(),
        db.years.get(),
      ]);
      setDeaths(deathList || []);
      setMembers(memberList || []);
      setHouseholds(houseList || []);
      setYears(yearList || []);
    } catch (err) {
      console.error('Failed to load death records:', err);
      setFetchError(true);
      showToast('error', 'Failed to load death records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute 5 Dashboard Summary Cards
  const metrics = useMemo(() => {
    const total = deaths.length;
    const now = new Date();
    const currentYearNum = selectedYearId 
      ? (years.find((y) => y.id === selectedYearId)?.year ?? now.getFullYear())
      : now.getFullYear();

    const thisYear = deaths.filter((d) => {
      if (!d.date_of_death) return false;
      return new Date(d.date_of_death).getFullYear() === currentYearNum;
    }).length;

    const thisMonth = deaths.filter((d) => {
      if (!d.date_of_death) return false;
      const dt = new Date(d.date_of_death);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).length;

    const pendingCertificates = deaths.filter((d) => !d.certificate_url && !d.medically_certified && !d.notes?.includes('DC-')).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDeaths = deaths.filter((d) => {
      if (!d.date_of_death) return false;
      return new Date(d.date_of_death) >= thirtyDaysAgo;
    }).length;

    return { total, thisYear, thisMonth, pendingCertificates, recentDeaths, currentYearNum };
  }, [deaths, years, selectedYearId]);

  // Filtered death list
  const filteredDeaths = useMemo(() => {
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    return deaths.filter((d) => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = !query || (
        d.deceased_name.toLowerCase().includes(query) ||
        (d.father_or_husband_name && d.father_or_husband_name.toLowerCase().includes(query)) ||
        (d.ward_or_area && d.ward_or_area.toLowerCase().includes(query)) ||
        (d.member_id && d.member_id.toLowerCase().includes(query)) ||
        (d.notes && d.notes.toLowerCase().includes(query))
      );

      const matchYear = !selectedYearId || !selectedYear || (d.date_of_death && new Date(d.date_of_death).getFullYear() === selectedYear);
      const matchWard = !selectedWard || d.ward_or_area === selectedWard;
      const matchGender = !selectedGender || d.gender === selectedGender;
      
      const isAvailable = !!d.certificate_url || d.medically_certified || (d.notes && d.notes.includes('DC-'));
      const matchCert = !selectedCertStatus || (selectedCertStatus === 'available' ? isAvailable : !isAvailable);
      const matchPlace = !selectedPlace || (d.place_of_death && d.place_of_death.toLowerCase() === selectedPlace.toLowerCase());

      return matchSearch && matchYear && matchWard && matchGender && matchCert && matchPlace;
    });
  }, [deaths, searchQuery, selectedYearId, selectedWard, selectedGender, selectedCertStatus, selectedPlace, years]);

  const uniqueWards = useMemo(() => {
    const set = new Set<string>();
    deaths.forEach((d) => { if (d.ward_or_area) set.add(d.ward_or_area); });
    households.forEach((h) => { if (h.area) set.add(h.area); });
    return Array.from(set);
  }, [deaths, households]);

  // Filtered active members for Step 1 wizard search
  const searchableMembers = useMemo(() => {
    const query = memberSearch.toLowerCase().trim();
    if (!query) return members.slice(0, 8);
    return members.filter((m) => 
      m.name.toLowerCase().includes(query) ||
      (m.id && m.id.toLowerCase().includes(query)) ||
      (m.phone && m.phone.includes(query))
    ).slice(0, 10);
  }, [members, memberSearch]);

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

  const openAddDrawer = () => {
    setModalMode('add');
    setCurrentId(null);
    setWizardStep(1);
    setMemberSearch('');
    setIsLinkedMember(true);
    setSelectedMemberId('');
    setDeceasedName('');
    setFatherOrHusbandName('');
    setDateOfDeath(new Date().toISOString().split('T')[0]);
    setTimeOfDeath('');
    setBurialDate('');
    setBurialTime('');
    setBurialLocation('');
    setPlaceOfDeath('Hospital');
    setAge('');
    setGender('male');
    setAddress('');
    setWardOrArea('');
    setCauseOfDeath('Natural');
    setCertificateNumber('');
    setMedicallyCertified(true);
    setCertifierName('');
    setNotes('');
    setIsAddDrawerOpen(true);
  };

  const openEditDrawer = (d: DeathRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setCurrentId(d.id);
    setWizardStep(2);
    setIsLinkedMember(!!d.member_id);
    setSelectedMemberId(d.member_id || '');
    setDeceasedName(d.deceased_name);
    setFatherOrHusbandName(d.father_or_husband_name || '');
    setDateOfDeath(d.date_of_death || new Date().toISOString().split('T')[0]);
    setTimeOfDeath('');
    setBurialDate(d.burial_date || '');
    setBurialTime(d.burial_time || '');
    setBurialLocation('');
    setPlaceOfDeath(d.place_of_death || 'Hospital');
    setAge(d.age !== null ? d.age : '');
    setGender(d.gender || 'male');
    setAddress(d.address || '');
    setWardOrArea(d.ward_or_area || '');
    setCauseOfDeath(d.cause_of_death || '');
    setCertificateNumber('');
    setMedicallyCertified(d.medically_certified);
    setCertifierName(d.certifier_name || '');
    setNotes(d.notes || '');
    setIsAddDrawerOpen(true);
  };

  const handleSave = async () => {
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
        place_of_death: placeOfDeath || null,
        age: age !== '' ? Number(age) : null,
        gender: gender,
        address: address.trim() || null,
        ward_or_area: wardOrArea.trim() || null,
        cause_of_death: causeOfDeath.trim() || null,
        medically_certified: medicallyCertified,
        certifier_name: medicallyCertified ? certifierName.trim() || null : null,
        notes: notes.trim() || (certificateNumber ? `DC-${certificateNumber}` : null),
        certificate_url: null,
        created_by: null,
      };

      if (modalMode === 'add') {
        await db.deaths.create(payload);
        if (isLinkedMember && selectedMemberId) {
          await db.members.update(selectedMemberId, { status: 'inactive' });
        }
        showToast('success', 'Death record created successfully');
      } else if (currentId) {
        await db.deaths.update(currentId, payload);
        showToast('success', 'Death record updated successfully');
      }

      setIsAddDrawerOpen(false);
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
    if (!window.confirm('Are you sure you want to delete this death record? This action cannot be undone.')) return;
    try {
      await db.deaths.delete(id);
      showToast('success', 'Death record deleted');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete record');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredDeaths.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDeaths.map((d) => d.id));
    }
  };

  const handleSelectIndividual = (id: string) => {
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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedYearId('');
    setSelectedWard('');
    setSelectedGender('');
    setSelectedCertStatus('');
    setSelectedPlace('');
  };

  const exportCSV = () => {
    if (filteredDeaths.length === 0) {
      showToast('error', 'No records to export');
      return;
    }
    const headers = ['Deceased Name', 'Member ID', 'Father/Husband', 'Date of Death', 'Age', 'Gender', 'Place of Death', 'Cause of Death', 'Ward'];
    const rows = filteredDeaths.map((d) => [
      d.deceased_name,
      d.member_id || 'N/A',
      d.father_or_husband_name || 'N/A',
      d.date_of_death,
      d.age ?? 'N/A',
      d.gender || 'N/A',
      d.place_of_death || 'N/A',
      d.cause_of_death || 'N/A',
      d.ward_or_area || 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `death_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Death records exported to CSV');
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

      {/* 1. PAGE HEADER */}
      <div className="page-header flex-between margin-bottom">
        <div>
          <h1 className="page-title">Death Records</h1>
          <p className="page-subtitle">Manage and maintain deceased member records, family information, death certificates, and related details.</p>
        </div>

        <div className="header-cta-group flex-row-gap-sm">
          <button className="pill-btn-ghost font-xs" onClick={exportCSV}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button className="add-btn primary-btn" onClick={openAddDrawer}>
            <Plus size={16} />
            <span>Record Death</span>
          </button>
        </div>
      </div>

      {/* 2. DASHBOARD SUMMARY CARDS (5 RESPONSIVE METRIC CARDS) */}
      <div className="stats-dashboard-grid-5 margin-bottom">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="stat-metric-card shadow-sm">
                <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
                <div className="metric-info margin-left-xs">
                  <div className="skeleton-pulse" style={{ width: '80px', height: '12px' }}></div>
                  <div className="skeleton-pulse margin-top-xs" style={{ width: '100px', height: '22px' }}></div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box emerald">
                <FileText size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Deaths</span>
                <h3 className="metric-value">{metrics.total}</h3>
                <span className="metric-sub">All recorded deaths</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box green">
                <Calendar size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">This Year</span>
                <h3 className="metric-value">{metrics.thisYear}</h3>
                <span className="metric-sub">Recorded in {metrics.currentYearNum}</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box teal">
                <CalendarDays size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">This Month</span>
                <h3 className="metric-value">{metrics.thisMonth}</h3>
                <span className="metric-sub">Recorded this month</span>
              </div>
            </div>

            <div className="stat-metric-card warning-card shadow-sm">
              <div className="metric-icon-box warning">
                <FileWarning size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label text-warning">Pending Certs</span>
                <h3 className="metric-value text-warning">{metrics.pendingCertificates}</h3>
                <span className="metric-sub">Without certificate</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box primary">
                <Clock size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Recent Deaths</span>
                <h3 className="metric-value text-primary">{metrics.recentDeaths}</h3>
                <span className="metric-sub">Last 30 days</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. UNIFIED WORKSPACE MAIN CONTAINER */}
      <div className="workspace-unified-card animate-fade-in">
        {/* SEARCH & FILTER TOOLBAR */}
        <div className="workspace-filter-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, member ID, family ID, certificate number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Desktop Filters */}
          <div className="filter-selectors-grid desktop-filters-only">
            <YearFilter selectedYearId={selectedYearId} onChange={setSelectedYearId} showAllOption={true} />

            <div className="filter-select-wrapper">
              <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
                <option value="">Ward: All</option>
                {uniqueWards.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)}>
                <option value="">Gender: All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select value={selectedCertStatus} onChange={(e) => setSelectedCertStatus(e.target.value)}>
                <option value="">Certificate: All</option>
                <option value="available">Available</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {(searchQuery || selectedYearId || selectedWard || selectedGender || selectedCertStatus || selectedPlace) && (
              <button className="clear-filters-link" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>

          {/* Mobile Filter Trigger */}
          <div className="mobile-filter-trigger">
            <button className="pill-btn-secondary" onClick={() => setIsMobileFilterOpen(true)}>
              <Filter size={15} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bulk-selection-bar flex-between p-xs bg-primary-light border-rounded margin-sm">
            <span className="font-weight-600 font-sm">{selectedIds.length} selected</span>
            <button className="pill-btn-danger font-xs" onClick={() => setIsBulkDeleteModalOpen(true)}>
              <Trash2 size={13} /> Delete Selected
            </button>
          </div>
        )}

        {/* WORKSPACE DIRECTORY CONTENT */}
        <div className="workspace-table-content">
          {fetchError ? (
            <div className="empty-state-card">
              <div className="empty-state-icon neutral">
                <AlertCircle size={32} className="text-danger" />
              </div>
              <h4>Unable to load death records</h4>
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
          ) : filteredDeaths.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon emerald">
                <UserX size={28} />
              </div>
              <h4>No death records found</h4>
              <p>
                {searchQuery || selectedYearId || selectedWard || selectedGender || selectedCertStatus
                  ? 'No records match your current filters. Try clearing filters.'
                  : 'Record a deceased member to keep your Mahall records complete and up to date.'}
              </p>
              {searchQuery || selectedYearId || selectedWard || selectedGender || selectedCertStatus ? (
                <button className="clear-filters-link margin-top-xs" onClick={clearFilters}>
                  Clear Filters
                </button>
              ) : (
                <button className="add-btn primary-btn margin-top-sm" onClick={openAddDrawer}>
                  <Plus size={16} />
                  <span>Record Death</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP DIRECTORY TABLE */}
              <div className="table-responsive desktop-view-only">
                <table className="subscriptions-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredDeaths.length && filteredDeaths.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={{ textAlign: 'left' }}>Deceased</th>
                      <th style={{ textAlign: 'left' }}>Member ID / House</th>
                      <th style={{ textAlign: 'left' }}>Date of Death</th>
                      <th style={{ textAlign: 'left' }}>Age & Gender</th>
                      <th style={{ textAlign: 'left' }}>Death Place</th>
                      <th style={{ textAlign: 'left' }}>Certificate</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeaths.map((d) => {
                      const isSelected = selectedIds.includes(d.id);
                      const linkedMem = members.find((m) => m.id === d.member_id);
                      const linkedHouse = linkedMem ? households.find((h) => h.id === linkedMem.household_id) : null;
                      const isCertAvailable = !!d.certificate_url || d.medically_certified || (d.notes && d.notes.includes('DC-'));

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
                              <div className="donor-avatar-circle avatar-anon">
                                {d.deceased_name ? d.deceased_name.charAt(0).toUpperCase() : 'D'}
                              </div>
                              <div>
                                <div className="font-weight-600 text-dark">{d.deceased_name}</div>
                                <span className="font-xs color-subtle">{d.father_or_husband_name || 'Relative'}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <div>
                              <div className="font-weight-600 font-xs text-dark">{d.member_id ? d.member_id.substring(0, 8) : (linkedMem ? linkedMem.id.substring(0, 8) : 'Non-Member')}</div>
                              <span className="font-xs color-subtle">{linkedHouse ? `House: ${linkedHouse.house_number}` : (d.ward_or_area || 'Mahall Area')}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className="font-xs font-weight-600">{d.date_of_death}</span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <div>
                              <div className="font-weight-600 font-xs">{d.age !== null ? `${d.age} yrs` : 'N/A'}</div>
                              <span className="font-xs color-subtle">{d.gender ? d.gender.toUpperCase() : 'MALE'}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className="method-pill font-xs">{d.place_of_death || 'Hospital'}</span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            {isCertAvailable ? (
                              <span className="status-badge-dot success">
                                <span className="dot"></span> Available
                              </span>
                            ) : (
                              <span className="status-badge-dot warning">
                                <span className="dot"></span> Pending
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-row-buttons flex-end gap-xs">
                              <button
                                className="icon-btn-ghost"
                                title="View Details"
                                onClick={() => {
                                  setSelectedDeathRecord(d);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="icon-btn-ghost"
                                title="Edit Record"
                                onClick={(e) => openEditDrawer(d, e)}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="icon-btn-ghost danger"
                                title="Delete Record"
                                onClick={(e) => handleDelete(d.id, e)}
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

              {/* MOBILE STACKED CARDS VIEW (<768px) */}
              <div className="mobile-ledger-cards-list mobile-view-only padding-md">
                {filteredDeaths.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  const linkedMem = members.find((m) => m.id === d.member_id);
                  const linkedHouse = linkedMem ? households.find((h) => h.id === linkedMem.household_id) : null;
                  const isCertAvailable = !!d.certificate_url || d.medically_certified || (d.notes && d.notes.includes('DC-'));

                  return (
                    <div key={d.id} className={`mobile-ledger-card ${isSelected ? 'selected' : ''}`}>
                      <div className="mobile-card-top flex-between">
                        <div className="flex-row-gap-sm">
                          <div className="donor-avatar-circle sm avatar-anon">
                            {d.deceased_name ? d.deceased_name.charAt(0).toUpperCase() : 'D'}
                          </div>
                          <div>
                            <div className="font-weight-700 font-sm text-dark">{d.deceased_name}</div>
                            <span className="font-xs color-subtle">{d.member_id ? d.member_id.substring(0, 8) : (linkedMem ? linkedMem.id.substring(0, 8) : 'Non-Member')}</span>
                          </div>
                        </div>
                        {isCertAvailable ? (
                          <span className="status-badge-dot success"><span className="dot"></span> Available</span>
                        ) : (
                          <span className="status-badge-dot warning"><span className="dot"></span> Pending</span>
                        )}
                      </div>

                      <div className="mobile-card-middle flex-between margin-top-sm pt-xs border-top-light font-xs">
                        <div>
                          <div>📅 <strong>Death:</strong> {d.date_of_death}</div>
                          <div className="color-subtle">👤 {d.age ? `${d.age} yrs` : 'N/A'} • {d.gender ? d.gender.toUpperCase() : 'MALE'}</div>
                        </div>
                        <div className="text-right">
                          <div>🏥 {d.place_of_death || 'Hospital'}</div>
                          <div className="color-subtle">{linkedHouse ? `H-${linkedHouse.house_number}` : (d.ward_or_area || 'Mahall')}</div>
                        </div>
                      </div>

                      <div className="mobile-card-actions flex-end gap-xs margin-top-xs pt-xs border-top-light">
                        <button
                          className="pill-btn-ghost font-xs"
                          onClick={() => {
                            setSelectedDeathRecord(d);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye size={13} /> Details →
                        </button>
                        <button className="pill-btn-ghost font-xs" onClick={(e) => openEditDrawer(d, e)}>
                          <Edit2 size={13} /> Edit
                        </button>
                        <button className="pill-btn-danger font-xs" onClick={(e) => handleDelete(d.id, e)}>
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
      </div>

      {/* 4. MULTI-STEP RECORD DEATH WIZARD DRAWER / MODAL */}
      {isAddDrawerOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div>
                <h4>{modalMode === 'add' ? 'Record Deceased Member' : 'Edit Death Record'}</h4>
                <p className="modal-subtitle">Follow the wizard steps to capture complete death and family information.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAddDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* STEPPER HEADER BAR */}
            <div className="wizard-stepper-bar">
              <div className={`wizard-step-item ${wizardStep === 1 ? 'active' : wizardStep > 1 ? 'completed' : ''}`}>
                <div className="wizard-step-badge">{wizardStep > 1 ? <Check size={13} /> : '1'}</div>
                <span>Member</span>
              </div>
              <div className={`wizard-step-line ${wizardStep > 1 ? 'active' : ''}`}></div>

              <div className={`wizard-step-item ${wizardStep === 2 ? 'active' : wizardStep > 2 ? 'completed' : ''}`}>
                <div className="wizard-step-badge">{wizardStep > 2 ? <Check size={13} /> : '2'}</div>
                <span>Death Details</span>
              </div>
              <div className={`wizard-step-line ${wizardStep > 2 ? 'active' : ''}`}></div>

              <div className={`wizard-step-item ${wizardStep === 3 ? 'active' : wizardStep > 3 ? 'completed' : ''}`}>
                <div className="wizard-step-badge">{wizardStep > 3 ? <Check size={13} /> : '3'}</div>
                <span>Burial Details</span>
              </div>
              <div className={`wizard-step-line ${wizardStep > 3 ? 'active' : ''}`}></div>

              <div className={`wizard-step-item ${wizardStep === 4 ? 'active' : ''}`}>
                <div className="wizard-step-badge">4</div>
                <span>Review</span>
              </div>
            </div>

            <div className="modal-body-scrollable">
              {/* STEP 1: SELECT DECEASED MEMBER */}
              {wizardStep === 1 && (
                <div className="animate-fade-in flex-col gap-sm">
                  <div className="form-group">
                    <label className="form-label">Search Member Database *</label>
                    <div className="search-box">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search member by name, ID, phone, or house number..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="member-search-cards-list margin-top-xs">
                    {searchableMembers.map((m) => {
                      const house = households.find((h) => h.id === m.household_id);
                      const isSel = selectedMemberId === m.id;

                      return (
                        <div
                          key={m.id}
                          className={`member-select-card ${isSel ? 'selected' : ''}`}
                          onClick={() => handleSelectMember(m.id)}
                        >
                          <div className="flex-row-gap-sm">
                            <div className="donor-avatar-circle sm avatar-member">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-weight-700 font-sm text-dark">{m.name}</div>
                              <span className="font-xs color-subtle">
                                ID: {m.id.substring(0, 8)} • {house ? `House: ${house.house_number}` : 'No House'}
                              </span>
                            </div>
                          </div>
                          <button className={`pill-btn-ghost font-xs ${isSel ? 'bg-success text-white' : ''}`}>
                            {isSel ? 'Selected ✓' : 'Select'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="toggle-switch-row margin-top-sm border-top pt-sm">
                    <label className="checkbox-label flex-row-gap-xs font-xs font-weight-600 color-subtle">
                      <input
                        type="checkbox"
                        checked={!isLinkedMember}
                        onChange={(e) => {
                          setIsLinkedMember(!e.target.checked);
                          if (e.target.checked) setSelectedMemberId('');
                        }}
                      />
                      <span>Deceased person is an unlinked / external non-member</span>
                    </label>
                  </div>

                  {!isLinkedMember && (
                    <div className="form-row-2col margin-top-xs">
                      <div className="form-group">
                        <label className="form-label">Deceased Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={deceasedName}
                          onChange={(e) => setDeceasedName(e.target.value)}
                          placeholder="Full Name"
                        />
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
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DEATH DETAILS */}
              {wizardStep === 2 && (
                <div className="animate-fade-in flex-col gap-sm">
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Date of Death *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={dateOfDeath}
                        onChange={(e) => setDateOfDeath(e.target.value)}
                      />
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
                  </div>

                  <div className="form-row-2col">
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
                        <option value="Natural">Natural</option>
                        <option value="Illness">Illness / Disease</option>
                        <option value="Accident">Accident</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row-2col">
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
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Death Certificate Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={certificateNumber}
                      onChange={(e) => setCertificateNumber(e.target.value)}
                      placeholder="e.g. DC-2026-00124"
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label flex-row-gap-xs font-xs font-weight-600">
                      <input
                        type="checkbox"
                        checked={medicallyCertified}
                        onChange={(e) => setMedicallyCertified(e.target.checked)}
                      />
                      <span>Medically Certified Record</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: BURIAL DETAILS */}
              {wizardStep === 3 && (
                <div className="animate-fade-in flex-col gap-sm">
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Burial Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={burialDate}
                        onChange={(e) => setBurialDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Burial Time</label>
                      <input
                        type="time"
                        className="form-control"
                        value={burialTime}
                        onChange={(e) => setBurialTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Burial Location / Qabar Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={burialLocation}
                      onChange={(e) => setBurialLocation(e.target.value)}
                      placeholder="e.g. Central Mahall Qabarstan, Plot B-14"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes & Remarks</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional family or medical notes..."
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & CONFIRM */}
              {wizardStep === 4 && (
                <div className="animate-fade-in flex-col gap-sm">
                  <div className="details-section-card bg-primary-light">
                    <div className="details-section-title text-primary">Deceased Summary</div>
                    <div className="details-grid-2col">
                      <div>
                        <div className="detail-item-label">Deceased Name</div>
                        <div className="detail-item-value">{deceasedName || 'Not specified'}</div>
                      </div>
                      <div>
                        <div className="detail-item-label">Date of Death</div>
                        <div className="detail-item-value">{dateOfDeath}</div>
                      </div>
                      <div>
                        <div className="detail-item-label">Age & Gender</div>
                        <div className="detail-item-value">{age ? `${age} yrs` : 'N/A'} • {gender.toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="detail-item-label">Place of Death</div>
                        <div className="detail-item-value">{placeOfDeath}</div>
                      </div>
                    </div>
                  </div>

                  <div className="details-section-card">
                    <div className="details-section-title">Burial & Certificate Review</div>
                    <div className="details-grid-2col">
                      <div>
                        <div className="detail-item-label">Burial Date</div>
                        <div className="detail-item-value">{burialDate || 'Not specified'}</div>
                      </div>
                      <div>
                        <div className="detail-item-label">Certificate Status</div>
                        <div className="detail-item-value text-success">
                          {medicallyCertified || certificateNumber ? 'Available 🟢' : 'Pending 🟠'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WIZARD FOOTER ACTION BUTTONS */}
            <div className="modal-footer flex-between">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  className="pill-btn-ghost"
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  className="pill-btn-ghost"
                  onClick={() => setIsAddDrawerOpen(false)}
                >
                  Cancel
                </button>
              )}

              {wizardStep < 4 ? (
                <button
                  type="button"
                  className="pill-btn-primary"
                  onClick={() => {
                    if (wizardStep === 1 && !deceasedName.trim() && !selectedMemberId) {
                      showToast('error', 'Please select or enter deceased member name');
                      return;
                    }
                    setWizardStep((prev) => (prev + 1) as any);
                  }}
                >
                  <span>Continue</span>
                  <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="pill-btn-primary"
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? <Loader2 size={16} className="spinner" /> : 'Save Death Record'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. RECORD DETAILS DRAWER */}
      {isDetailsOpen && selectedDeathRecord && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h4>{selectedDeathRecord.deceased_name}</h4>
                <p className="modal-subtitle">
                  Member ID: {selectedDeathRecord.member_id || 'External Non-Member'}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDetailsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-scrollable">
              {/* SECTION 1: PERSONAL INFORMATION */}
              <div className="details-section-card">
                <div className="details-section-title">
                  <User size={15} /> Section 1 — Personal Information
                </div>
                <div className="details-grid-2col">
                  <div>
                    <div className="detail-item-label">Full Name</div>
                    <div className="detail-item-value">{selectedDeathRecord.deceased_name}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Relative Name</div>
                    <div className="detail-item-value">{selectedDeathRecord.father_or_husband_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Age at Death</div>
                    <div className="detail-item-value">{selectedDeathRecord.age ? `${selectedDeathRecord.age} years` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Gender</div>
                    <div className="detail-item-value">{selectedDeathRecord.gender ? selectedDeathRecord.gender.toUpperCase() : 'MALE'}</div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DEATH INFORMATION */}
              <div className="details-section-card">
                <div className="details-section-title">
                  <Calendar size={15} /> Section 2 — Death Information
                </div>
                <div className="details-grid-2col">
                  <div>
                    <div className="detail-item-label">Date of Death</div>
                    <div className="detail-item-value">{selectedDeathRecord.date_of_death}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Place of Death</div>
                    <div className="detail-item-value">{selectedDeathRecord.place_of_death || 'Hospital'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Cause of Death</div>
                    <div className="detail-item-value">{selectedDeathRecord.cause_of_death || 'Natural'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Medical Certification</div>
                    <div className="detail-item-value">
                      {selectedDeathRecord.medically_certified ? 'Yes (Certified)' : 'Uncertified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: CERTIFICATE CARD */}
              <div className="details-section-card bg-primary-light">
                <div className="details-section-title text-primary">
                  <FileText size={15} /> Death Certificate Section
                </div>
                <div className="flex-between margin-top-xs">
                  <div>
                    <div className="detail-item-label">Certificate Status</div>
                    <div className="font-weight-700 text-success">🟢 Certificate Available</div>
                  </div>
                  <div className="flex-row-gap-xs">
                    <button className="pill-btn-ghost font-xs" onClick={() => window.print()}>
                      <Printer size={13} /> Print
                    </button>
                    <button className="pill-btn-primary font-xs" onClick={exportCSV}>
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="pill-btn-ghost" onClick={() => setIsDetailsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FILTER DRAWER SHEET */}
      {isMobileFilterOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h4>Filter Death Records</h4>
              <button className="modal-close-btn" onClick={() => setIsMobileFilterOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body-scrollable">
              <div className="form-group">
                <label className="form-label">Subscription Year</label>
                <YearFilter selectedYearId={selectedYearId} onChange={setSelectedYearId} showAllOption={true} />
              </div>
              <div className="form-group">
                <label className="form-label">Ward / Area</label>
                <select className="form-control" value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
                  <option value="">All Wards</option>
                  {uniqueWards.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)}>
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div className="modal-footer flex-between">
              <button className="pill-btn-ghost" onClick={() => { clearFilters(); setIsMobileFilterOpen(false); }}>
                Reset
              </button>
              <button className="pill-btn-primary" onClick={() => setIsMobileFilterOpen(false)}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h4>Delete Death Records</h4>
              <button className="modal-close-btn" onClick={() => setIsBulkDeleteModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body-scrollable">
              <p className="font-sm text-dark">
                Are you sure you want to permanently delete {selectedIds.length} selected death records? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer flex-between">
              <button className="pill-btn-ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="pill-btn-primary bg-danger" onClick={handleBulkDelete}>
                Delete Records
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EMBEDDED STYLES FOR ABSOLUTE DESIGN CONSISTENCY */}
      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
        .page-title { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
        .page-subtitle { font-size: 13.5px; color: #6b7280; margin-top: 4px; }
        .header-cta-group { display: flex; align-items: center; gap: 10px; }

        .search-box { position: relative; display: flex; align-items: center; width: 100%; }
        .search-box .search-icon { position: absolute; left: 14px !important; color: #9ca3af; pointer-events: none; z-index: 2; }
        .search-box input { padding-left: 42px !important; box-sizing: border-box !important; }

        .checkbox-label { display: flex !important; align-items: center !important; gap: 10px !important; font-size: 13px !important; color: #374151 !important; cursor: pointer !important; user-select: none !important; margin: 0 !important; }
        .checkbox-label input[type="checkbox"] { width: 17px !important; height: 17px !important; accent-color: #00966b !important; cursor: pointer !important; margin: 0 !important; flex-shrink: 0 !important; }

        .pill-btn-danger { padding: 8px 16px !important; border-radius: 9999px !important; background: #fee2e2 !important; border: 1px solid #fca5a5 !important; color: #991b1b !important; font-weight: 700 !important; font-size: 12.5px !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 6px !important; transition: all 0.2s ease !important; }
        .pill-btn-danger:hover { background: #fecaca !important; color: #7f1d1d !important; }

        @media (min-width: 768px) {
          .desktop-view-only { display: block !important; }
          .mobile-view-only, .mobile-ledger-cards-list, .mobile-cards-directory { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-view-only { display: none !important; }
          .mobile-view-only, .mobile-ledger-cards-list, .mobile-cards-directory { display: flex !important; flex-direction: column !important; }
          .desktop-filters-only { display: none !important; }
          .page-header { flex-direction: column; align-items: stretch; }
          .header-cta-group { flex-direction: column; align-items: stretch; width: 100%; }
        }

        .action-row-buttons { display: flex !important; align-items: center !important; gap: 6px !important; justify-content: flex-end !important; }
        .icon-btn-ghost {
          width: 32px !important; height: 32px !important; border-radius: 8px !important;
          background: transparent !important; border: none !important; color: #6b7280 !important;
          display: inline-flex !important; align-items: center !important; justify-content: center !important;
          cursor: pointer !important; transition: all 0.2s ease !important; outline: none !important; padding: 0 !important;
        }
        .icon-btn-ghost:hover { background: #f3f4f6 !important; color: #111827 !important; }
        .icon-btn-ghost.danger:hover { background: #fee2e2 !important; color: #ef4444 !important; }
      `}</style>
    </div>
  );
};

export default Deaths;
