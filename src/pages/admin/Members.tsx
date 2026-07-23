import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../services/db';
import type { Household, Member, Profile } from '../../services/db';
import { Plus, Edit2, Search, Filter, X, AlertCircle, Smartphone } from 'lucide-react';

export const Members: React.FC = () => {
  const { t } = useTranslation();

  // Data States
  const [members, setMembers] = useState<Member[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHousehold, setSelectedHousehold] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Fields
  const [householdId, setHouseholdId] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Son');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [enableLogin, setEnableLogin] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [memberList, houseList, profileList] = await Promise.all([
        db.members.get(),
        db.households.get(),
        db.profiles.get(),
      ]);
      setMembers(memberList);
      setHouseholds(houseList);
      setProfiles(profileList);
    } catch (err) {
      console.error('Failed to load members page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setCurrentId(null);
    setHouseholdId(households[0]?.id || '');
    setName('');
    setRelationship('Son');
    setPhone('');
    setEmail('');
    setStatus('active');
    setEnableLogin(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (m: Member) => {
    setModalMode('edit');
    setCurrentId(m.id);
    setHouseholdId(m.household_id);
    setName(m.name);
    setRelationship(m.relationship);
    setPhone(m.phone || '');
    setEmail(m.email || '');
    setStatus(m.status);
    setEnableLogin(m.user_id !== null);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name || !householdId) {
      setFormError('Member name and household selection are required.');
      return;
    }

    try {
      let userId: string | null = null;
      
      if (enableLogin) {
        if (!phone) {
          setFormError('Phone number is required to enable portal login.');
          return;
        }

        // Search for an existing profile with this phone
        const existingProf = profiles.find(p => p.phone === phone);
        if (existingProf) {
          userId = existingProf.id;
        } else {
          // In mock, create a new profile for the member
          const profileId = 'user-' + Math.random().toString(36).substr(2, 9);
          const newProfile: Profile = {
            id: profileId,
            name,
            phone,
            email: email || null,
            role: 'member',
            language: 'en',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Get current lists, push, and save
          const currentProfs = JSON.parse(localStorage.getItem('mahal_profiles') || '[]');
          currentProfs.push(newProfile);
          localStorage.setItem('mahal_profiles', JSON.stringify(currentProfs));
          userId = profileId;
        }
      }

      const data = {
        household_id: householdId,
        name,
        relationship,
        phone: phone || null,
        email: email || null,
        status,
        user_id: userId
      };

      if (modalMode === 'add') {
        await db.members.create(data);
      } else if (currentId) {
        // If disabling login, we clear the user_id link
        if (!enableLogin && currentId) {
          data.user_id = null;
        }
        await db.members.update(currentId, data);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    }
  };

  const filteredMembers = members.filter((m) => {
    const house = households.find((h) => h.id === m.household_id);
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(searchQuery)) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (house && house.house_number.includes(searchQuery));
    
    const matchesHousehold = selectedHousehold ? m.household_id === selectedHousehold : true;
    const matchesRelationship = selectedRelationship ? m.relationship === selectedRelationship : true;
    const matchesStatus = selectedStatus ? m.status === selectedStatus : true;

    return matchesSearch && matchesHousehold && matchesRelationship && matchesStatus;
  });

  const relationships = [
    'Self (Owner)', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'
  ];

  return (
    <div className="members-page">
      <div className="page-header-actions">
        <h3>{t('member.membersTitle')}</h3>
        <button className="add-btn primary-btn" onClick={openAddModal}>
          <Plus size={16} />
          <span>{t('member.addMember')}</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar glass-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, house no, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-selectors">
          <div className="filter-select-wrapper">
            <Filter size={16} className="select-icon" />
            <select value={selectedHousehold} onChange={(e) => setSelectedHousehold(e.target.value)}>
              <option value="">House: All</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>House No. {h.house_number}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Filter size={16} className="select-icon" />
            <select value={selectedRelationship} onChange={(e) => setSelectedRelationship(e.target.value)}>
              <option value="">Relationship: All</option>
              {relationships.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Filter size={16} className="select-icon" />
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Status: All</option>
              <option value="active">{t('member.active')}</option>
              <option value="inactive">{t('member.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* MEMBERS LIST TABLE */}
      <div className="table-container-card glass-card">
        {loading ? (
          <div className="loading-text">{t('common.loading')}</div>
        ) : (
          <div className="table-responsive">
            <table className="members-table">
              <thead>
                <tr>
                  <th>{t('member.memberName')}</th>
                  <th>{t('household.houseNumber')}</th>
                  <th>{t('member.relationship')}</th>
                  <th>{t('member.phoneNumber')}</th>
                  <th>Portal Login</th>
                  <th>{t('member.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data-cell">{t('common.noData')}</td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const house = households.find((h) => h.id === m.household_id);
                    return (
                      <tr key={m.id}>
                        <td className="bold-text">{m.name}</td>
                        <td>{house ? `House No. ${house.house_number}` : 'N/A'}</td>
                        <td>{m.relationship}</td>
                        <td>{m.phone || '—'}</td>
                        <td>
                          <span className={`login-status-pill ${m.user_id ? 'enabled' : 'disabled'}`}>
                            <Smartphone size={12} />
                            {m.user_id ? t('member.loginEnabled') : t('member.loginDisabled')}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${m.status}`}>
                            {t(`member.${m.status}`)}
                          </span>
                        </td>
                        <td>
                          <div className="actions-button-wrapper">
                            <button 
                              className="action-icon-btn edit" 
                              onClick={() => openEditModal(m)}
                              title={t('common.edit')}
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container animate-fade-in">
            <div className="modal-header">
              <h4>{modalMode === 'add' ? t('member.addMember') : t('member.editMember')}</h4>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="modal-form">
              {formError && (
                <div className="form-alert error">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="member-name-input">{t('member.memberName')} *</label>
                  <input
                    id="member-name-input"
                    type="text"
                    required
                    placeholder="e.g., Ameer Ashraf"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="household-select">Household Association *</label>
                  <select
                    id="household-select"
                    value={householdId}
                    onChange={(e) => setHouseholdId(e.target.value)}
                  >
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>House No. {h.house_number} ({h.house_owner_name})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="relationship-select">{t('member.relationship')} *</label>
                  <select
                    id="relationship-select"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  >
                    {relationships.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="member-phone-input">{t('member.phoneNumber')}</label>
                  <input
                    id="member-phone-input"
                    type="tel"
                    placeholder="e.g., 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="member-email-input">{t('member.email')}</label>
                <input
                  id="member-email-input"
                  type="email"
                  placeholder="e.g., member@mahal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{t('member.status')}</label>
                <div className="radio-selection">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'active'}
                      onChange={() => setStatus('active')}
                    />
                    <span>{t('member.active')}</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'inactive'}
                      onChange={() => setStatus('inactive')}
                    />
                    <span>{t('member.inactive')}</span>
                  </label>
                </div>
              </div>

              {/* Portal Login Checkbox */}
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={enableLogin}
                    onChange={(e) => setEnableLogin(e.target.checked)}
                  />
                  <div>
                    <span>{t('member.enableLogin')}</span>
                    <p className="checkbox-hint">Allow this member to securely log in using their phone number and OTP.</p>
                  </div>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel back-btn" onClick={() => setIsModalOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-submit primary-btn">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .members-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .page-header-actions h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
        }

        /* FILTER BAR */
        .filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 250px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
        }

        .search-box input {
          width: 100%;
          padding: 10px 10px 10px 42px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-app);
          color: var(--text-main);
          transition: var(--transition-all);
        }

        .search-box input:focus {
          outline: none;
          border-color: var(--primary);
          background: var(--bg-card);
        }

        .filter-selectors {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .filter-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .filter-select-wrapper select {
          padding: 10px 32px 10px 36px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-app);
          color: var(--text-main);
          appearance: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }

        /* TABLE */
        .table-container-card {
          padding: 24px;
        }

        .members-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .members-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px;
          background-color: var(--bg-app);
          border-bottom: 1px solid var(--border-color);
        }

        .members-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .bold-text {
          font-weight: 600;
        }

        .login-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }

        .login-status-pill.enabled {
          background-color: var(--success-bg);
          color: var(--success);
        }

        .login-status-pill.disabled {
          background-color: var(--bg-app);
          color: var(--text-muted);
        }

        .status-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .status-pill.active { background-color: var(--success-bg); color: var(--success); }
        .status-pill.inactive { background-color: var(--error-bg); color: var(--error); }

        .actions-button-wrapper {
          display: flex;
          gap: 8px;
        }

        .action-icon-btn {
          border: none;
          background: var(--bg-app);
          color: var(--text-muted);
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .action-icon-btn:hover {
          background: var(--primary-10);
          color: var(--primary);
        }

        /* CHECKBOX */
        .checkbox-group {
          padding: 8px 0;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
        }

        .checkbox-label span {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .checkbox-hint {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* MODAL */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-container {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 600px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .modal-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
        }

        .form-alert.error {
          background-color: var(--error-bg);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .form-row-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
        }

        .form-group input, .form-group select {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-card);
          color: var(--text-main);
          transition: var(--transition-all);
        }

        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-10);
        }

        .radio-selection {
          display: flex;
          gap: 20px;
          padding: 8px 0;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
        }

        .modal-actions button {
          min-width: 100px;
          padding: 10px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
        }

        @media (max-width: 576px) {
          .form-row-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
export default Members;
