import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';
import type { MarriageRecord, Household, SubscriptionYear } from '../../services/db';
import { 
  Heart, Plus, Search, 
  Trash2, Edit2, Eye, CheckCircle, AlertCircle, 
  X, Loader2 
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Marriages: React.FC = () => {
  const navigate = useNavigate();

  // Data States
  const [marriages, setMarriages] = useState<MarriageRecord[]>([]);
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
