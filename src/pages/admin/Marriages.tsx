import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';
import type { MarriageRecord, Household, SubscriptionYear } from '../../services/db';
import { 
  Heart, Plus, Search, 
  Trash2, Edit2, Eye, CheckCircle, AlertCircle, 
  Loader2, FileSpreadsheet, Upload, Download
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SidePanel } from '../../components/SidePanel';
import { Modal } from '../../components/Modal';
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

  const downloadMarriageSampleCSV = () => {
    const csvHeader = 'groom_name,groom_phone,groom_father_name,groom_address,bride_name,bride_type,nikah_date,nikah_venue,officiant_name,mahr_details\n';
    const csvSample = 'Muhammed Fayis,9876543210,Abubakar Siddique,H-1 East Ward,Aisha Beevi,external,2026-06-15,Central Juma Masjid,Kazi Ustad,10 Sovereign Gold\n';
    const blob = new Blob([csvHeader + csvSample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marriages_sample_template.csv';
    a.click();
    showToast('success', 'Sample CSV template downloaded!');
  };

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
          <div>
            <h2 className="canvas-page-title">Marriage Records</h2>
            <p className="canvas-page-subtitle">Manage marriage records & matrimonial register.</p>
          </div>
        </div>

        <div className="header-action-btns flex-row-gap-sm">
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={() => setIsImportModalOpen(true)}>
            <FileSpreadsheet size={15} className="text-emerald" />
            <span>Import Data</span>
          </button>
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={exportCSV} title="Export CSV Report">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
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
      {/* Marriage Table Directory */}
      <div className="table-container-card shadow-sm">
        {loading ? (
          <div className="loading-spinner-box"><Loader2 size={24} className="spinner" /></div>
        ) : filteredMarriages.length === 0 ? (
          <div className="notif-empty">No marriage records found matching criteria.</div>
        ) : (
          <>
            <div className="table-responsive desktop-view-only">
              <table className="subscriptions-table">
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
                      <td><span className={`status-pill ${m.status === 'completed' ? 'paid' : 'unpaid'}`}>{m.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex-row-gap-xs justify-content-end">
                          <button className="modal-close-icon-btn" title="View Details" onClick={() => { setSelectedMarriage(m); setIsDetailsOpen(true); }}><Eye size={15} /></button>
                          <button className="modal-close-icon-btn" title="Edit Record" onClick={(e) => openEditModal(m, e)}><Edit2 size={15} /></button>
                          <button className="modal-close-icon-btn" title="Delete Record" onClick={(e) => handleDelete(m.id, e)}><Trash2 size={15} /></button>
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
                    <span className="status-pill paid">{m.status}</span>
                  </div>
                  <div className="card-body font-xs">
                    <p><strong>Nikah Date:</strong> {m.nikah_date}</p>
                    <p><strong>Venue:</strong> {m.nikah_venue || 'N/A'}</p>
                    <p><strong>Groom House:</strong> {m.groom_house_number || 'N/A'}</p>
                  </div>
                  <div className="card-footer">
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
              registration_number: `REG-${Date.now().toString().slice(-6)}`,
              conducted_by: null,
              officiant_name: null,
              witness1_phone: null,
              witness2_phone: null,
              mahr_details: row.mahr_details || null,
              register_volume: null,
              register_page: null,
              place_of_marriage: row.nikah_venue || null,
              district: null,
              state: null,
              pin_code: null,
              notes: null,
              certificate_url: null,
              created_by: 'admin',
            });
          }
          showToast('success', `✓ Successfully imported ${parsedRows.length} marriage records!`);
          loadData();
        }}
      />
    </div>
  );
};

export default Marriages;
