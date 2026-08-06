import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { Household, Member, MemberSubscription, SubscriptionYear } from '../../services/db';
import { 
  Plus, Edit2, Trash2, Search, Filter, Home, Users, X, AlertCircle, 
  CheckCircle, CheckCircle2, TrendingUp, Phone, MapPin, Loader2, Download, Calendar,
  FileSpreadsheet, Upload
} from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { HouseholdDetailsModal } from '../../components/HouseholdDetailsModal';
import { GrantAccessModal } from '../../components/GrantAccessModal';
import { SidePanel } from '../../components/SidePanel';
import { Modal } from '../../components/Modal';

// Helper to safely format house numbers without double H- prefix
const formatHouseNumber = (raw?: string | null): string => {
  if (!raw) return 'N/A';
  const clean = raw.trim().replace(/^([hH]-?)+/, '');
  return `H-${clean}`;
};

export const Households: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Data States
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedYearId, setSelectedYearId] = useState<string>('all');

  const [isExporting, setIsExporting] = useState(false);

  // Household Details Modal & Access Modal States
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [householdForDetails, setHouseholdForDetails] = useState<Household | null>(null);

  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [memberForAccess, setMemberForAccess] = useState<Member | null>(null);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const downloadHouseholdSampleCSV = () => {
    const csvHeader = 'house_number,house_owner_name,primary_contact_phone,cluster_or_area,status,address\n';
    const csvSample = '1,Abubakar Siddique,9876543210,East Ward,active,Near Juma Masjid\n2,Usman Ghani,9876543211,West Ward,active,Central Street H-2\n';
    const blob = new Blob([csvHeader + csvSample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'households_sample_template.csv';
    a.click();
    showToast('success', 'Sample CSV template downloaded!');
  };

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [householdToDelete, setHouseholdToDelete] = useState<Household | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Household Details Panel
  const [selectedHouseholdDetails, setSelectedHouseholdDetails] = useState<Household | null>(null);
  const [householdMembersDetails, setHouseholdMembersDetails] = useState<any[]>([]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [houseList, memberList, subList, yearList] = await Promise.all([
        db.households.get(),
        db.members.get(),
        db.subscriptions.get(),
        db.years.get(),
      ]);
      setHouseholds(houseList);
      setMembers(memberList);
      setSubscriptions(subList);
      setYears(yearList);

      // Default active year if not set
      const activeYear = yearList.find(y => y.status === 'active');
      if (activeYear && selectedYearId === 'all') {
        setSelectedYearId(activeYear.id);
      }
    } catch (err) {
      console.error('Failed to load household page data:', err);
      showToast('error', 'Unable to load households. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate Consolidated financials for a household (respecting selected year filter)
  const getHouseholdFinancials = (householdId: string) => {
    const houseMembers = members.filter((m) => m.household_id === householdId);
    let totalDue = 0;
    let totalPaid = 0;
    let balance = 0;

    houseMembers.forEach((member) => {
      let memberSubs = subscriptions.filter((s) => s.member_id === member.id);
      if (selectedYearId !== 'all') {
        memberSubs = memberSubs.filter((s) => s.subscription_year_id === selectedYearId);
      }
      
      memberSubs.forEach((sub) => {
        totalDue += sub.total_due;
        totalPaid += sub.total_paid;
        balance += sub.balance;
      });
    });

    return {
      membersCount: houseMembers.length,
      totalDue,
      totalPaid,
      balance,
    };
  };

  // Open Add Page
  const openAddModal = () => {
    navigate('/admin/households/new');
  };

  // Open Edit Page
  const openEditModal = (h: Household, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/admin/households/${h.id}/edit`);
  };

  // Open Delete Modal
  const openDeleteModal = (h: Household, e: React.MouseEvent) => {
    e.stopPropagation();
    setHouseholdToDelete(h);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!householdToDelete) return;

    const linkedMembers = members.filter((m) => m.household_id === householdToDelete.id);
    if (linkedMembers.length > 0) {
      showToast('error', `Cannot delete Household H-${householdToDelete.house_number} because it has ${linkedMembers.length} active member(s). Please remove or reassign members first.`);
      setIsDeleteModalOpen(false);
      setHouseholdToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await db.households.delete(householdToDelete.id);
      showToast('success', `✓ Household H-${householdToDelete.house_number} deleted successfully.`);
      setIsDeleteModalOpen(false);
      setHouseholdToDelete(null);
      if (selectedHouseholdDetails?.id === householdToDelete.id) {
        setSelectedHouseholdDetails(null);
      }
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete household.');
    } finally {
      setIsDeleting(false);
    }
  };



  // Dynamic Report Download (CSV Export)
  const handleDownloadReport = () => {
    if (filteredHouseholds.length === 0) {
      showToast('error', 'No household records to export.');
      return;
    }

    setIsExporting(true);

    setTimeout(() => {
      try {
        const selectedYearObj = years.find((y) => y.id === selectedYearId);
        const yearLabel = selectedYearObj ? selectedYearObj.year : 'All_Years';

        const headers = [
          'House Number',
          'House Owner Name',
          'Owner Phone',
          'Cluster',
          'Members Count',
          'Total Due (INR)',
          'Total Paid (INR)',
          'Outstanding Balance (INR)',
          'Status',
          'Created Date',
        ];

        const rows = filteredHouseholds.map((h) => {
          const fin = getHouseholdFinancials(h.id);
          return [
            `"${formatHouseNumber(h.house_number)}"`,
            `"${h.house_owner_name.replace(/"/g, '""')}"`,
            `"${h.house_owner_phone || ''}"`,
            `"${(h.area || '').replace(/"/g, '""')}"`,
            fin.membersCount,
            fin.totalDue,
            fin.totalPaid,
            fin.balance,
            `"${h.status.toUpperCase()}"`,
            `"${new Date(h.created_at).toLocaleDateString()}"`,
          ];
        });

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Mahallu_Households_Report_${yearLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('success', '✓ Household Report downloaded successfully!');
      } catch (err) {
        showToast('error', 'Failed to generate report.');
      } finally {
        setIsExporting(false);
      }
    }, 600);
  };

  // Show detailed panel
  const handleViewDetails = (h: Household) => {
    setSelectedHouseholdDetails(h);
    const houseMembers = members.filter((m) => m.household_id === h.id);
    const targetYearId = selectedYearId !== 'all' ? selectedYearId : (years.find((y) => y.status === 'active')?.id || years[0]?.id);

    const details = houseMembers.map((m) => {
      const sub = targetYearId
        ? subscriptions.find((s) => s.member_id === m.id && s.subscription_year_id === targetYearId)
        : null;

      return {
        id: m.id,
        name: m.name,
        relationship: m.relationship,
        totalDue: sub ? sub.total_due : 0,
        totalPaid: sub ? sub.total_paid : 0,
        balance: sub ? sub.balance : 0,
      };
    });

    setHouseholdMembersDetails(details);
  };

  // Unique Areas list for Filter
  const uniqueAreas = useMemo(() => {
    return Array.from(new Set(households.map((h) => h.area).filter(Boolean))) as string[];
  }, [households]);

  // Filtered Households list (Ascending Numerical Sorting: H-1, H-2, H-3, ... H-17, H-18)
  const filteredHouseholds = useMemo(() => {
    const list = households.filter((h) => {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/^h-?/, '');

      const matchesSearch =
        !q ||
        h.house_number.toLowerCase().includes(q) ||
        h.house_number.toLowerCase().includes(cleanQ) ||
        h.house_owner_name.toLowerCase().includes(q) ||
        (h.area && h.area.toLowerCase().includes(q)) ||
        (h.house_owner_phone && h.house_owner_phone.includes(q));

      const matchesArea = selectedArea ? h.area === selectedArea : true;
      const matchesStatus = selectedStatus ? h.status === selectedStatus : true;

      return matchesSearch && matchesArea && matchesStatus;
    });

    // Sort by house number in ascending numerical order
    return list.sort((a, b) => {
      const numA = parseInt(a.house_number.replace(/\D/g, ''), 10);
      const numB = parseInt(b.house_number.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.house_number.localeCompare(b.house_number, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [households, searchQuery, selectedArea, selectedStatus]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedArea('');
    setSelectedStatus('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Overview Summary Metrics
  const activeHouseholdsCount = useMemo(() => {
    return households.filter((h) => h.status === 'active').length;
  }, [households]);

  const totalCollectedDues = useMemo(() => {
    return households.reduce((sum, h) => sum + getHouseholdFinancials(h.id).totalPaid, 0);
  }, [households, getHouseholdFinancials]);

  const totalOutstandingBalance = useMemo(() => {
    return households.reduce((sum, h) => sum + getHouseholdFinancials(h.id).balance, 0);
  }, [households, getHouseholdFinancials]);

  return (
    <div className="households-page animate-fade-in">
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
          <h3>{t('household.householdsTitle')}</h3>
          <p className="page-subtitle">Manage households, ward directories & family balances.</p>
        </div>
        
        <div className="header-cta-group">
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={() => setIsImportModalOpen(true)}>
            <FileSpreadsheet size={15} className="text-emerald" />
            <span>Import Data</span>
          </button>
          <button className="pill-btn-ghost font-xs flex-row-gap-xs" onClick={handleDownloadReport} title="Export CSV Report">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button className="add-btn primary-btn" onClick={openAddModal}>
            <Plus size={16} />
            <span>{t('household.addHousehold')}</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS ROW (SINGLE ROW ON DESKTOP) */}
      <div className="stats-dashboard-grid-5 margin-bottom-md">
        <div className="stat-metric-card shadow-sm">
          <div className="metric-icon-box emerald">
            <Home size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Households</span>
            <h3 className="metric-value">{households.length}</h3>
            <span className="metric-sub">Registered house units</span>
          </div>
        </div>

        <div className="stat-metric-card shadow-sm">
          <div className="metric-icon-box blue">
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Active Households</span>
            <h3 className="metric-value text-success">{activeHouseholdsCount}</h3>
            <span className="metric-sub">Active status</span>
          </div>
        </div>

        <div className="stat-metric-card shadow-sm">
          <div className="metric-icon-box purple">
            <Users size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Members</span>
            <h3 className="metric-value text-primary">{members.length}</h3>
            <span className="metric-sub">Across all households</span>
          </div>
        </div>

        <div className="stat-metric-card shadow-sm">
          <div className="metric-icon-box green">
            <TrendingUp size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Dues Collected</span>
            <h3 className="metric-value text-success">{formatCurrency(totalCollectedDues)}</h3>
            <span className="metric-sub">Total payments</span>
          </div>
        </div>

        <div className="stat-metric-card shadow-sm">
          <div className="metric-icon-box amber">
            <AlertCircle size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Outstanding Dues</span>
            <h3 className="metric-value text-danger">{formatCurrency(totalOutstandingBalance)}</h3>
            <span className="metric-sub">Pending balances</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="filter-bar glass-card">
        {/* Search Input Box */}
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search house number, owner, or cluster..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="filter-selectors-grid">
          {/* Subscription Year Filter Dropdown */}
          <div className="filter-select-wrapper">
            <Calendar size={15} className="select-icon" />
            <select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}>
              <option value="all">Financials: All Years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  Year: {y.year} {y.status === 'active' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cluster Filter Dropdown */}
          <div className="filter-select-wrapper">
            <MapPin size={15} className="select-icon" />
            <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
              <option value="">All Clusters</option>
              {uniqueAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="filter-select-wrapper">
            <Filter size={15} className="select-icon" />
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Status: All</option>
              <option value="active">{t('household.active')}</option>
              <option value="inactive">{t('household.inactive')}</option>
            </select>
          </div>

          {/* Dynamic Download Report Button */}
          <button 
            className="report-export-btn" 
            onClick={handleDownloadReport} 
            disabled={isExporting}
            title="Download CSV Report"
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="spinner-icon" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="households-content-split">
        {/* HOUSEHOLDS TABLE & MOBILE DIRECTORY */}
        <div className={`table-container-card glass-card ${selectedHouseholdDetails ? 'narrow' : ''}`}>
          {loading ? (
            <div className="skeleton-loading-container">
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          ) : households.length === 0 ? (
            /* EMPTY STATE 1: NO HOUSEHOLDS IN DATABASE */
            <div className="empty-state-card">
              <div className="empty-state-icon emerald">
                <Home size={32} />
              </div>
              <h4>No households yet</h4>
              <p>Start building your household directory by adding your first household.</p>
              <button className="add-btn primary-btn margin-top" onClick={openAddModal}>
                <Plus size={16} />
                <span>Add Household</span>
              </button>
            </div>
          ) : filteredHouseholds.length === 0 ? (
            /* EMPTY STATE 2: SEARCH / FILTER RETURNS 0 RESULTS */
            <div className="empty-state-card">
              <div className="empty-state-icon neutral">
                <Search size={32} />
              </div>
              <h4>No households found</h4>
              <p>Try changing your search keywords or filter criteria.</p>
              <button className="btn-cancel margin-top" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP & TABLET DATA TABLE */}
              <div className="table-responsive desktop-view-only">
                <table className="households-table">
                  <thead>
                    <tr>
                      <th>{t('household.houseNumber')}</th>
                      <th>{t('household.houseOwner')}</th>
                      <th>Cluster</th>
                      <th>{t('household.membersCount')}</th>
                      <th>{t('household.balance')}</th>
                      <th>{t('household.status')}</th>
                      <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHouseholds.map((h) => {
                      const financials = getHouseholdFinancials(h.id);
                      const isSelected = selectedHouseholdDetails?.id === h.id;
                      return (
                        <tr
                          key={h.id}
                          className={`household-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleViewDetails(h)}
                        >
                          <td className="bold-text">
                            <span className="house-badge">{formatHouseNumber(h.house_number)}</span>
                          </td>
                          <td>
                            <div className="owner-cell">
                              <span className="owner-name">{h.house_owner_name}</span>
                              {h.house_owner_phone && (
                                <span className="phone-sub">
                                  <Phone size={11} /> {h.house_owner_phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="area-tag">{h.area || '—'}</span>
                          </td>
                          <td>
                            <span className="members-pill">
                              <Users size={12} /> {financials.membersCount}
                            </span>
                          </td>
                          <td>
                            <span className={`balance-text ${financials.balance > 0 ? 'outstanding' : 'paid'}`}>
                              {formatCurrency(financials.balance)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${h.status}`}>
                              <span className="dot"></span>
                              {t(`household.${h.status}`)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="actions-button-wrapper" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="action-icon-btn edit"
                                onClick={(e) => openEditModal(h, e)}
                                title={t('common.edit')}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="action-icon-btn delete"
                                onClick={(e) => openDeleteModal(h, e)}
                                title="Delete Household"
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

              {/* MOBILE CARD DIRECTORY VIEW */}
              <div className="mobile-cards-directory">
                {filteredHouseholds.map((h) => {
                  const financials = getHouseholdFinancials(h.id);
                  return (
                    <div
                      key={h.id}
                      className={`mobile-household-card ${selectedHouseholdDetails?.id === h.id ? 'selected' : ''}`}
                      onClick={() => handleViewDetails(h)}
                    >
                      <div className="card-head">
                        <div className="house-no-badge">{formatHouseNumber(h.house_number)}</div>
                        <span className={`status-pill ${h.status}`}>
                          <span className="dot"></span>
                          {t(`household.${h.status}`)}
                        </span>
                      </div>

                      <div className="card-body">
                        <h4 className="owner-title">{h.house_owner_name}</h4>
                        <div className="card-info-row">
                          <Phone size={13} className="info-icon" />
                          <span>{h.house_owner_phone || 'No phone'}</span>
                        </div>
                        {h.area && (
                          <div className="card-info-row">
                            <MapPin size={13} className="info-icon" />
                            <span>{h.area}</span>
                          </div>
                        )}
                      </div>

                      <div className="card-footer">
                        <div className="card-stats">
                          <span className="members-badge">
                            <Users size={12} />
                            <span>{financials.membersCount}</span>
                          </span>
                          <span className={`balance-tag ${financials.balance > 0 ? 'outstanding' : 'paid'}`}>
                            {formatCurrency(financials.balance)}
                          </span>
                        </div>

                        <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="mobile-action-btn edit"
                            onClick={(e) => openEditModal(h, e)}
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="mobile-action-btn delete"
                            onClick={(e) => openDeleteModal(h, e)}
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
      </div>

      {/* HOUSEHOLD DETAILS FINANCIAL LEDGER SIDE PANEL DRAWER */}
      <SidePanel
        isOpen={Boolean(selectedHouseholdDetails)}
        onClose={() => setSelectedHouseholdDetails(null)}
        title={`House No. ${formatHouseNumber(selectedHouseholdDetails?.house_number)}`}
        subtitle={selectedHouseholdDetails?.house_owner_name}
        icon={<Home size={20} />}
        size="lg"
        quickActions={
          selectedHouseholdDetails && (
            <button
              type="button"
              className="pill-btn-primary font-xs"
              onClick={() => {
                const h = selectedHouseholdDetails;
                setSelectedHouseholdDetails(null);
                navigate(`/admin/households/${h.id}/edit`);
              }}
            >
              <Edit2 size={13} /> Edit Household
            </button>
          )
        }
      >
        {selectedHouseholdDetails && (
          <div className="flex-col gap-md">
            {/* META DETAILS CARD */}
            <div className="form-card">
              <div className="form-card-header margin-bottom-sm">
                <Home size={16} className="text-primary" />
                <span className="form-card-title margin-left-xs">Household Information</span>
              </div>
              <div className="form-grid-2col font-xs">
                <div>
                  <div className="detail-item-label">Owner Name</div>
                  <div className="font-weight-700 font-sm text-dark">{selectedHouseholdDetails.house_owner_name}</div>
                </div>
                <div>
                  <div className="detail-item-label">Phone Number</div>
                  <div className="font-weight-600">{selectedHouseholdDetails.house_owner_phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Cluster</div>
                  <div className="font-weight-600 text-dark">{selectedHouseholdDetails.area || 'N/A'}</div>
                </div>
                <div>
                  <div className="detail-item-label">Status</div>
                  <span className={`status-pill ${selectedHouseholdDetails.status}`}>
                    <span className="dot"></span>
                    {selectedHouseholdDetails.status}
                  </span>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="detail-item-label">Address</div>
                  <div className="font-weight-600 text-dark">{selectedHouseholdDetails.address || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* FINANCIALS BREAKDOWN TABLE */}
            <div className="form-card">
              <div className="form-card-header margin-bottom-sm">
                <Users size={16} className="text-primary" />
                <span className="form-card-title margin-left-xs">Family Roster & Financial Summary</span>
              </div>

              <div className="members-ledger-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="mini-ledger-table" style={{ width: '100%', fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Member Name</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Due</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Paid</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {householdMembersDetails.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="no-data-cell" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                          No members added to this household yet.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {householdMembersDetails.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>
                              {m.name} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>({m.relationship})</span>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(m.totalDue)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#00966b', fontWeight: 700 }}>{formatCurrency(m.totalPaid)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: m.balance > 0 ? '#dc2626' : '#00966b', fontWeight: 800 }}>
                              {formatCurrency(m.balance)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 8px', color: '#0f172a' }}>Consolidated Total</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatCurrency(householdMembersDetails.reduce((sum, m) => sum + m.totalDue, 0))}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: '#00966b' }}>{formatCurrency(householdMembersDetails.reduce((sum, m) => sum + m.totalPaid, 0))}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: householdMembersDetails.reduce((sum, m) => sum + m.balance, 0) > 0 ? '#dc2626' : '#00966b', fontSize: '14px' }}>
                            {formatCurrency(householdMembersDetails.reduce((sum, m) => sum + m.balance, 0))}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </SidePanel>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={isDeleteModalOpen && Boolean(householdToDelete)}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Household?"
        message={
          <>
            Are you sure you want to delete household <strong>{formatHouseNumber(householdToDelete?.house_number)}</strong> ({householdToDelete?.house_owner_name})? This action cannot be undone.
          </>
        }
        confirmText="Delete Household"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* HOUSEHOLD DETAILS MODAL */}
      <HouseholdDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setHouseholdForDetails(null);
        }}
        household={householdForDetails}
        onGrantAccess={(m) => {
          setMemberForAccess(m);
          setIsGrantModalOpen(true);
        }}
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

      {/* STYLES */}
      <style>{`
        .households-page {
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

        .page-header-actions h3 {
          font-size: 22px;
          font-weight: 800;
          color: #111827;
        }

        .page-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

        .header-cta-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

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

        /* TOOLBAR FILTER BAR */
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

        .report-export-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: var(--radius-pill);
          background: #ecfdf5;
          color: #00966b;
          border: 1px solid #a7f3d0;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .report-export-btn:hover { background: #d1fae5; }

        /* MAIN CONTENT SPLIT */
        .households-content-split {
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
        .households-table { width: 100%; border-collapse: collapse; text-align: left; }

        .households-table th {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 14px 16px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .households-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          border-bottom: 1px solid #f3f4f6;
          color: #111827;
        }

        .household-row { cursor: pointer; transition: var(--transition-all); }
        .household-row:hover { background-color: #f9fafb; }
        .household-row.selected { background-color: #ecfdf5; }

        .house-tag {
          font-weight: 800;
          color: #00966b;
          background: #ecfdf5;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #a7f3d0;
          font-size: 13px;
        }

        .owner-profile-td { display: flex; flex-direction: column; }
        .owner-name { font-weight: 700; color: #111827; }
        .owner-phone-sub { font-size: 11px; color: #6b7280; margin-top: 2px; display: flex; align-items: center; gap: 4px; }

        .area-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #4b5563;
          background: #f3f4f6;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .members-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background-color: #ecfdf5;
          color: #00966b;
          border-radius: var(--radius-pill);
          font-size: 12.5px;
          font-weight: 700;
        }

        .balance-td { font-weight: 800; }
        .balance-td.outstanding { color: #dc2626; }
        .balance-td.paid { color: #059669; }

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

        .mobile-household-card {
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

        .mobile-household-card.selected { border-color: var(--primary); background: #f0fdf4; }
        .mobile-household-card .card-head { display: flex; align-items: center; justify-content: space-between; }

        .house-no-badge {
          font-weight: 800;
          color: #00966b;
          background: #ecfdf5;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #a7f3d0;
          font-size: 13px;
        }

        .owner-title { font-size: 16px; font-weight: 800; color: #111827; }
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

        .card-stats { display: flex; align-items: center; gap: 10px; }
        .balance-tag { font-weight: 800; font-size: 13px; }
        .balance-tag.outstanding { color: #dc2626; }
        .balance-tag.paid { color: #059669; }

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
          margin-bottom: 20px;
          border: 1px solid #f3f4f6;
        }

        .meta-item { display: flex; justify-content: space-between; align-items: center; }
        .meta-label { font-size: 12px; color: #6b7280; font-weight: 600; }
        .meta-value { font-size: 13px; font-weight: 700; color: #111827; }

        .financials-breakdown h5 { font-size: 14px; font-weight: 800; margin-bottom: 12px; color: #111827; }
        .members-ledger-table-wrapper { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: var(--radius-md); }

        .mini-ledger-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
        .mini-ledger-table th { padding: 10px 12px; background: #f9fafb; color: #6b7280; font-weight: 700; border-bottom: 1px solid #e5e7eb; }
        .mini-ledger-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #111827; }

        .rel-tag { font-size: 10px; color: #9ca3af; }
        .mini-ledger-table td.outstanding { color: #dc2626; font-weight: 800; }
        .consolidated-total-row { background-color: #ecfdf5; font-weight: 800; }
        .consolidated-total-row td { border-bottom: none; }
        .grand-balance { color: #dc2626; font-weight: 800; }

        /* MODAL DIALOGS */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(17, 24, 39, 0.55);
          backdrop-filter: blur(4px);
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }

        .modal-dialog-card {
          width: 100%;
          max-width: 540px;
          background: #ffffff;
          border-radius: var(--radius-xl);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          border: 1px solid var(--border-color);
          box-sizing: border-box;
        }

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

        .form-row-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12.5px; font-weight: 700; color: #374151; }

        .form-group input, .form-group textarea {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
        }

        .form-group input:focus, .form-group textarea:focus {
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

        /* ── RESPONSIVE STYLES FOR SAMSUNG GALAXY S8 & SMALL SMARTPHONES ── */
        @media (max-width: 991px) {
          .households-content-split { flex-direction: column; }
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

          .filter-select-wrapper select, .report-export-btn {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
        }

        @media (max-width: 640px) {
          .desktop-view-only { display: none; }
          .mobile-cards-directory { display: flex; }

          .filter-selectors-grid {
            grid-template-columns: 1fr;
          }

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

      {/* IMPORT EXCEL / CSV MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Household Records"
        subtitle="Batch import household directory using Excel or CSV file."
        icon={<FileSpreadsheet size={20} className="text-emerald" />}
        size="md"
        footer={
          <div className="flex-between width-100 align-items-center">
            <button
              type="button"
              className="pill-btn-ghost font-xs flex-row-gap-xs"
              onClick={downloadHouseholdSampleCSV}
            >
              <Download size={14} /> Download Sample Template
            </button>
            <button
              type="button"
              className="pill-btn-primary font-xs"
              onClick={() => {
                showToast('success', 'Demo mode: Upload formatted CSV matching sample template.');
                setIsImportModalOpen(false);
              }}
            >
              Import File
            </button>
          </div>
        }
      >
        <div className="flex-col gap-md">
          <div className="form-card bg-emerald-soft" style={{ padding: '16px', borderRadius: '12px' }}>
            <div className="flex-row-gap-sm align-items-center">
              <FileSpreadsheet size={24} className="text-emerald" />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Excel / CSV Import Format</h4>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#475569' }}>
                  Ensure your file includes columns: <code>house_number</code>, <code>house_owner_name</code>, <code>primary_contact_phone</code>, <code>cluster_or_area</code>, <code>status</code>.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '14px',
              padding: '32px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv, .xlsx, .xls';
              input.onchange = (e: any) => {
                const file = e.target?.files?.[0];
                if (file) {
                  showToast('success', `Selected file: ${file.name}`);
                }
              };
              input.click();
            }}
          >
            <Upload size={32} className="text-muted margin-bottom-xs" />
            <div className="font-weight-700 font-sm text-dark">Click to browse or drag & drop CSV file</div>
            <span className="font-xs color-subtle">Supports .csv and .xlsx spreadsheets up to 10MB</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Households;
