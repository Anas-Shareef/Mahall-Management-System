import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { Household, Member } from '../../services/db';
import { 
  Plus, Edit2, Trash2, Search, Filter, Users, X, AlertCircle, 
  CheckCircle, Phone, Mail, Home, Smartphone, UserCheck, ShieldCheck, Eye 
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SidePanel } from '../../components/SidePanel';
import { GrantAccessModal } from '../../components/GrantAccessModal';
import { MemberDetailsModal } from '../../components/MemberDetailsModal';

export const Members: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Data States
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPortalStatus, setSelectedPortalStatus] = useState('');

  // Access Control & Details Modal States
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [memberForAccess, setMemberForAccess] = useState<Member | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [memberForDetails, setMemberForDetails] = useState<Member | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Member Details Panel
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<Member | null>(null);

  // Compute Statistics
  const stats = useMemo(() => {
    const totalMembers = members.length;
    const totalHouseholds = households.length;
    const portalGranted = members.filter((m) => m.portal_access).length;
    const activeAccounts = members.filter((m) => m.portal_status === 'active').length;
    const pendingInvites = members.filter((m) => m.portal_status === 'pending').length;

    return { totalMembers, totalHouseholds, portalGranted, activeAccounts, pendingInvites };
  }, [members, households]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const relationshipsList = [
    'Self (Owner)', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'
  ];

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [memberList, houseList] = await Promise.all([
        db.members.get(),
        db.households.get(),
      ]);
      setMembers(memberList);
      setHouseholds(houseList);
    } catch (err) {
      console.error('Failed to load members page data:', err);
      showToast('error', 'Unable to load members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Add Page
  const openAddModal = () => {
    navigate('/admin/members/new');
  };

  // Open Edit Page
  const openEditModal = (m: Member, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/admin/members/${m.id}/edit`);
  };

  // Open Delete Modal
  const openDeleteModal = (m: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setMemberToDelete(m);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Member
  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await db.members.delete(memberToDelete.id);
      showToast('success', `✓ Member ${memberToDelete.name} deleted successfully.`);
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
      if (selectedMemberDetails?.id === memberToDelete.id) {
        setSelectedMemberDetails(null);
      }
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete member.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const house = households.find((h) => h.id === m.household_id);
      const q = searchQuery.toLowerCase().trim();
      
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.relationship && m.relationship.toLowerCase().includes(q)) ||
        (house && (house.house_number.toLowerCase().includes(q) || house.house_owner_name.toLowerCase().includes(q)));

      const matchesHousehold = selectedHouseholdId ? m.household_id === selectedHouseholdId : true;
      const matchesRelationship = selectedRelationship ? m.relationship === selectedRelationship : true;
      const matchesStatus = selectedStatus ? m.status === selectedStatus : true;
      const matchesPortalStatus = selectedPortalStatus
        ? (m.portal_status || 'not_granted') === selectedPortalStatus
        : true;

      return matchesSearch && matchesHousehold && matchesRelationship && matchesStatus && matchesPortalStatus;
    });
  }, [members, households, searchQuery, selectedHouseholdId, selectedRelationship, selectedStatus, selectedPortalStatus]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedHouseholdId('');
    setSelectedRelationship('');
    setSelectedStatus('');
    setSelectedPortalStatus('');
  };

  return (
    <div className="members-page animate-fade-in">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type} animate-bounce-in`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="page-header-actions">
        <div>
          <h3>{t('member.membersTitle')}</h3>
          <p className="page-subtitle">Manage household members & portal access.</p>
        </div>
        <button className="add-btn primary-btn" onClick={openAddModal}>
          <Plus size={16} />
          <span>{t('member.addMember')}</span>
        </button>
      </div>

      {/* STATISTICS SUMMARY CARDS */}
      <div className="analytics-stats-grid margin-bottom-md">
        <div className="stat-card glass-card">
          <div className="stat-icon emerald"><Users size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Total Members</span>
            <h3 className="stat-value">{stats.totalMembers}</h3>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon info"><Home size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Households</span>
            <h3 className="stat-value">{stats.totalHouseholds}</h3>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon primary"><ShieldCheck size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Portal Granted</span>
            <h3 className="stat-value">{stats.portalGranted}</h3>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon success"><UserCheck size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Active Accounts</span>
            <h3 className="stat-value">{stats.activeAccounts}</h3>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon warning"><Smartphone size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Pending Invites</span>
            <h3 className="stat-value">{stats.pendingInvites}</h3>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="filter-bar glass-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by member name, phone, house no, or relationship..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-selectors-grid">
          <div className="filter-select-wrapper">
            <Home size={15} className="select-icon" />
            <select value={selectedHouseholdId} onChange={(e) => setSelectedHouseholdId(e.target.value)}>
              <option value="">Household: All</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  House No. H-{h.house_number} ({h.house_owner_name})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <ShieldCheck size={15} className="select-icon" />
            <select value={selectedPortalStatus} onChange={(e) => setSelectedPortalStatus(e.target.value)}>
              <option value="">Portal Access: All</option>
              <option value="not_granted">Not Granted</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Filter size={15} className="select-icon" />
            <select value={selectedRelationship} onChange={(e) => setSelectedRelationship(e.target.value)}>
              <option value="">Relationship: All</option>
              {relationshipsList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Filter size={15} className="select-icon" />
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Status: All</option>
              <option value="active">{t('member.active')}</option>
              <option value="inactive">{t('member.inactive')}</option>
            </select>
          </div>

          {(searchQuery || selectedHouseholdId || selectedRelationship || selectedStatus || selectedPortalStatus) && (
            <button className="clear-filters-link" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="members-content-split">
        {/* MEMBERS TABLE & MOBILE DIRECTORY */}
        <div className={`table-container-card glass-card ${selectedMemberDetails ? 'narrow' : ''}`}>
          {loading ? (
            <div className="skeleton-loading-container">
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          ) : members.length === 0 ? (
            /* EMPTY STATE 1: NO MEMBERS IN DATABASE */
            <div className="empty-state-card">
              <div className="empty-state-icon emerald">
                <Users size={32} />
              </div>
              <h4>No members yet</h4>
              <p>Start building your Mahallu member directory by adding your first member.</p>
              <button className="add-btn primary-btn margin-top" onClick={openAddModal}>
                <Plus size={16} />
                <span>Add Member</span>
              </button>
            </div>
          ) : filteredMembers.length === 0 ? (
            /* EMPTY STATE 2: SEARCH / FILTER RETURNS 0 RESULTS */
            <div className="empty-state-card">
              <div className="empty-state-icon neutral">
                <Search size={32} />
              </div>
              <h4>No members found</h4>
              <p>Try changing your search keywords or filter criteria.</p>
              <button className="btn-cancel margin-top" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP & TABLET DATA TABLE */}
              <div className="table-responsive desktop-view-only">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>{t('member.memberName')}</th>
                      <th>{t('household.houseNumber')}</th>
                      <th>{t('member.relationship')}</th>
                      <th>{t('member.phoneNumber')}</th>
                      <th>Portal Login</th>
                      <th>{t('member.status')}</th>
                      <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => {
                      const house = households.find((h) => h.id === m.household_id);
                      const isSelected = selectedMemberDetails?.id === m.id;
                      return (
                        <tr
                          key={m.id}
                          className={`member-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedMemberDetails(m)}
                        >
                          <td className="bold-text">
                            <div className="member-name-td">
                              <span className="name-text">{m.name}</span>
                              {m.email && <span className="email-sub">{m.email}</span>}
                            </div>
                          </td>
                          <td>
                            {house ? (
                              <span className="house-tag">H-{house.house_number}</span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td>
                            <span className="rel-pill">{m.relationship}</span>
                          </td>
                          <td>
                            {m.phone ? (
                              <span className="phone-text">
                                <Phone size={11} /> {m.phone}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <span className={`status-badge-pill ${m.portal_status || 'not_granted'}`}>
                              {(m.portal_status || 'not_granted').replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${m.status}`}>
                              <span className="dot"></span>
                              {t(`member.${m.status}`)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="actions-button-wrapper" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="action-icon-btn info"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberForDetails(m);
                                  setIsDetailsModalOpen(true);
                                }}
                                title="View Member Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="action-icon-btn primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberForAccess(m);
                                  setIsGrantModalOpen(true);
                                }}
                                title="Grant / Manage Portal Access"
                              >
                                <ShieldCheck size={15} />
                              </button>
                              <button
                                className="action-icon-btn edit"
                                onClick={(e) => openEditModal(m, e)}
                                title={t('common.edit')}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="action-icon-btn delete"
                                onClick={(e) => openDeleteModal(m, e)}
                                title="Delete Member"
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

              {/* MOBILE MEMBER CARDS DIRECTORY VIEW */}
              <div className="mobile-cards-directory">
                {filteredMembers.map((m) => {
                  const house = households.find((h) => h.id === m.household_id);
                  const isSelected = selectedMemberDetails?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`mobile-member-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedMemberDetails(m)}
                    >
                      <div className="card-head">
                        <div className="member-title-group">
                          <h4 className="member-name">{m.name}</h4>
                          <span className="rel-pill">{m.relationship}</span>
                        </div>
                        <span className={`status-pill ${m.status}`}>
                          <span className="dot"></span>
                          {t(`member.${m.status}`)}
                        </span>
                      </div>

                      <div className="card-body">
                        {house && (
                          <div className="card-info-row">
                            <Home size={13} className="info-icon" />
                            <span>House No. H-{house.house_number} ({house.house_owner_name})</span>
                          </div>
                        )}
                        <div className="card-info-row">
                          <Phone size={13} className="info-icon" />
                          <span>{m.phone || 'No phone'}</span>
                        </div>
                        {m.email && (
                          <div className="card-info-row">
                            <Mail size={13} className="info-icon" />
                            <span>{m.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="card-footer">
                        <span className={`login-status-pill ${m.user_id ? 'enabled' : 'disabled'}`}>
                          <Smartphone size={12} />
                          {m.user_id ? 'Portal Enabled' : 'Portal Disabled'}
                        </span>

                        <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="mobile-action-btn edit"
                            onClick={(e) => openEditModal(m, e)}
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="mobile-action-btn delete"
                            onClick={(e) => openDeleteModal(m, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* SELECTED MEMBER DETAILS SIDE PANEL */}
        <SidePanel
          isOpen={Boolean(selectedMemberDetails)}
          onClose={() => setSelectedMemberDetails(null)}
          title={selectedMemberDetails?.name}
          subtitle={`Relationship: ${selectedMemberDetails?.relationship || 'Head of Household'}`}
          icon={<UserCheck size={20} />}
          size="lg"
          quickActions={
            selectedMemberDetails && (
              <button
                type="button"
                className="pill-btn-primary font-xs"
                onClick={() => {
                  setSelectedMemberDetails(null);
                  navigate(`/admin/members/${selectedMemberDetails.id}/edit`);
                }}
              >
                <Edit2 size={13} /> Edit Member
              </button>
            )
          }
        >
          {selectedMemberDetails && (
            <div className="flex-col gap-md">
              {/* PRIMARY DETAILS CARD */}
              <div className="form-card">
                <div className="form-card-header margin-bottom-sm">
                  <UserCheck size={16} className="text-primary" />
                  <span className="form-card-title margin-left-xs">Member Information</span>
                </div>
                <div className="form-grid-2col font-xs">
                  <div>
                    <div className="detail-item-label">Full Name</div>
                    <div className="font-weight-700 font-sm text-dark">{selectedMemberDetails.name}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Relationship to Household</div>
                    <div className="font-weight-600">{selectedMemberDetails.relationship || 'Head of Household'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Assigned Household</div>
                    <div className="font-weight-600 text-dark">
                      {households.find((h) => h.id === selectedMemberDetails.household_id)
                        ? `House H-${households.find((h) => h.id === selectedMemberDetails.household_id)?.house_number}`
                        : 'Unassigned Household'}
                    </div>
                  </div>
                  <div>
                    <div className="detail-item-label">Membership Status</div>
                    <span className={`status-pill ${selectedMemberDetails.status !== 'inactive' ? 'active' : 'inactive'}`}>
                      <span className="dot"></span>
                      {selectedMemberDetails.status !== 'inactive' ? 'Active Member' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CONTACT & PORTAL ACCESS CARD */}
              <div className="form-card">
                <div className="form-card-header margin-bottom-sm">
                  <Phone size={16} className="text-primary" />
                  <span className="form-card-title margin-left-xs">Contact & Portal Credentials</span>
                </div>
                <div className="form-grid-2col font-xs">
                  <div>
                    <div className="detail-item-label">Phone Number</div>
                    <div className="font-weight-700 text-dark">{selectedMemberDetails.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Email Address</div>
                    <div className="font-weight-600">{selectedMemberDetails.email || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="detail-item-label">Mobile Portal Access</div>
                    <span className={`login-status-pill ${selectedMemberDetails.user_id ? 'enabled' : 'disabled'}`}>
                      <Smartphone size={12} />
                      {selectedMemberDetails.user_id ? 'Portal Login Enabled' : 'Portal Disabled'}
                    </span>
                  </div>
                  <div>
                    <div className="detail-item-label">Subscription Accountability</div>
                    <div className="font-weight-600">
                      {selectedMemberDetails.is_subscription_accountable !== false ? '🟢 Accountable (ON)' : '⚪ Non-Accountable (OFF)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SidePanel>
      </div>



      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={isDeleteModalOpen && Boolean(memberToDelete)}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Member?"
        message={
          <>
            Are you sure you want to delete member <strong>{memberToDelete?.name}</strong>? This action cannot be undone.
          </>
        }
        confirmText="Delete Member"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* GRANT PORTAL ACCESS MODAL */}
      <GrantAccessModal
        isOpen={isGrantModalOpen}
        onClose={() => {
          setIsGrantModalOpen(false);
          setMemberForAccess(null);
        }}
        member={memberForAccess}
        houseNo={households.find((h) => h.id === memberForAccess?.household_id)?.house_number}
        onSuccess={() => {
          showToast('success', '✓ Member Portal Access updated successfully.');
          loadData();
        }}
      />

      {/* MEMBER FULL DETAILS MODAL */}
      <MemberDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setMemberForDetails(null);
        }}
        member={memberForDetails}
        onGrantAccess={(m) => {
          setMemberForAccess(m);
          setIsGrantModalOpen(true);
        }}
      />

      {/* STYLES */}
      <style>{`
        .members-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* TOAST NOTIFICATION */
        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 13.5px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        .toast-notification.success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .toast-notification.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .page-header-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          width: 100%;
          box-sizing: border-box;
        }

        .page-header-actions h3 { font-size: 22px; font-weight: 800; color: #111827; }
        .page-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

        .add-btn.primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: var(--radius-pill);
          background: var(--primary);
          color: #ffffff;
          font-weight: 700;
          font-size: 13.5px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35);
          transition: var(--transition-all);
        }

        .add-btn.primary-btn:hover { background: var(--primary-light); }

        /* FILTER BAR */
        .filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          gap: 14px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          flex-wrap: wrap;
          width: 100%;
          box-sizing: border-box;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 260px;
        }

        .search-icon { position: absolute; left: 14px; color: #9ca3af; }

        .search-box input {
          width: 100%;
          padding: 11px 36px 11px 42px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
          transition: var(--transition-all);
        }

        .search-box input:focus {
          outline: none;
          border-color: var(--primary);
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12);
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          background: #e5e7eb;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
          cursor: pointer;
        }

        .filter-selectors-grid {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-icon { position: absolute; left: 14px; color: #9ca3af; pointer-events: none; }

        .filter-select-wrapper select {
          padding: 10px 36px 10px 48px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          background: #f9fafb;
          color: #374151;
          appearance: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }

        .clear-filters-link {
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          padding: 6px 12px;
        }

        /* MAIN CONTENT SPLIT */
        .members-content-split {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          width: 100%;
          box-sizing: border-box;
        }

        .table-container-card {
          flex: 1;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 20px;
          transition: var(--transition-all);
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .table-container-card.narrow { flex: 1.4; }

        /* DESKTOP TABLE STYLES */
        .desktop-view-only { display: block; }
        .table-responsive { width: 100%; overflow-x: auto; }
        .members-table { width: 100%; border-collapse: collapse; text-align: left; }

        .members-table th {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 14px 16px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .members-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          border-bottom: 1px solid #f3f4f6;
          color: #111827;
        }

        .member-row { cursor: pointer; transition: var(--transition-all); }
        .member-row:hover { background-color: #f9fafb; }
        .member-row.selected { background-color: #ecfdf5; }

        .member-name-td { display: flex; flex-direction: column; }
        .name-text { font-weight: 700; color: #111827; }
        .email-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }

        .house-tag {
          font-weight: 800;
          color: #00966b;
          background: #ecfdf5;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #a7f3d0;
          font-size: 12.5px;
        }

        .rel-pill {
          display: inline-block;
          font-size: 12px;
          color: #4b5563;
          background: #f3f4f6;
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: 600;
        }

        .login-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
        }

        .login-status-pill.enabled { background: #d1fae5; color: #065f46; }
        .login-status-pill.disabled { background: #f3f4f6; color: #9ca3af; }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          text-transform: uppercase;
        }

        .status-pill .dot { width: 6px; height: 6px; border-radius: 50%; }
        .status-pill.active { background-color: #d1fae5; color: #065f46; }
        .status-pill.active .dot { background-color: #10b981; }

        .status-pill.inactive { background-color: #fee2e2; color: #991b1b; }
        .status-pill.inactive .dot { background-color: #ef4444; }

        .actions-button-wrapper { display: flex; gap: 6px; justify-content: flex-end; }

        .action-icon-btn {
          border: 1px solid var(--border-color);
          background: #ffffff;
          color: #6b7280;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .action-icon-btn.edit:hover { background: #ecfdf5; color: #00966b; border-color: #a7f3d0; }
        .action-icon-btn.delete:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        /* MOBILE CARDS DIRECTORY VIEW */
        .mobile-cards-directory {
          display: none;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
        }

        .mobile-member-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          box-sizing: border-box;
          width: 100%;
        }

        .mobile-member-card.selected { border-color: var(--primary); background: #f0fdf4; }
        .mobile-member-card .card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }

        .member-title-group { display: flex; flex-direction: column; gap: 4px; }
        .member-name { font-size: 16px; font-weight: 800; color: #111827; }

        .card-info-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #4b5563; margin-top: 4px; }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
          flex-wrap: wrap;
          gap: 8px;
        }

        .mobile-card-actions { display: flex; gap: 8px; }

        .mobile-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-color);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .mobile-action-btn.edit { background: #ecfdf5; color: #00966b; border-color: #a7f3d0; }
        .mobile-action-btn.delete { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        /* EMPTY STATES */
        .empty-state-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 48px 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .empty-state-icon {
          width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
        }
        .empty-state-icon.emerald { background: #ecfdf5; color: #00966b; }
        .empty-state-icon.neutral { background: #f3f4f6; color: #6b7280; }

        .empty-state-card h4 { font-size: 18px; font-weight: 800; color: #111827; }
        .empty-state-card p { font-size: 13px; color: #6b7280; margin-top: 4px; max-width: 320px; }
        .margin-top { margin-top: 16px; }

        /* DETAILS LEDGER PANEL */
        .details-panel-card {
          flex: 1;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 20px;
          position: sticky;
          top: 94px;
          box-sizing: border-box;
          width: 100%;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 14px;
          margin-bottom: 16px;
        }

        .panel-title-wrapper { display: flex; align-items: center; gap: 10px; }
        .panel-icon-box {
          width: 40px; height: 40px; background: #ecfdf5; border-radius: 12px; display: flex; align-items: center; justify-content: center;
        }
        .panel-title-wrapper h4 { font-size: 16px; font-weight: 800; color: #111827; }
        .panel-title-wrapper p { font-size: 12px; color: #6b7280; }
        .panel-close-btn { background: transparent; border: none; color: #9ca3af; cursor: pointer; }

        .details-meta-section {
          background: #f9fafb;
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border: 1px solid #f3f4f6;
        }

        .meta-item { display: flex; justify-content: space-between; align-items: center; }
        .meta-label { font-size: 12px; color: #6b7280; font-weight: 600; }
        .meta-value { font-size: 13px; font-weight: 700; color: #111827; }

        .modal-header {
          padding: 18px 20px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .modal-header h4 { font-size: 17px; font-weight: 800; color: #111827; }
        .modal-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .modal-close-btn { background: transparent; border: none; color: #9ca3af; cursor: pointer; }

        .modal-form { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .form-section-title { font-size: 11px; font-weight: 800; color: #00966b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
        .margin-top-sm { margin-top: 6px; }

        .form-row-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12.5px; font-weight: 700; color: #374151; }

        .form-group input, .form-group select {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
        }

        .form-group input:focus, .form-group select:focus {
          outline: none; border-color: var(--primary); background: #ffffff; box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12);
        }

        .input-error { border-color: #ef4444 !important; background: #fff5f5 !important; }
        .field-error-text { font-size: 11px; font-weight: 600; color: #dc2626; }

        .form-alert { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px; }
        .form-alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .status-pill-toggle-group { display: flex; gap: 10px; margin-top: 2px; }
        .status-toggle-pill {
          display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: var(--radius-pill); border: 1px solid var(--border-color); background: #f9fafb; color: #4b5563; font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .status-toggle-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: #9ca3af; }
        .status-toggle-pill.active-pill.selected { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
        .status-toggle-pill.active-pill.selected .dot { background: #10b981; }

        .status-toggle-pill.inactive-pill.selected { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
        .status-toggle-pill.inactive-pill.selected .dot { background: #ef4444; }

        .checkbox-toggle-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          cursor: pointer;
        }

        .checkbox-toggle-card input { width: 16px; height: 16px; cursor: pointer; }
        .checkbox-text p { font-size: 11px; color: #6b7280; margin-top: 1px; }

        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e5e7eb; }

        .btn-cancel { background: #f3f4f6; border: 1px solid var(--border-color); color: #374151; padding: 10px 18px; border-radius: var(--radius-pill); font-weight: 700; cursor: pointer; }
        .submit-pill-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: var(--radius-pill); background: var(--primary); color: #ffffff; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35); }

        .spinner-icon { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* DELETE DIALOG REDESIGN */
        .delete-card { max-width: 480px; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); overflow: hidden; padding: 24px; border: 1px solid var(--border-color); }
        .delete-card-body { display: flex; flex-direction: column; gap: 20px; }
        .delete-header { display: flex; gap: 16px; align-items: flex-start; }
        .delete-badge-icon { width: 44px; height: 44px; background: #fee2e2; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .delete-header h4 { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 6px 0; }
        .delete-subtitle { font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0; }
        .delete-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 6px; }
        .delete-danger-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 22px; border-radius: var(--radius-pill); background: #dc2626; color: #ffffff; font-weight: 700; font-size: 13.5px; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35); transition: var(--transition-all); }
        .delete-danger-btn:hover { background: #b91c1c; }

        /* RESPONSIVE STYLES FOR SAMSUNG GALAXY S8 & SMARTPHONES */
        @media (max-width: 991px) {
          .members-content-split { flex-direction: column; }
          .details-panel-card { width: 100%; position: relative; top: 0; }
        }

        @media (max-width: 768px) {
          .page-header-actions { flex-direction: column; align-items: stretch; gap: 12px; }
          .add-btn.primary-btn { width: 100%; justify-content: center; }

          .filter-bar { flex-direction: column; align-items: stretch; padding: 14px; gap: 12px; }
          .search-box { width: 100%; min-width: 0; }

          .filter-selectors-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            width: 100%;
          }

          .filter-select-wrapper select {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }

        @media (max-width: 640px) {
          .desktop-view-only { display: none; }
          .mobile-cards-directory { display: flex; }

          .filter-selectors-grid { grid-template-columns: 1fr; }
          .form-row-grid { grid-template-columns: 1fr; }

          .modal-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .modal-dialog-card {
            border-radius: 20px 20px 0 0;
            max-height: 90vh;
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Members;
