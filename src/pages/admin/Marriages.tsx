import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';
import type { MarriageRecord, Household, SubscriptionYear } from '../../services/db';
import { 
  Heart, Plus, Search, 
  Trash2, Edit2, Eye, CheckCircle, AlertCircle, 
  FileSpreadsheet, Download, Calendar, Users, MapPin, CheckCircle2
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SidePanel } from '../../components/SidePanel';
import { ExcelImportModal } from '../../components/ExcelImportModal';

export const Marriages: React.FC = () => {
  const navigate = useNavigate();

  // Data States
  const [marriages, setMarriages] = useState<MarriageRecord[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modal States
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedMarriage, setSelectedMarriage] = useState<MarriageRecord | null>(null);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [marriageList, houseList, yearList] = await Promise.all([
        db.marriages.get(),
        db.households.get(),
        db.years.get(),
      ]);
      setMarriages(marriageList);
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
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    return marriages.filter((m) => {
      const matchSearch =
        m.groom_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.bride_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.registration_number && m.registration_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchYear = !selectedYearId || !selectedYear ||
        new Date(m.nikah_date).getFullYear() === selectedYear;
      const matchWard = !selectedWard || m.groom_ward === selectedWard || m.bride_ward === selectedWard;
      const matchStatus = !selectedStatus || m.status === selectedStatus;

      return matchSearch && matchYear && matchWard && matchStatus;
    });
  }, [marriages, searchQuery, selectedYearId, selectedWard, selectedStatus, years]);

  // Overview Metrics
  const totalMarriagesCount = useMemo(() => marriages.length, [marriages]);
  const completedMarriagesCount = useMemo(() => marriages.filter((m) => m.status === 'completed').length, [marriages]);
  const externalBridesCount = useMemo(() => marriages.filter((m) => m.bride_type === 'external').length, [marriages]);
  const currentYearMarriagesCount = useMemo(() => {
    const currentYr = new Date().getFullYear();
    return marriages.filter((m) => new Date(m.nikah_date).getFullYear() === currentYr).length;
  }, [marriages]);

  const uniqueWards = useMemo(() => {
    const set = new Set<string>();
    marriages.forEach((m) => {
      if (m.groom_ward) set.add(m.groom_ward);
      if (m.bride_ward) set.add(m.bride_ward);
    });
    households.forEach((h) => { if (h.area) set.add(h.area); });
    return Array.from(set);
  }, [marriages, households]);

  const exportCSV = () => {
    if (filteredMarriages.length === 0) {
      showToast('error', 'No marriage records to export');
      return;
    }
    const headers = ['Groom Name', 'Bride Name', 'Nikah Date', 'Venue', 'Groom House', 'Officiant', 'Status'];
    const rows = filteredMarriages.map((m) => [
      m.groom_name,
      m.bride_name,
      m.nikah_date,
      m.nikah_venue || 'N/A',
      m.groom_house_number || 'N/A',
      (m as any).officiant_name || 'N/A',
      m.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marriages_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Marriage records exported to CSV');
  };

  const openAddModal = () => {
    navigate('/admin/marriages/new');
  };

  const openEditModal = (m: MarriageRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/admin/marriages/${m.id}/edit`);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await db.marriages.delete(deleteTargetId);
      showToast('success', 'Marriage record deleted');
      setDeleteTargetId(null);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete marriage record');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMarriages.length && filteredMarriages.length > 0) {
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
      setIsDeleting(true);
      await Promise.all(selectedIds.map((id) => db.marriages.delete(id)));
      showToast('success', `${selectedIds.length} marriage records deleted`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to bulk delete records');
    } finally {
      setIsDeleting(false);
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
      <div className="page-header-actions margin-bottom-md">
        <div>
          <h3 className="text-dark font-weight-800">Marriage Records (കല്യാണ രജിസ്റ്റർ)</h3>
          <p className="page-subtitle">Manage Nikah registrations, bride and groom details, & certificates.</p>
        </div>

        <div className="header-cta-group">
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={() => setIsImportModalOpen(true)}>
            <FileSpreadsheet size={15} className="text-emerald" />
            <span>Import Data</span>
          </button>
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={exportCSV} title="Export CSV Report">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button className="add-btn primary-btn" onClick={openAddModal}>
            <Plus size={16} />
            <span>+ Register New Marriage</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS ROW */}
      <div className="stats-dashboard-grid-4 margin-bottom-md">
        <div className="summary-metric-card shadow-sm">
          <div className="metric-header">
            <div className="metric-icon-bg emerald">
              <Heart size={20} />
            </div>
            <span className="metric-badge-tag success">Registry</span>
          </div>
          <div className="metric-body">
            <h3 className="metric-number-display">{totalMarriagesCount}</h3>
            <span className="metric-title-label">Total Marriage Records</span>
          </div>
        </div>

        <div className="summary-metric-card shadow-sm">
          <div className="metric-header">
            <div className="metric-icon-bg success">
              <CheckCircle2 size={20} />
            </div>
            <span className="metric-badge-tag success">Verified</span>
          </div>
          <div className="metric-body">
            <h3 className="metric-number-display text-emerald">{completedMarriagesCount}</h3>
            <span className="metric-title-label">Completed Nikahs</span>
          </div>
        </div>

        <div className="summary-metric-card shadow-sm">
          <div className="metric-header">
            <div className="metric-icon-bg primary">
              <Users size={20} />
            </div>
            <span className="metric-badge-tag primary">External</span>
          </div>
          <div className="metric-body">
            <h3 className="metric-number-display">{externalBridesCount}</h3>
            <span className="metric-title-label">External Bride Links</span>
          </div>
        </div>

        <div className="summary-metric-card shadow-sm">
          <div className="metric-header">
            <div className="metric-icon-bg warning">
              <Calendar size={20} />
            </div>
            <span className="metric-badge-tag warning">{new Date().getFullYear()}</span>
          </div>
          <div className="metric-body">
            <h3 className="metric-number-display">{currentYearMarriagesCount}</h3>
            <span className="metric-title-label">This Year Nikahs</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar glass-card margin-bottom-md">
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

          <div className="filter-select-wrapper">
            <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
              <option value="">All Wards / Areas</option>
              {uniqueWards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Status: All</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-toolbar glass-card margin-bottom-md">
          <span className="font-weight-700 font-sm">{selectedIds.length} marriages selected</span>
          <button className="pill-btn-danger font-xs" onClick={() => setIsBulkDeleteModalOpen(true)}>
            <Trash2 size={15} />
            <span>Delete Selected ({selectedIds.length})</span>
          </button>
        </div>
      )}

      {/* Marriage Table Directory */}
      <div className="table-container-card glass-card">
        {loading ? (
          <div className="skeleton-loading-container">
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
          </div>
        ) : filteredMarriages.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon emerald">
              <Heart size={32} />
            </div>
            <h4>No marriage records found</h4>
            <p>Try changing your search keywords or filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive desktop-view-only">
              <table className="households-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredMarriages.length && filteredMarriages.length > 0}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th>Groom Details (പുതിയാപ്ല)</th>
                    <th>Bride Details (പെണ്ണു)</th>
                    <th>Nikah Date</th>
                    <th>Venue</th>
                    <th>Groom House</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarriages.map((m) => {
                    const isSelected = selectedIds.includes(m.id) || selectedMarriage?.id === m.id;
                    return (
                      <tr 
                        key={m.id} 
                        className={`household-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => { setSelectedMarriage(m); setIsDetailsOpen(true); }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(m.id)}
                            onChange={() => handleToggleSelect(m.id)}
                          />
                        </td>
                        <td className="bold-text">
                          <div className="flex-row-gap-sm align-items-center">
                            <div className="donor-avatar-circle sm avatar-member">
                              {m.groom_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-weight-700 font-sm text-dark">{m.groom_name}</div>
                              {m.groom_phone && <span className="font-xs color-subtle">{m.groom_phone}</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex-col">
                            <span className="font-weight-700 font-sm text-dark">{m.bride_name}</span>
                            <span className={`pill-badge font-xs ${m.bride_type === 'member' ? 'member-badge' : 'external-badge'}`}>
                              {m.bride_type === 'member' ? 'Registered Member' : 'External Bride'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="area-tag">
                            <Calendar size={12} /> {m.nikah_date}
                          </span>
                        </td>
                        <td>
                          <span className="area-tag">
                            <MapPin size={12} /> {m.nikah_venue || 'Mahallu Masjid'}
                          </span>
                        </td>
                        <td>
                          <span className="house-badge">{m.groom_house_number ? `H-${m.groom_house_number}` : 'N/A'}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${m.status === 'completed' ? 'active' : 'inactive'}`}>
                            <span className="dot"></span>
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div className="actions-button-wrapper justify-content-end">
                            <button className="action-icon-btn view" title="View Details" onClick={(e) => { e.stopPropagation(); setSelectedMarriage(m); setIsDetailsOpen(true); }}><Eye size={15} /></button>
                            <button className="action-icon-btn edit" title="Edit Record" onClick={(e) => openEditModal(m, e)}><Edit2 size={15} /></button>
                            <button className="action-icon-btn delete" title="Delete Record" onClick={(e) => handleDelete(m.id, e)}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-directory">
              {filteredMarriages.map((m) => (
                <div key={m.id} className="mobile-notif-card" onClick={() => { setSelectedMarriage(m); setIsDetailsOpen(true); }}>
                  <div className="card-head">
                    <h4 className="notif-title">{m.groom_name} & {m.bride_name}</h4>
                    <span className={`status-pill ${m.status === 'completed' ? 'active' : 'inactive'}`}>{m.status}</span>
                  </div>
                  <div className="card-body font-xs">
                    <p><strong>Nikah Date:</strong> {m.nikah_date}</p>
                    <p><strong>Venue:</strong> {m.nikah_venue || 'N/A'}</p>
                    <p><strong>Groom House:</strong> {m.groom_house_number ? `H-${m.groom_house_number}` : 'N/A'}</p>
                  </div>
                  <div className="card-footer" onClick={(e) => e.stopPropagation()}>
                    <button className="pill-btn-secondary font-xs" onClick={() => openEditModal(m)}><Edit2 size={14} /> Edit</button>
                    <button className="pill-btn-danger font-xs" onClick={() => handleDelete(m.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* DETAILS VIEW SIDE PANEL */}
      <SidePanel
        isOpen={Boolean(isDetailsOpen && selectedMarriage)}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedMarriage ? `${selectedMarriage.groom_name} & ${selectedMarriage.bride_name}` : ''}
        subtitle="Nikah Community Record Details"
        icon={<Heart size={20} />}
        size="lg"
        quickActions={
          selectedMarriage && (
            <button className="pill-btn-primary font-xs" onClick={() => { setIsDetailsOpen(false); openEditModal(selectedMarriage); }}>
              <Edit2 size={14} /> Edit Record
            </button>
          )
        }
      >
        {selectedMarriage && (
          <div className="flex-col gap-md">
            <div className="form-card">
              <div className="form-card-header margin-bottom-sm">
                <Heart size={16} className="text-primary" />
                <span className="form-card-title margin-left-xs">Couples Information</span>
              </div>
              <div className="form-grid-2col font-xs">
                <div>
                  <div className="detail-item-label">Groom Name</div>
                  <div className="font-weight-700 font-sm text-dark">{selectedMarriage.groom_name}</div>
                  <div className="color-subtle font-xs">{selectedMarriage.groom_phone || 'No Phone Number'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Bride Name</div>
                  <div className="font-weight-700 font-sm text-dark">{selectedMarriage.bride_name}</div>
                  <div className="color-subtle font-xs">{selectedMarriage.bride_type === 'member' ? 'Registered Member' : 'External Bride'}</div>
                </div>
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header margin-bottom-sm">
                <Heart size={16} className="text-success" />
                <span className="form-card-title margin-left-xs">Nikah Ceremony & Officiant</span>
              </div>
              <div className="form-grid-2col font-xs">
                <div>
                  <div className="detail-item-label">Nikah Date & Time</div>
                  <div className="font-weight-700 text-dark">{selectedMarriage.nikah_date} {selectedMarriage.nikah_time || ''}</div>
                </div>
                <div>
                  <div className="detail-item-label">Venue</div>
                  <div className="font-weight-600">{selectedMarriage.nikah_venue || 'N/A'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Officiant (Conducted By)</div>
                  <div className="font-weight-600">{selectedMarriage.conducted_by || 'N/A'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Wali (Guardian)</div>
                  <div className="font-weight-600">{selectedMarriage.wali_name || 'N/A'} ({selectedMarriage.wali_relationship || 'Father'})</div>
                </div>
              </div>
            </div>

            <div className="form-card bg-emerald-soft">
              <div className="detail-item-label">Mahr Specification</div>
              <div className="font-weight-700 text-success font-sm">{selectedMarriage.mahr_type} — {selectedMarriage.mahr_description || 'Standard Mahr'}</div>
            </div>
          </div>
        )}
      </SidePanel>

      {/* BULK DELETE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Marriages?"
        message={`Are you sure you want to permanently delete ${selectedIds.length} selected marriage records from Supabase?`}
        confirmText="Delete Records"
      />
      {/* CONFIRMATION DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Marriage Record?"
        message="Are you sure you want to delete this marriage record? This action cannot be undone."
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* EXCEL / CSV IMPORT MODAL WITH STRUCTURE GUIDE & PARSED PREVIEW */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Upload Marriages from Excel / CSV"
        subtitle="Import multiple marriage records at once using an Excel or CSV file"
        moduleName="Marriages"
        sampleCsvFilename="marriages_sample_template.csv"
        columns={[
          { key: 'groom_name', label: 'Groom Name', description: 'Full name of the groom', example: 'MUHAMMED SINAD' },
          { key: 'groom_phone', label: 'Groom Phone', description: 'Contact mobile number of groom', example: '9876543210' },
          { key: 'bride_name', label: 'Bride Name', description: 'Full name of the bride', example: 'AISHA BEEVI' },
          { key: 'nikah_date', label: 'Nikah Date', description: 'Format YYYY-MM-DD', example: '2026-06-15' },
          { key: 'nikah_venue', label: 'Venue', description: 'Location / Masjid venue', example: 'Central Juma Masjid' },
        ]}
        sampleRow={{
          groom_name: 'MUHAMMED SINAD',
          groom_phone: '9876543210',
          bride_name: 'AISHA BEEVI',
          nikah_date: '2026-06-15',
          nikah_venue: 'Central Juma Masjid',
        }}
        onImport={async (parsedRows) => {
          for (const row of parsedRows) {
            await db.marriages.create({
              groom_name: row.groom_name || 'Groom',
              groom_member_id: null,
              groom_father_name: row.groom_father_name || null,
              groom_phone: row.groom_phone || null,
              groom_house_number: row.groom_house_number || null,
              groom_ward: row.groom_ward || 'Ward 1',
              groom_address: row.groom_address || null,
              bride_type: (row.bride_type?.toLowerCase() === 'member' ? 'member' : 'external'),
              bride_name: row.bride_name || 'Bride',
              bride_member_id: null,
              bride_father_name: row.bride_father_name || null,
              bride_phone: row.bride_phone || null,
              bride_address: row.bride_address || null,
              bride_ward: row.bride_ward || null,
              nikah_date: row.nikah_date || new Date().toISOString().split('T')[0],
              nikah_time: row.nikah_time || '11:00 AM',
              nikah_venue: row.nikah_venue || 'Mahallu Juma Masjid',
              witness1_name: row.witness_1_name || null,
              witness2_name: row.witness_2_name || null,
              status: 'completed',
              created_by: 'admin',
            } as any);
          }
          showToast('success', `✓ Successfully imported ${parsedRows.length} marriage records!`);
          loadData();
        }}
      />
    </div>
  );
};

export default Marriages;
