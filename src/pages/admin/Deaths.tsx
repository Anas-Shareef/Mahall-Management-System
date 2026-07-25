import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { DeathRecord, Member, Household, SubscriptionYear } from '../../services/db';
import { 
  UserX, Plus, Search, Trash2, Edit2, Eye, CheckCircle, AlertCircle, 
  X, Loader2, Calendar, CalendarDays, FileWarning, Download, 
  Filter, ChevronRight, User, Printer, RefreshCw, FileText, Check,
  Home, Building2, ChevronLeft, Award, QrCode
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { Modal } from '../../components/Modal';

export const Deaths: React.FC = () => {

  // Data States
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedCertStatus, setSelectedCertStatus] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<string>('');
  const [selectedCause, setSelectedCause] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // Certificate Modal State
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [certificateRecord, setCertificateRecord] = useState<DeathRecord | null>(null);

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
  const [placeOfDeath, setPlaceOfDeath] = useState<'Hospital' | 'Home' | 'Other' | string>('Hospital');
  const [facilityName, setFacilityName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [address, setAddress] = useState('');
  const [wardOrArea, setWardOrArea] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('Natural');
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
      showToast('error', 'Failed to load death records from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute 6 Dashboard Summary Cards
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

    const hospitalDeaths = deaths.filter((d) => (d.place_of_death || 'Hospital').toLowerCase() === 'hospital').length;
    const homeDeaths = deaths.filter((d) => (d.place_of_death || '').toLowerCase() === 'home').length;
    const pendingCertificates = deaths.filter((d) => !d.certificate_url && !d.medically_certified && !d.notes?.includes('DC-')).length;

    return { total, thisYear, thisMonth, hospitalDeaths, homeDeaths, pendingCertificates, currentYearNum };
  }, [deaths, years, selectedYearId]);

  // Filtered & Sorted death list
  const filteredDeaths = useMemo(() => {
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    let result = deaths.filter((d) => {
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
      const matchCause = !selectedCause || (d.cause_of_death && d.cause_of_death.toLowerCase() === selectedCause.toLowerCase());

      return matchSearch && matchYear && matchWard && matchGender && matchCert && matchPlace && matchCause;
    });

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.date_of_death).getTime() - new Date(a.date_of_death).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.date_of_death).getTime() - new Date(b.date_of_death).getTime());
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.deceased_name.localeCompare(b.deceased_name));
    }

    return result;
  }, [deaths, searchQuery, selectedYearId, selectedWard, selectedGender, selectedCertStatus, selectedPlace, selectedCause, sortBy, years]);

  // Paginated death list
  const totalPages = Math.ceil(filteredDeaths.length / rowsPerPage) || 1;
  const paginatedDeaths = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDeaths.slice(start, start + rowsPerPage);
  }, [filteredDeaths, currentPage, rowsPerPage]);

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
    setFacilityName('');
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
    setFacilityName('');
    setAge(d.age !== null ? d.age : '');
    setGender(d.gender || 'male');
    setAddress(d.address || '');
    setWardOrArea(d.ward_or_area || '');
    setCauseOfDeath(d.cause_of_death || 'Natural');
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
        const createdRecord = await db.deaths.create(payload);
        if (isLinkedMember && selectedMemberId) {
          await db.members.update(selectedMemberId, { status: 'inactive' });
        }
        setSelectedDeathRecord(createdRecord);
        showToast('success', 'Death record created successfully in Supabase');
      } else if (currentId) {
        const updatedRecord = await db.deaths.update(currentId, payload);
        setSelectedDeathRecord(updatedRecord);
        showToast('success', 'Death record updated successfully in Supabase');
      }

      setWizardStep(4); // Advance to Step 4 Success View
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
      showToast('success', 'Death record deleted from Supabase');
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete record');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedDeaths.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedDeaths.map((d) => d.id));
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
    setSelectedCause('');
    setSortBy('newest');
    setCurrentPage(1);
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

  const openCertificateModal = (d: DeathRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCertificateRecord(d);
    setIsCertificateModalOpen(true);
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
          <p className="page-subtitle">Manage deceased member records, family links, death certificates, and Supabase audit logs.</p>
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

      {/* 2. DASHBOARD SUMMARY CARDS (6 RESPONSIVE METRIC CARDS) */}
      <div className="stats-dashboard-grid-6 margin-bottom">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="stat-metric-card shadow-sm">
                <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
                <div className="metric-info margin-left-xs">
                  <div className="skeleton-pulse" style={{ width: '70px', height: '12px' }}></div>
                  <div className="skeleton-pulse margin-top-xs" style={{ width: '90px', height: '22px' }}></div>
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

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box primary">
                <Building2 size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Hospital Deaths</span>
                <h3 className="metric-value text-primary">{metrics.hospitalDeaths}</h3>
                <span className="metric-sub">At hospital facility</span>
              </div>
            </div>

            <div className="stat-metric-card shadow-sm">
              <div className="metric-icon-box purple">
                <Home size={22} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Home Deaths</span>
                <h3 className="metric-value">{metrics.homeDeaths}</h3>
                <span className="metric-sub">Occurred at home</span>
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
              placeholder="Search member name, ID, house #, certificate #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Desktop Filter Chips */}
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

            <div className="filter-select-wrapper">
              <select value={selectedPlace} onChange={(e) => setSelectedPlace(e.target.value)}>
                <option value="">Place: All</option>
                <option value="Hospital">Hospital</option>
                <option value="Home">Home</option>
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="name">Sort: Name A-Z</option>
              </select>
            </div>

            {(searchQuery || selectedYearId || selectedWard || selectedGender || selectedCertStatus || selectedPlace || selectedCause) && (
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
          ) : paginatedDeaths.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon emerald">
                <UserX size={28} />
              </div>
              <h4>No death records found</h4>
              <p>
                {searchQuery || selectedYearId || selectedWard || selectedGender || selectedCertStatus || selectedPlace || selectedCause
                  ? 'No records match your current search and filters. Try clearing filters.'
                  : 'Record a deceased member to maintain complete and accurate Mahall database records.'}
              </p>
              {searchQuery || selectedYearId || selectedWard || selectedGender || selectedCertStatus || selectedPlace || selectedCause ? (
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
                          checked={selectedIds.length === paginatedDeaths.length && paginatedDeaths.length > 0}
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
                    {paginatedDeaths.map((d) => {
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
                                className="icon-btn-ghost text-primary"
                                title="Generate Certificate"
                                onClick={(e) => openCertificateModal(d, e)}
                              >
                                <Award size={15} />
                              </button>
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
                {paginatedDeaths.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  const linkedMem = members.find((m) => m.id === d.member_id);
                  const linkedHouse = linkedMem ? households.find((h) => h.id === linkedMem.household_id) : null;
                  const isCertAvailable = !!d.certificate_url || d.medically_certified || (d.notes && d.notes.includes('DC-'));

                  return (
                    <div key={d.id} className={`mobile-ledger-card ${isCertAvailable ? '' : 'pending-cert'} ${isSelected ? 'selected' : ''}`}>
                      {/* Top Row: Name & Status Badge */}
                      <div className="mobile-card-top flex-between">
                        <div className="flex-row-gap-sm">
                          <div className="donor-avatar-circle sm avatar-anon">
                            {d.deceased_name ? d.deceased_name.charAt(0).toUpperCase() : 'D'}
                          </div>
                          <div>
                            <div className="font-weight-800 font-sm text-dark">{d.deceased_name}</div>
                            <span className="font-xs color-subtle">{d.father_or_husband_name ? `Relative: ${d.father_or_husband_name}` : 'Mahall Record'}</span>
                          </div>
                        </div>

                        {isCertAvailable ? (
                          <span className="status-badge-dot success"><span className="dot"></span> Available</span>
                        ) : (
                          <span className="status-badge-dot warning"><span className="dot"></span> Pending</span>
                        )}
                      </div>

                      {/* Sub-Header Chips Line */}
                      <div className="card-metadata-chips-row">
                        <span className="meta-chip">📅 {d.date_of_death}</span>
                        <span className="meta-chip">🏥 {d.place_of_death || 'Hospital'}</span>
                        <span className="meta-chip">⚕️ {d.cause_of_death || 'Natural'}</span>
                      </div>

                      {/* Carded Info Details Container Box */}
                      <div className="card-inner-info-box font-xs">
                        <div className="flex-between">
                          <span className="color-subtle">ID / Registration:</span>
                          <strong className="text-dark">{d.member_id ? d.member_id.substring(0, 8) : (linkedMem ? linkedMem.id.substring(0, 8) : 'Non-Member')}</strong>
                        </div>
                        <div className="flex-between margin-top-xs">
                          <span className="color-subtle">Household / Ward:</span>
                          <strong className="text-dark">{linkedHouse ? `House #${linkedHouse.house_number}` : (d.ward_or_area || 'Mahall Area')}</strong>
                        </div>
                        <div className="flex-between margin-top-xs">
                          <span className="color-subtle">Age & Gender:</span>
                          <strong className="text-dark">{d.age ? `${d.age} Yrs` : 'N/A'} • {d.gender ? d.gender.toUpperCase() : 'MALE'}</strong>
                        </div>
                      </div>

                      {/* 2x2 Action Button Grid */}
                      <div className="mobile-card-actions-grid">
                        <button className="pill-btn-ghost font-xs" onClick={(e) => openCertificateModal(d, e)}>
                          <Award size={13} /> Cert
                        </button>
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

              {/* PAGINATION CONTROL BAR */}
              <div className="pagination-bar">
                <div className="font-xs color-subtle">
                  Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}</strong> to <strong>{Math.min(currentPage * rowsPerPage, filteredDeaths.length)}</strong> of <strong>{filteredDeaths.length}</strong> records
                </div>

                <div className="pagination-controls">
                  <select
                    className="rows-select-pill"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10 rows / page</option>
                    <option value={25}>25 rows / page</option>
                    <option value={50}>50 rows / page</option>
                  </select>

                  <div className="flex-row-gap-xs">
                    <button
                      className="page-pill-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    <span className="page-indicator-badge">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      className="page-pill-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. MULTI-STEP RECORD DEATH WIZARD DRAWER / MODAL */}
      <Modal
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title={modalMode === 'add' ? 'Record Deceased Member' : 'Edit Death Record'}
        subtitle="Follow the wizard steps to capture complete death and family information."
        icon={<UserX size={22} />}
        size="lg"
        footer={
          wizardStep < 4 ? (
            <div className="flex-between width-100">
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

              {wizardStep < 3 ? (
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
          ) : undefined
        }
      >
        {/* STEPPER HEADER BAR */}
        <div className="wizard-stepper-bar margin-bottom-md">
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
            <span>Review</span>
          </div>
          <div className={`wizard-step-line ${wizardStep > 3 ? 'active' : ''}`}></div>

          <div className={`wizard-step-item ${wizardStep === 4 ? 'active' : ''}`}>
            <div className="wizard-step-badge">4</div>
            <span>Complete</span>
          </div>
        </div>

        {/* STEP 1: MEMBER SELECTION */}
        {wizardStep === 1 && (
          <div className="animate-fade-in flex-col gap-sm">
            <div className="form-group">
              <label className="form-label">Search Registered Member Database *</label>
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search member by name, ID, phone..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="member-search-cards-list">
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
                          ID: {m.id.substring(0, 8)} • {house ? `House #${house.house_number}` : 'No House'}
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

            <div className="form-group margin-top-xs">
              <label className="form-label">Deceased Name (Or Non-Member Name) *</label>
              <input
                type="text"
                className="form-control"
                value={deceasedName}
                onChange={(e) => setDeceasedName(e.target.value)}
                placeholder="Full name of deceased person"
              />
            </div>
          </div>
        )}

        {/* STEP 2: MEDICAL & BURIAL DETAILS */}
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
                <label className="form-label">Age at Death</label>
                <input
                  type="number"
                  className="form-control"
                  value={age}
                  onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 68"
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

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Place of Death</label>
                <input
                  type="text"
                  className="form-control"
                  value={placeOfDeath}
                  onChange={(e) => setPlaceOfDeath(e.target.value)}
                  placeholder="e.g. City Hospital / Residence"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cause of Death</label>
                <input
                  type="text"
                  className="form-control"
                  value={causeOfDeath}
                  onChange={(e) => setCauseOfDeath(e.target.value)}
                  placeholder="e.g. Natural causes / Cardiac arrest"
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Burial Location / Cemetery</label>
                <input
                  type="text"
                  className="form-control"
                  value={burialLocation}
                  onChange={(e) => setBurialLocation(e.target.value)}
                  placeholder="e.g. Central Mahall Qabristan"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Facility / Hospital Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="e.g. City General Hospital"
                />
              </div>
            </div>

            <div className="form-group">
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
        )}

        {/* STEP 3: REVIEW SUMMARY */}
        {wizardStep === 3 && (
          <div className="animate-fade-in flex-col gap-sm">
            <div className="details-section-card">
              <div className="details-section-title">Deceased Person Summary</div>
              <div className="details-grid-2col font-xs">
                <div><strong>Name:</strong> {deceasedName}</div>
                <div><strong>Date of Death:</strong> {dateOfDeath}</div>
                <div><strong>Age & Gender:</strong> {age ? `${age} Yrs` : 'N/A'} • {gender.toUpperCase()}</div>
                <div><strong>Place:</strong> {placeOfDeath || 'N/A'}</div>
                <div><strong>Cause:</strong> {causeOfDeath || 'N/A'}</div>
                <div><strong>Medical Cert:</strong> {medicallyCertified ? 'Yes ✓' : 'Pending'}</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS VIEW */}
        {wizardStep === 4 && (
          <div className="animate-fade-in success-wizard-container">
            <div className="success-animated-badge">
              <CheckCircle size={40} />
            </div>
            <h3 className="font-weight-800 text-dark">Death Record Saved Successfully!</h3>
            <p className="font-sm color-subtle margin-top-xs">
              The death record for <strong>{deceasedName}</strong> has been saved and linked member status updated to inactive.
            </p>

            <div className="flex-row-center gap-sm margin-top-md">
              {selectedDeathRecord && (
                <button className="pill-btn-primary" onClick={() => openCertificateModal(selectedDeathRecord)}>
                  <Award size={16} /> View Death Certificate
                </button>
              )}
              <button className="pill-btn-ghost" onClick={() => setIsAddDrawerOpen(false)}>
                Back to Directory List
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 5. OFFICIAL PRINTABLE DEATH CERTIFICATE MODAL */}
      <Modal
        isOpen={isCertificateModalOpen && !!certificateRecord}
        onClose={() => setIsCertificateModalOpen(false)}
        title="Official Death Certificate"
        subtitle="Certified document generated from Mahall Management System."
        icon={<Award size={22} />}
        size="md"
        footer={
          <div className="flex-between width-100 no-print">
            <button className="pill-btn-ghost" onClick={() => setIsCertificateModalOpen(false)}>
              Close
            </button>
            <div className="flex-row-gap-xs">
              <button className="pill-btn-ghost" onClick={() => window.print()}>
                <Printer size={15} /> Print Certificate
              </button>
              <button className="pill-btn-primary" onClick={exportCSV}>
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
        }
      >
        {certificateRecord && (
          <div className="certificate-modal-container printable-certificate">
            <div className="certificate-header-seal">
              <div className="flex-row-gap-xs">
                <Award size={32} className="text-primary" />
                <div>
                  <div className="font-weight-800 font-sm text-dark">MAHALL MANAGEMENT SYSTEM</div>
                  <div className="font-xs color-subtle">OFFICIAL COMMUNITY RECORDS REGISTRY</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-xs font-weight-700 text-primary">CERTIFICATE NO.</div>
                <div className="font-weight-800 font-sm text-dark">
                  {certificateRecord.notes?.includes('DC-') 
                    ? certificateRecord.notes 
                    : `DC-${new Date().getFullYear()}-${certificateRecord.id.substring(0, 5).toUpperCase()}`}
                </div>
              </div>
            </div>

            <div className="certificate-title-box">
              <h2>Certificate of Death</h2>
              <p>Issued under official Mahall Committee Governance Records</p>
            </div>

            <table className="certificate-details-table">
              <tbody>
                <tr>
                  <td className="label">Deceased Person Name</td>
                  <td className="value">{certificateRecord.deceased_name}</td>
                </tr>
                <tr>
                  <td className="label">Member / Registration Code</td>
                  <td className="value">{certificateRecord.member_id ? certificateRecord.member_id.substring(0, 8) : 'External / Non-Member'}</td>
                </tr>
                <tr>
                  <td className="label">Father / Husband Name</td>
                  <td className="value">{certificateRecord.father_or_husband_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="label">Date of Death</td>
                  <td className="value">{certificateRecord.date_of_death}</td>
                </tr>
                <tr>
                  <td className="label">Age & Gender</td>
                  <td className="value">{certificateRecord.age ? `${certificateRecord.age} Years` : 'N/A'} • {certificateRecord.gender ? certificateRecord.gender.toUpperCase() : 'MALE'}</td>
                </tr>
                <tr>
                  <td className="label">Place of Death</td>
                  <td className="value">{certificateRecord.place_of_death || 'Hospital'}</td>
                </tr>
                <tr>
                  <td className="label">Cause of Death</td>
                  <td className="value">{certificateRecord.cause_of_death || 'Natural'}</td>
                </tr>
                <tr>
                  <td className="label">Medical Certification</td>
                  <td className="value">
                    {certificateRecord.medically_certified ? `Certified (${certificateRecord.certifier_name || 'Medical Officer'})` : 'Uncertified Record'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="certificate-footer-signatures">
              <div className="flex-row-gap-xs">
                <QrCode size={40} className="color-subtle" />
                <div className="font-xs color-subtle">
                  Verified Registry Record<br />
                  System Hash: {certificateRecord.id.substring(0, 12)}
                </div>
              </div>

              <div className="signature-line">
                <div className="signature-line-border">MAHALL GENERAL SECRETARY</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. RECORD DETAILS DRAWER */}
      <Modal
        isOpen={isDetailsOpen && !!selectedDeathRecord}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedDeathRecord?.deceased_name || 'Deceased Record Details'}
        subtitle={`Member ID: ${selectedDeathRecord?.member_id || 'External Non-Member'}`}
        icon={<User size={20} />}
        size="md"
        footer={
          <div className="flex-end width-100">
            <button className="pill-btn-ghost" onClick={() => setIsDetailsOpen(false)}>
              Close
            </button>
          </div>
        }
      >
        {selectedDeathRecord && (
          <>
            {/* SECTION 1: PERSONAL INFORMATION */}
            <div className="form-section-card">
              <div className="form-section-header">
                <User size={16} className="text-primary" />
                <span className="form-section-title">Personal Information</span>
              </div>
              <div className="form-grid-2col font-xs">
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
            <div className="form-section-card">
              <div className="form-section-header">
                <Calendar size={16} className="text-success" />
                <span className="form-section-title">Death Information</span>
              </div>
              <div className="form-grid-2col font-xs">
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
            <div className="form-section-card bg-primary-light">
              <div className="form-section-header">
                <FileText size={16} className="text-primary" />
                <span className="form-section-title text-primary">Death Certificate Section</span>
              </div>
              <div className="flex-between margin-top-xs">
                <div>
                  <div className="detail-item-label">Certificate Status</div>
                  <div className="font-weight-700 text-success">🟢 Certificate Available</div>
                </div>
                <div className="flex-row-gap-xs">
                  <button className="pill-btn-primary font-xs" onClick={() => openCertificateModal(selectedDeathRecord)}>
                    <Award size={13} /> View Certificate
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* MOBILE FILTER DRAWER SHEET */}
      <Modal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Death Records"
        icon={<Filter size={18} />}
        size="sm"
        footer={
          <div className="flex-between width-100">
            <button className="pill-btn-ghost" onClick={() => { clearFilters(); setIsMobileFilterOpen(false); }}>
              Reset
            </button>
            <button className="pill-btn-primary" onClick={() => setIsMobileFilterOpen(false)}>
              Apply Filters
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Subscription Year</label>
          <YearFilter selectedYearId={selectedYearId} onChange={setSelectedYearId} showAllOption={true} />
        </div>
        <div className="form-group margin-top-sm">
          <label className="form-label">Ward / Area</label>
          <select className="form-control" value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
            <option value="">All Wards</option>
            {uniqueWards.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
        <div className="form-group margin-top-sm">
          <label className="form-label">Gender</label>
          <select className="form-control" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)}>
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </Modal>

      {/* BULK DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Delete Death Records"
        icon={<Trash2 size={18} className="text-danger" />}
        size="sm"
        footer={
          <div className="flex-between width-100">
            <button className="pill-btn-ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
              Cancel
            </button>
            <button className="pill-btn-primary bg-danger" onClick={handleBulkDelete}>
              Delete Records
            </button>
          </div>
        }
      >
        <p className="font-sm text-dark">
          Are you sure you want to permanently delete {selectedIds.length} selected death records? This action cannot be undone.
        </p>
      </Modal>

      {/* EMBEDDED STYLES FOR ABSOLUTE DESIGN CONSISTENCY */}
      <style>{`
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
        .page-title { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
        .page-subtitle { font-size: 13.5px; color: #6b7280; margin-top: 4px; }
        .header-cta-group { display: flex; align-items: center; gap: 10px; }

        .stats-dashboard-grid-6 { margin-bottom: 24px !important; }

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
          .stats-dashboard-grid-6 { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }

        @media (max-width: 640px) {
          .modal-overlay { align-items: center !important; justify-content: center !important; padding: 12px !important; background: rgba(15, 23, 42, 0.65) !important; }
          .modal-dialog-card {
            border-radius: 20px !important;
            max-height: 88vh !important; width: calc(100% - 16px) !important; margin: auto !important;
            animation: popModalScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          }
        }
        @keyframes popModalScale {
          from { opacity: 0; transform: scale(0.93) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
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
