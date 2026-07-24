import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import type { Household, Member, Notification } from '../../services/db';
import { 
  Plus, Edit2, Trash2, Search, Filter, Bell, X, AlertCircle, 
  CheckCircle, Download, Loader2, Globe 
} from 'lucide-react';

export const Notifications: React.FC = () => {
  const { t, language } = useTranslation();
  const { user } = useAuth();

  // Data States
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentNotifId, setCurrentNotifId] = useState<string | null>(null);

  // Active Language Tab in Form ('en' | 'ml')
  const [activeFormLang, setActiveFormLang] = useState<'en' | 'ml'>('en');

  // Form Fields
  const [titleEn, setTitleEn] = useState('');
  const [msgEn, setMsgEn] = useState('');
  const [titleMl, setTitleMl] = useState('');
  const [msgMl, setMsgMl] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'pending' | 'arrears' | 'household' | 'member'>('all');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [notifType, setNotifType] = useState<'payment_recorded' | 'payment_reminder' | 'arrears_reminder' | 'announcement'>('announcement');

  // Form Validation & Saving States
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState<Notification | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Notification Details & Preview Language
  const [selectedNotifDetails, setSelectedNotifDetails] = useState<Notification | null>(null);
  const [previewLang, setPreviewLang] = useState<'en' | 'ml'>('en');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [houseList, memberList, notifList] = await Promise.all([
        db.households.get(),
        db.members.get(),
        db.notifications.get(),
      ]);
      setHouseholds(houseList);
      setMembers(memberList);
      setNotifications(notifList);
    } catch (err) {
      console.error('Failed to load notifications page data:', err);
      showToast('error', 'Unable to load notification records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync preview language with global language on initial load
  useEffect(() => {
    setPreviewLang(language === 'ml' ? 'ml' : 'en');
  }, [language]);

  // Update target dropdown when target type changes
  useEffect(() => {
    if (targetType === 'household') {
      setSelectedTargetId(households[0]?.id || '');
    } else if (targetType === 'member') {
      setSelectedTargetId(members[0]?.id || '');
    } else {
      setSelectedTargetId('');
    }
  }, [targetType, households, members]);

  // Open Record Add Modal
  const openAddModal = () => {
    setModalMode('add');
    setCurrentNotifId(null);
    setActiveFormLang('en');
    setTitleEn('');
    setMsgEn('');
    setTitleMl('');
    setMsgMl('');
    setTargetType('all');
    setSelectedTargetId('');
    setNotifType('announcement');
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (notif: Notification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setCurrentNotifId(notif.id);
    setActiveFormLang('en');
    setTitleEn(notif.title_en);
    setMsgEn(notif.message_en);
    setTitleMl(notif.title_ml);
    setMsgMl(notif.message_ml);
    setNotifType(notif.type as any);
    setFieldErrors({});
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifToDelete(notif);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Notification
  const handleConfirmDelete = async () => {
    if (!notifToDelete) return;
    setIsDeleting(true);
    try {
      await db.notifications.delete(notifToDelete.id);
      showToast('success', '✓ Notification deleted successfully.');
      setIsDeleteModalOpen(false);
      setNotifToDelete(null);
      if (selectedNotifDetails?.id === notifToDelete.id) {
        setSelectedNotifDetails(null);
      }
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete notification record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Validate Form Fields
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!titleEn && !titleMl) {
      errors.title = 'Notification title is required in at least one language.';
    }

    if (!msgEn && !msgMl) {
      errors.message = 'Notification message is required in at least one language.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Notification Form
  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const payload = {
        title_en: titleEn.trim() || titleMl.trim(),
        message_en: msgEn.trim() || msgMl.trim(),
        title_ml: titleMl.trim() || titleEn.trim(),
        message_ml: msgMl.trim() || msgEn.trim(),
        type: notifType,
        created_by: user?.id || '00000000-0000-0000-0000-000000000001',
      };

      if (modalMode === 'add') {
        let broadcastTarget = targetType as string;
        if (targetType === 'household' || targetType === 'member') {
          broadcastTarget = selectedTargetId;
        }

        await db.notifications.createBroadcast(payload, broadcastTarget);
        showToast('success', '✓ Notification dispatched successfully.');
      } else if (currentNotifId) {
        await db.notifications.update(currentNotifId, payload);
        showToast('success', '✓ Notification updated successfully.');
      }

      setIsModalOpen(false);
      loadData();

      if (selectedNotifDetails && selectedNotifDetails.id === currentNotifId) {
        const updatedN = await db.notifications.getById(currentNotifId);
        setSelectedNotifDetails(updatedN);
      }
    } catch (err: any) {
      setFormError(err.message || 'Unable to save notification. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic CSV Report Export
  const handleDownloadReport = () => {
    if (filteredNotifications.length === 0) {
      showToast('error', 'No notification records to export.');
      return;
    }

    setIsExporting(true);

    setTimeout(() => {
      try {
        const headers = [
          'Notification ID',
          'Title (English)',
          'Message (English)',
          'Title (Malayalam)',
          'Message (Malayalam)',
          'Classification Type',
          'Created Date',
        ];

        const rows = filteredNotifications.map((n) => [
          `"${n.id}"`,
          `"${(n.title_en || '').replace(/"/g, '""')}"`,
          `"${(n.message_en || '').replace(/"/g, '""')}"`,
          `"${(n.title_ml || '').replace(/"/g, '""')}"`,
          `"${(n.message_ml || '').replace(/"/g, '""')}"`,
          `"${n.type.toUpperCase()}"`,
          `"${new Date(n.created_at).toLocaleDateString()}"`,
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Mahallu_Notifications_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('success', '✓ Notifications Report downloaded successfully!');
      } catch (err) {
        showToast('error', 'Failed to generate report.');
      } finally {
        setIsExporting(false);
      }
    }, 600);
  };

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        n.title_en.toLowerCase().includes(q) ||
        n.message_en.toLowerCase().includes(q) ||
        n.title_ml.toLowerCase().includes(q) ||
        n.message_ml.toLowerCase().includes(q);

      const matchesType = selectedType ? n.type === selectedType : true;

      return matchesSearch && matchesType;
    });
  }, [notifications, searchQuery, selectedType]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
  };

  return (
    <div className="notifications-page animate-fade-in">
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
          <h3>{t('notifications.notificationsTitle')}</h3>
          <p className="page-subtitle">Publish bilingual announcements, subscription reminders, and general notices to members.</p>
        </div>

        <div className="header-cta-group">
          <button className="add-btn primary-btn" onClick={openAddModal}>
            <Plus size={16} />
            <span>Send Notification</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="filter-bar glass-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search notification title or content..."
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
            <Filter size={15} className="select-icon" />
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">Classification: All</option>
              <option value="announcement">General Announcement</option>
              <option value="payment_reminder">Payment Reminder</option>
              <option value="arrears_reminder">Arrears Reminder</option>
              <option value="payment_recorded">Payment Recorded Receipt</option>
            </select>
          </div>

          <button 
            className="report-export-btn" 
            onClick={handleDownloadReport} 
            disabled={isExporting}
            title="Download Notifications CSV Report"
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

          {(searchQuery || selectedType) && (
            <button className="clear-filters-link" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="notifications-content-split">
        {/* NOTIFICATIONS TABLE & MOBILE DIRECTORY */}
        <div className={`table-container-card glass-card ${selectedNotifDetails ? 'narrow' : ''}`}>
          {loading ? (
            <div className="skeleton-loading-container">
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          ) : notifications.length === 0 ? (
            /* EMPTY STATE 1: NO NOTIFICATIONS IN DATABASE */
            <div className="empty-state-card">
              <div className="empty-state-icon emerald">
                <Bell size={32} />
              </div>
              <h4>No notifications published yet</h4>
              <p>Broadcast announcements or subscription reminders to members.</p>
              <button className="add-btn primary-btn margin-top" onClick={openAddModal}>
                <Plus size={16} />
                <span>Send Notification</span>
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* EMPTY STATE 2: SEARCH / FILTER RETURNS 0 RESULTS */
            <div className="empty-state-card">
              <div className="empty-state-icon neutral">
                <Search size={32} />
              </div>
              <h4>No matching notifications</h4>
              <p>Try changing your search keywords or filter criteria.</p>
              <button className="btn-cancel margin-top" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP & TABLET DATA TABLE */}
              <div className="table-responsive desktop-view-only">
                <table className="notifications-table">
                  <thead>
                    <tr>
                      <th>Notification Title</th>
                      <th>Message Preview</th>
                      <th>Type</th>
                      <th>Published Date</th>
                      <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotifications.map((notif) => {
                      const isSelected = selectedNotifDetails?.id === notif.id;
                      const activeTitle = language === 'ml' && notif.title_ml ? notif.title_ml : notif.title_en;
                      const activeMsg = language === 'ml' && notif.message_ml ? notif.message_ml : notif.message_en;

                      return (
                        <tr
                          key={notif.id}
                          className={`notif-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedNotifDetails(notif)}
                        >
                          <td className="bold-text">
                            <div className="title-td-box">
                              <span>{activeTitle}</span>
                              {notif.title_ml && notif.title_en && (
                                <span className="bilingual-badge">Bilingual</span>
                              )}
                            </div>
                          </td>
                          <td className="msg-preview-td">
                            {activeMsg}
                          </td>
                          <td>
                            <span className={`type-pill ${notif.type}`}>
                              <Bell size={11} />
                              {notif.type.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(notif.created_at).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="actions-button-wrapper" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="action-icon-btn edit"
                                onClick={(e) => openEditModal(notif, e)}
                                title={t('common.edit')}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="action-icon-btn delete"
                                onClick={(e) => openDeleteModal(notif, e)}
                                title="Delete Notification"
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

              {/* MOBILE NOTIFICATIONS CARDS DIRECTORY VIEW */}
              <div className="mobile-cards-directory">
                {filteredNotifications.map((notif) => {
                  const isSelected = selectedNotifDetails?.id === notif.id;
                  const activeTitle = language === 'ml' && notif.title_ml ? notif.title_ml : notif.title_en;
                  const activeMsg = language === 'ml' && notif.message_ml ? notif.message_ml : notif.message_en;

                  return (
                    <div
                      key={notif.id}
                      className={`mobile-notif-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedNotifDetails(notif)}
                    >
                      <div className="card-head">
                        <div>
                          <h4 className="notif-title">{activeTitle}</h4>
                          <span className="notif-date">{new Date(notif.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className={`type-pill ${notif.type}`}>
                          <Bell size={11} />
                          {notif.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="card-body">
                        <p className="card-msg">{activeMsg}</p>
                      </div>

                      <div className="card-footer">
                        <span className="sub-id-tag">ID: {notif.id.slice(0, 12)}</span>
                        <div className="mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="mobile-action-btn edit" onClick={(e) => openEditModal(notif, e)}>
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button className="mobile-action-btn delete" onClick={(e) => openDeleteModal(notif, e)}>
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

        {/* SELECTED NOTIFICATION PREVIEW SIDE PANEL */}
        {selectedNotifDetails && (
          <div className="details-panel-card glass-card">
            <div className="panel-header">
              <div className="panel-title-wrapper">
                <div className="panel-icon-box">
                  <Bell size={20} color="#00966b" />
                </div>
                <div>
                  <h4>Notification Preview</h4>
                  <p>{new Date(selectedNotifDetails.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                className="panel-close-btn"
                onClick={() => setSelectedNotifDetails(null)}
                aria-label="Close notification preview panel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="panel-body">
              {/* BILINGUAL PREVIEW SWITCHER */}
              <div className="preview-lang-tabs">
                <button
                  type="button"
                  className={`preview-tab-btn ${previewLang === 'en' ? 'active' : ''}`}
                  onClick={() => setPreviewLang('en')}
                >
                  <span>English</span>
                </button>
                <button
                  type="button"
                  className={`preview-tab-btn ${previewLang === 'ml' ? 'active' : ''}`}
                  onClick={() => setPreviewLang('ml')}
                >
                  <span>മലയാളം</span>
                </button>
              </div>

              <div className="details-meta-section">
                <div className="meta-item-stacked">
                  <span className="meta-label">Title ({previewLang.toUpperCase()})</span>
                  <h4 className="meta-title">
                    {previewLang === 'ml'
                      ? selectedNotifDetails.title_ml || selectedNotifDetails.title_en
                      : selectedNotifDetails.title_en || selectedNotifDetails.title_ml}
                  </h4>
                </div>

                <div className="meta-item-stacked">
                  <span className="meta-label">Message Content ({previewLang.toUpperCase()})</span>
                  <p className="meta-content">
                    {previewLang === 'ml'
                      ? selectedNotifDetails.message_ml || selectedNotifDetails.message_en
                      : selectedNotifDetails.message_en || selectedNotifDetails.message_ml}
                  </p>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Classification</span>
                  <span className={`type-pill ${selectedNotifDetails.type}`}>
                    {selectedNotifDetails.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RECORD / EDIT NOTIFICATION MODAL DIALOG */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card animate-scale-up">
            <div className="modal-header">
              <div>
                <h4>{modalMode === 'add' ? 'Send Notification' : 'Edit Notification'}</h4>
                <p className="modal-subtitle">
                  {modalMode === 'add'
                    ? 'Broadcast announcements or subscription reminders to members.'
                    : 'Update notification title or bilingual message content.'}
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close Notification dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNotification} className="modal-form">
              {formError && (
                <div className="form-alert error">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* BILINGUAL LANGUAGE TABS */}
              <div className="form-lang-tabs-wrapper">
                <div className="form-lang-tabs">
                  <button
                    type="button"
                    className={`form-lang-tab ${activeFormLang === 'en' ? 'active' : ''}`}
                    onClick={() => setActiveFormLang('en')}
                  >
                    <Globe size={14} />
                    <span>English Content</span>
                    <span className={`completion-badge ${titleEn.trim() && msgEn.trim() ? 'complete' : 'pending'}`}>
                      {titleEn.trim() && msgEn.trim() ? '✓ Complete' : '○ Optional'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`form-lang-tab ${activeFormLang === 'ml' ? 'active' : ''}`}
                    onClick={() => setActiveFormLang('ml')}
                  >
                    <Globe size={14} />
                    <span>മലയാളം ഉള്ളടക്കം</span>
                    <span className={`completion-badge ${titleMl.trim() && msgMl.trim() ? 'complete' : 'pending'}`}>
                      {titleMl.trim() && msgMl.trim() ? '✓ Complete' : '○ Optional'}
                    </span>
                  </button>
                </div>
              </div>

              {/* ENGLISH FORM FIELDS */}
              {activeFormLang === 'en' && (
                <div className="lang-fields-container animate-fade-in">
                  <div className="form-group">
                    <label htmlFor="title-en-input">{t('notifications.titleEnLabel')} *</label>
                    <input
                      id="title-en-input"
                      type="text"
                      placeholder="e.g. Monthly Subscription Fee Reminder"
                      value={titleEn}
                      className={fieldErrors.title ? 'input-error' : ''}
                      onChange={(e) => {
                        setTitleEn(e.target.value);
                        if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: '' });
                      }}
                    />
                    {fieldErrors.title && (
                      <span className="field-error-text">⚠ {fieldErrors.title}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="msg-en-input">{t('notifications.messageEnLabel')} *</label>
                    <textarea
                      id="msg-en-input"
                      rows={4}
                      placeholder="Enter the notification announcement message in English..."
                      value={msgEn}
                      className={fieldErrors.message ? 'input-error' : ''}
                      onChange={(e) => {
                        setMsgEn(e.target.value);
                        if (fieldErrors.message) setFieldErrors({ ...fieldErrors, message: '' });
                      }}
                    />
                    {fieldErrors.message && (
                      <span className="field-error-text">⚠ {fieldErrors.message}</span>
                    )}
                  </div>
                </div>
              )}

              {/* MALAYALAM FORM FIELDS */}
              {activeFormLang === 'ml' && (
                <div className="lang-fields-container animate-fade-in">
                  <div className="form-group">
                    <label htmlFor="title-ml-input">{t('notifications.titleMlLabel')} *</label>
                    <input
                      id="title-ml-input"
                      type="text"
                      placeholder="ഉദാ: മാസത്തിലെ സബ്സ്ക്രിപ്ഷൻ ഓർമ്മപ്പെടുത്തൽ"
                      value={titleMl}
                      className={fieldErrors.title ? 'input-error' : ''}
                      onChange={(e) => {
                        setTitleMl(e.target.value);
                        if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: '' });
                      }}
                    />
                    {fieldErrors.title && (
                      <span className="field-error-text">⚠ {fieldErrors.title}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="msg-ml-input">{t('notifications.messageMlLabel')} *</label>
                    <textarea
                      id="msg-ml-input"
                      rows={4}
                      placeholder="വിവരങ്ങൾ മലയാളത്തിൽ ഇവിടെ രേഖപ്പെടുത്തുക..."
                      value={msgMl}
                      className={fieldErrors.message ? 'input-error' : ''}
                      onChange={(e) => {
                        setMsgMl(e.target.value);
                        if (fieldErrors.message) setFieldErrors({ ...fieldErrors, message: '' });
                      }}
                    />
                    {fieldErrors.message && (
                      <span className="field-error-text">⚠ {fieldErrors.message}</span>
                    )}
                  </div>
                </div>
              )}

              {modalMode === 'add' && (
                <>
                  <div className="form-section-title margin-top-sm">Audience & Target Selection</div>

                  <div className="form-row-grid">
                    <div className="form-group">
                      <label htmlFor="target-audience-select">{t('notifications.targetAudience')}</label>
                      <select
                        id="target-audience-select"
                        value={targetType}
                        onChange={(e) => setTargetType(e.target.value as any)}
                      >
                        <option value="all">{t('notifications.targetAll')}</option>
                        <option value="pending">{t('notifications.targetPending')}</option>
                        <option value="arrears">{t('notifications.targetArrears')}</option>
                        <option value="household">{t('notifications.targetHousehold')}</option>
                        <option value="member">{t('notifications.targetMember')}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="notif-type-select">Announcement Classification</label>
                      <select
                        id="notif-type-select"
                        value={notifType}
                        onChange={(e) => setNotifType(e.target.value as any)}
                      >
                        <option value="announcement">General Announcement</option>
                        <option value="payment_reminder">Payment Reminder</option>
                        <option value="arrears_reminder">Arrears Reminder</option>
                        <option value="payment_recorded">Payment Recorded Receipt</option>
                      </select>
                    </div>
                  </div>

                  {targetType === 'household' && (
                    <div className="form-group">
                      <label htmlFor="target-house-select">Select Target Household</label>
                      <select
                        id="target-house-select"
                        value={selectedTargetId}
                        onChange={(e) => setSelectedTargetId(e.target.value)}
                      >
                        {households.map((h) => (
                          <option key={h.id} value={h.id}>
                            House No. H-{h.house_number} ({h.house_owner_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {targetType === 'member' && (
                    <div className="form-group">
                      <label htmlFor="target-member-select">Select Target Member</label>
                      <select
                        id="target-member-select"
                        value={selectedTargetId}
                        onChange={(e) => setSelectedTargetId(e.target.value)}
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.relationship})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn submit-pill-btn" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Sending Notification...</span>
                    </>
                  ) : (
                    <span>{modalMode === 'add' ? 'Send Notification' : 'Update Notification'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && notifToDelete && (
        <div className="modal-overlay">
          <div className="modal-dialog-card delete-card animate-scale-up">
            <div className="delete-card-body">
              <div className="delete-header">
                <div className="delete-badge-icon">
                  <Trash2 size={22} color="#dc2626" />
                </div>
                <div>
                  <h4>Delete Notification?</h4>
                  <p className="delete-subtitle">
                    Are you sure you want to delete notification broadcast{' '}
                    <strong>"{notifToDelete.title_en || notifToDelete.title_ml}"</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="delete-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="delete-danger-btn"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Notification</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .notifications-page {
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

        .completion-badge {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          margin-left: 4px;
        }
        .completion-badge.complete { background: #d1fae5; color: #065f46; }
        .completion-badge.pending { background: #f3f4f6; color: #9ca3af; }

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

        .header-cta-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

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
          padding: 10px 32px 10px 36px;
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
        .notifications-content-split {
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
        .notifications-table { width: 100%; border-collapse: collapse; text-align: left; }

        .notifications-table th {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 14px 16px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .notifications-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          border-bottom: 1px solid #f3f4f6;
          color: #111827;
        }

        .notif-row { cursor: pointer; transition: var(--transition-all); }
        .notif-row:hover { background-color: #f9fafb; }
        .notif-row.selected { background-color: #ecfdf5; }

        .title-td-box { display: flex; flex-direction: column; gap: 2px; }
        .bilingual-badge { font-size: 10px; font-weight: 700; color: #00966b; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; width: fit-content; }

        .msg-preview-td {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #6b7280;
        }

        .type-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          background: #ecfdf5;
          color: #00966b;
          border: 1px solid #a7f3d0;
        }

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

        /* MOBILE NOTIFICATION CARDS DIRECTORY VIEW */
        .mobile-cards-directory {
          display: none;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
        }

        .mobile-notif-card {
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

        .mobile-notif-card.selected { border-color: var(--primary); background: #f0fdf4; }
        .mobile-notif-card .card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }

        .notif-title { font-size: 15px; font-weight: 800; color: #111827; }
        .notif-date { font-size: 11.5px; color: #6b7280; }
        .card-msg { font-size: 13px; color: #4b5563; line-height: 1.4; }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid #f3f4f6;
        }

        .sub-id-tag { font-size: 11px; color: #9ca3af; }
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

        /* DETAILS SUMMARY PANEL */
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

        .preview-lang-tabs {
          display: flex;
          gap: 6px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: var(--radius-pill);
          margin-bottom: 14px;
        }

        .preview-tab-btn {
          flex: 1;
          padding: 8px;
          border-radius: var(--radius-pill);
          border: none;
          background: transparent;
          color: #4b5563;
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .preview-tab-btn.active {
          background: #ffffff;
          color: #00966b;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }

        .details-meta-section {
          background: #f9fafb;
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border: 1px solid #f3f4f6;
        }

        .meta-item-stacked { display: flex; flex-direction: column; gap: 4px; }
        .meta-label { font-size: 11px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-title { font-size: 16px; font-weight: 800; color: #111827; }
        .meta-content { font-size: 13.5px; color: #374151; line-height: 1.5; white-space: pre-wrap; }

        /* BILINGUAL FORM TABS */
        .form-lang-tabs-wrapper { margin-bottom: 4px; }

        .form-lang-tabs {
          display: flex;
          gap: 8px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: var(--radius-pill);
        }

        .form-lang-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: var(--radius-pill);
          border: none;
          background: transparent;
          color: #4b5563;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .form-lang-tab.active {
          background: #ffffff;
          color: #00966b;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .lang-fields-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

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
          max-width: 560px;
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
        .margin-top-sm { margin-top: 6px; }

        .form-row-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12.5px; font-weight: 700; color: #374151; }

        .form-group input, .form-group select, .form-group textarea {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
        }

        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none; border-color: var(--primary); background: #ffffff; box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12);
        }

        .input-error { border-color: #ef4444 !important; background: #fff5f5 !important; }
        .field-error-text { font-size: 11px; font-weight: 600; color: #dc2626; }

        .form-alert { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px; }
        .form-alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

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
          .notifications-content-split { flex-direction: column; }
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

export default Notifications;
