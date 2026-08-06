import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { VmOneLogo } from '../components/VmOneLogo';
import { db } from '../services/db';
import { 
  Building2, UserCheck, Award, Bell, 
  Database, Save, RotateCcw, CheckCircle, AlertCircle, 
  Download, Loader2, FileSpreadsheet, MessageSquare, Mail, ShieldCheck
} from 'lucide-react';

type SettingsSection = 
  | 'organization'
  | 'administrator'
  | 'certificates'
  | 'notifications'
  | 'backup';

export const SharedSettings: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const { branding, updateBranding } = useOrganization();

  // Navigation State
  const [activeSection, setActiveSection] = useState<SettingsSection>('organization');

  // Form Fields States
  const [orgName, setOrgName] = useState(branding.organizationName);
  const [orgNameMl, setOrgNameMl] = useState(branding.organizationNameMalayalam || '');
  const [logoUrl, setLogoUrl] = useState<string | null>(branding.logoUrl);
  const [sealUrl, setSealUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState(branding.phone);
  const [email, setEmail] = useState(branding.contactEmail);
  const [address, setAddress] = useState(branding.address);
  const [regNo, setRegNo] = useState(branding.registrationNumber);
  const [foundationYear, setFoundationYear] = useState('1978');
  const [website, setWebsite] = useState(branding.website || '');

  // Admin Profile & Password Change
  const [adminName, setAdminName] = useState(branding.adminDisplayName || user?.name || '');
  const [adminEmail, setAdminEmail] = useState(user?.email || 'admin@mahal.com');
  const [adminPhone, setAdminPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);

  // Certificate Templates State
  const [activeCertTab, setActiveCertTab] = useState<'nikah' | 'noc' | 'membership'>('nikah');
  const [certNikahBody, setCertNikahBody] = useState('This is to certify that the marriage (Nikah) between {{Groom_Name}} and {{Bride_Name}} was solemnized at {{Venue}} on {{Date}} under official Mahallu Register No. {{Register_No}}.');
  const [certNocBody, setCertNocBody] = useState('The Mahallu Committee has No Objection for {{Member_Name}} (Member ID: {{Member_ID}}) to apply for official administrative procedures.');
  const [certMembershipBody, setCertMembershipBody] = useState('This is to certify that {{Head_Name}} and family residing at {{House_Address}} are registered members of VM ONE Mahallu Committee.');

  // Notification Toggles
  const [pushAlerts, setPushAlerts] = useState(true);
  const [emailConfirmations, setEmailConfirmations] = useState(true);
  const [whatsappReminders, setWhatsappReminders] = useState(true);

  // UI Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
        showToast('success', 'Mahall Logo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSealUrl(reader.result as string);
        showToast('success', 'Official Stamp / Seal updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Detect Unsaved Changes for Sticky Save Bar
  const hasUnsavedChanges = useMemo(() => {
    return (
      orgName !== branding.organizationName ||
      orgNameMl !== (branding.organizationNameMalayalam || '') ||
      logoUrl !== branding.logoUrl ||
      phone !== branding.phone ||
      email !== branding.contactEmail ||
      address !== branding.address ||
      regNo !== branding.registrationNumber ||
      website !== (branding.website || '') ||
      adminName !== (branding.adminDisplayName || user?.name || '')
    );
  }, [orgName, orgNameMl, logoUrl, phone, email, address, regNo, website, adminName, branding, user]);

  const handleDiscard = () => {
    setOrgName(branding.organizationName);
    setOrgNameMl(branding.organizationNameMalayalam || '');
    setLogoUrl(branding.logoUrl);
    setPhone(branding.phone);
    setEmail(branding.contactEmail);
    setAddress(branding.address);
    setRegNo(branding.registrationNumber);
    setWebsite(branding.website || '');
    setAdminName(branding.adminDisplayName || user?.name || '');
    showToast('success', 'Changes discarded. Restored original workspace settings.');
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      updateBranding({
        organizationName: orgName.trim(),
        organizationNameMalayalam: orgNameMl.trim(),
        shortName: orgName.trim(),
        logoUrl: logoUrl,
        contactEmail: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        registrationNumber: regNo.trim(),
        website: website.trim(),
        adminDisplayName: adminName.trim(),
      });

      if (user && (adminName !== user.name || adminEmail !== user.email || adminPhone !== user.phone)) {
        await updateUserProfile({
          name: adminName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim(),
        });
      }

      showToast('success', 'Settings updated successfully!');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Real JSON Full Database Backup Generator
  const handleDownloadJsonBackup = async () => {
    setIsSaving(true);
    try {
      const [households, members, subscriptions, payments, marriages, deaths, donations] = await Promise.all([
        db.households.get(),
        db.members.get(),
        db.subscriptions.get(),
        db.payments.get(),
        db.marriages.get(),
        db.deaths.get(),
        db.donations.get(),
      ]);

      const backupObject = {
        app: 'Mahall Management System',
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        data: {
          households,
          members,
          subscriptions,
          payments,
          marriages,
          deaths,
          donations,
        },
      };

      const jsonStr = JSON.stringify(backupObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mahallu_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('success', '✓ Full Database JSON Backup downloaded successfully!');
    } catch (err) {
      console.error('Backup failed:', err);
      showToast('error', 'Failed to generate database backup.');
    } finally {
      setIsSaving(false);
    }
  };

  // Real CSV Members Directory Exporter
  const handleExportMembersCsv = async () => {
    try {
      const membersList = await db.members.get();
      if (membersList.length === 0) {
        showToast('error', 'No member records found to export.');
        return;
      }

      const headers = ['ID', 'Name', 'Household ID', 'Relationship', 'Phone', 'Email', 'Status', 'Portal Status'];
      const rows = membersList.map((m: any) => [
        `"${m.id}"`,
        `"${m.name.replace(/"/g, '""')}"`,
        `"${m.household_id}"`,
        `"${m.relationship}"`,
        `"${m.phone || ''}"`,
        `"${m.email || ''}"`,
        `"${m.status}"`,
        `"${m.portal_status || 'not_granted'}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mahallu_Members_Directory_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('success', '✓ Members Directory CSV exported successfully!');
    } catch (err) {
      showToast('error', 'Failed to export Members CSV.');
    }
  };

  // Real CSV Household Ledgers Exporter
  const handleExportHouseholdsCsv = async () => {
    try {
      const houseList = await db.households.get();
      if (houseList.length === 0) {
        showToast('error', 'No household records found to export.');
        return;
      }

      const headers = ['ID', 'House Number', 'Owner Name', 'Phone', 'Area / Cluster', 'Address', 'Status', 'Created Date'];
      const rows = houseList.map((h: any) => [
        `"${h.id}"`,
        `"${h.house_number}"`,
        `"${h.house_owner_name.replace(/"/g, '""')}"`,
        `"${h.house_owner_phone || ''}"`,
        `"${(h.area || '').replace(/"/g, '""')}"`,
        `"${(h.address || '').replace(/"/g, '""')}"`,
        `"${h.status}"`,
        `"${new Date(h.created_at).toLocaleDateString()}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mahallu_Households_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('success', '✓ Household Ledgers CSV exported successfully!');
    } catch (err) {
      showToast('error', 'Failed to export Households CSV.');
    }
  };

  return (
    <div className="shared-settings-container padding-lg">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type} animate-bounce-in`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER TITLE (SPACIOUS MARGIN BOTTOM - MATCHING IMAGE 2) */}
      <div className="settings-header-banner flex-between align-items-center flex-wrap gap-md" style={{ marginBottom: 28 }}>
        <div>
          <h2 className="font-xl font-weight-800 text-dark margin-0">
            System Settings <span className="font-xs color-subtle">/ {activeSection.toUpperCase()}</span>
          </h2>
          <p className="font-xs color-subtle margin-top-2xs">Configure Mahallu organization identity, logo, certificate templates, notification alerts, and data backups.</p>
        </div>
      </div>

      {/* MOBILE-ONLY SETTINGS SECTION DROPDOWN */}
      <div className="mobile-settings-select-container margin-bottom-md">
        <label htmlFor="mobile-settings-select" className="font-xs font-weight-700 color-subtle display-block margin-bottom-xs">
          Select Settings Category:
        </label>
        <select
          id="mobile-settings-select"
          className="form-control font-weight-700 text-emerald"
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
          style={{
            borderRadius: 12,
            padding: '12px 16px',
            border: '1.5px solid #00966b',
            background: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            width: '100%',
          }}
        >
          <option value="organization">🏛️ Mahall Profile</option>
          <option value="administrator">👤 Administrator Account</option>
          <option value="certificates">📜 Certificate Templates</option>
          <option value="notifications">🔔 Notifications & Alerts</option>
          <option value="backup">💾 Backup & Data Export</option>
        </select>
      </div>

      {/* DESKTOP & TABLET HORIZONTAL PILL TAB NAVIGATION BAR */}
      <div className="settings-horizontal-tabs-bar desktop-settings-tabs-only" style={{ marginBottom: 32 }}>
        <button
          className={`settings-pill-tab ${activeSection === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveSection('organization')}
        >
          <Building2 size={16} />
          <span>Mahall Profile</span>
        </button>

        <button
          className={`settings-pill-tab ${activeSection === 'administrator' ? 'active' : ''}`}
          onClick={() => setActiveSection('administrator')}
        >
          <UserCheck size={16} />
          <span>Administrator</span>
        </button>

        <button
          className={`settings-pill-tab ${activeSection === 'certificates' ? 'active' : ''}`}
          onClick={() => setActiveSection('certificates')}
        >
          <Award size={16} />
          <span>Certificate Templates</span>
        </button>

        <button
          className={`settings-pill-tab ${activeSection === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveSection('notifications')}
        >
          <Bell size={16} />
          <span>Notifications</span>
        </button>

        <button
          className={`settings-pill-tab ${activeSection === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveSection('backup')}
        >
          <Database size={16} />
          <span>Backup & Data Export</span>
        </button>
      </div>

      {/* CATEGORY CONTENT WORKSPACE */}
      <main className="settings-content-workspace">
        
        {/* SECTION 1: MAHALL PROFILE */}
        {activeSection === 'organization' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ padding: 32, borderRadius: 24 }}>
            <div className="section-head margin-bottom-lg">
              <Building2 size={22} className="head-icon icon-emerald" />
              <div>
                <h4>Mahall Profile & Identity</h4>
                <p>Configure official Mahallu organization names, Waqf board registration, logo, and seal.</p>
              </div>
            </div>

            <div className="settings-form-body">
              {/* DASHED UPLOAD DROPZONE CARDS */}
              <div className="dashed-upload-dropzone-container margin-bottom-lg">
                {/* MAHALL LOGO UPLOAD DROPZONE */}
                <label htmlFor="logo-upload-input" className="dashed-upload-dropzone">
                  <div className="dropzone-left-preview">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="brand-logo-img" style={{ maxHeight: 52, maxWidth: 52 }} /> : <VmOneLogo size={42} showWordmark={false} />}
                  </div>
                  <div className="dropzone-right-info">
                    <div className="dropzone-title">Click to replace logo</div>
                    <div className="dropzone-subtitle">SVG, PNG or WEBP, 300×100px</div>
                  </div>
                  <input id="logo-upload-input" type="file" accept="image/*" className="display-none" onChange={handleLogoUpload} />
                </label>

                {/* OFFICIAL STAMP / SEAL UPLOAD DROPZONE */}
                <label htmlFor="seal-upload-input" className="dashed-upload-dropzone">
                  <div className="dropzone-left-preview">
                    {sealUrl ? <img src={sealUrl} alt="Official Seal" className="brand-logo-img" style={{ maxHeight: 52, maxWidth: 52 }} /> : <Award size={28} className="text-emerald" />}
                  </div>
                  <div className="dropzone-right-info">
                    <div className="dropzone-title">Official Stamp / Seal</div>
                    <div className="dropzone-subtitle">Used on printed certificates • SVG or PNG</div>
                  </div>
                  <input id="seal-upload-input" type="file" accept="image/*" className="display-none" onChange={handleSealUpload} />
                </label>
              </div>

              <div className="form-row-grid margin-bottom-md">
                <div className="form-group">
                  <label htmlFor="setting-mahal-name" className="form-label font-weight-700">Official Mahall Name (English) *</label>
                  <input
                    id="setting-mahal-name"
                    type="text"
                    className="form-control"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="setting-mahal-name-ml" className="form-label font-weight-700">Mahall Name (Malayalam / Tagline)</label>
                  <input
                    id="setting-mahal-name-ml"
                    type="text"
                    className="form-control"
                    value={orgNameMl}
                    onChange={(e) => setOrgNameMl(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-grid margin-bottom-md">
                <div className="form-group">
                  <label htmlFor="setting-mahal-reg" className="form-label font-weight-700">Waqf Board / Reg Number</label>
                  <input
                    id="setting-mahal-reg"
                    type="text"
                    className="form-control"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="setting-foundation" className="form-label font-weight-700">Foundation Year</label>
                  <input
                    id="setting-foundation"
                    type="text"
                    className="form-control"
                    value={foundationYear}
                    onChange={(e) => setFoundationYear(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-grid margin-bottom-md">
                <div className="form-group">
                  <label htmlFor="setting-mahal-phone" className="form-label font-weight-700">Official Phone Number</label>
                  <input
                    id="setting-mahal-phone"
                    type="text"
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="setting-mahal-email" className="form-label font-weight-700">Official Contact Email</label>
                  <input
                    id="setting-mahal-email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="setting-mahal-address" className="form-label font-weight-700">Physical Office Address</label>
                <input
                  id="setting-mahal-address"
                  type="text"
                  className="form-control"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: ADMINISTRATOR */}
        {activeSection === 'administrator' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ padding: 32, borderRadius: 24 }}>
            <div className="section-head margin-bottom-lg">
              <UserCheck size={22} className="head-icon icon-emerald" />
              <div>
                <h4>Administrator Profile</h4>
                <p>Manage your login credentials, system display name, and mobile contact.</p>
              </div>
            </div>

            <div className="settings-form-body">
              <div className="form-group margin-bottom-md">
                <label htmlFor="admin-display-name" className="form-label font-weight-700">Admin Display Name *</label>
                <input
                  id="admin-display-name"
                  type="text"
                  className="form-control"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label htmlFor="admin-email" className="form-label font-weight-700">Login Email Address</label>
                  <input
                    id="admin-email"
                    type="email"
                    className="form-control"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="admin-phone" className="form-label font-weight-700">Mobile Phone Number</label>
                  <input
                    id="admin-phone"
                    type="tel"
                    className="form-control"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* CHANGE ADMIN PASSWORD CARD */}
              <div className="form-card margin-top-lg" style={{ background: '#ffffff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0' }}>
                <div className="flex-between align-items-center margin-bottom-md">
                  <div>
                    <h4 className="font-sm font-weight-800 text-dark margin-0 flex-row-gap-xs align-items-center">
                      <ShieldCheck size={18} className="text-emerald" /> Change Admin Password
                    </h4>
                    <p className="font-2xs color-subtle margin-top-3xs">
                      Update the login password for <strong>{adminEmail || 'admin@mahal.com'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex-col gap-md">
                  <div className="form-row-grid">
                    <div className="form-group">
                      <label className="form-label font-weight-700">New Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Enter new password..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label font-weight-700">Confirm New Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Re-enter new password..."
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex-end">
                    <button
                      type="button"
                      className="pill-btn-primary font-xs"
                      disabled={isPasswordUpdating}
                      onClick={async () => {
                        if (!newPassword) {
                          showToast('error', 'Please enter a new password.');
                          return;
                        }
                        if (newPassword.length < 4) {
                          showToast('error', 'New password must be at least 4 characters.');
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          showToast('error', 'New passwords do not match!');
                          return;
                        }

                        setIsPasswordUpdating(true);
                        try {
                          localStorage.setItem('mahal_admin_password', newPassword);
                          setNewPassword('');
                          setConfirmPassword('');
                          showToast('success', '✓ Admin password updated successfully! Next login requires the new password.');
                        } catch (err: any) {
                          showToast('error', err.message || 'Failed to update admin password.');
                        } finally {
                          setIsPasswordUpdating(false);
                        }
                      }}
                    >
                      {isPasswordUpdating ? 'Updating Password...' : 'Update Admin Password'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: CERTIFICATE TEMPLATES */}
        {activeSection === 'certificates' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ padding: 32, borderRadius: 24 }}>
            <div className="section-head margin-bottom-lg">
              <Award size={22} className="head-icon icon-emerald" />
              <div>
                <h4>Certificate & Document Templates</h4>
                <p>Edit body text templates for Marriage (Nikah), NOC, and Membership certificates.</p>
              </div>
            </div>

            <div className="settings-form-body">
              <div className="flex-row-gap-xs margin-bottom-md border-bottom-subtle padding-bottom-xs">
                <button
                  className={`pill-btn-ghost font-xs ${activeCertTab === 'nikah' ? 'active-tab-emerald' : ''}`}
                  onClick={() => setActiveCertTab('nikah')}
                >
                  Nikah / Marriage Certificate
                </button>
                <button
                  className={`pill-btn-ghost font-xs ${activeCertTab === 'noc' ? 'active-tab-emerald' : ''}`}
                  onClick={() => setActiveCertTab('noc')}
                >
                  No Objection (NOC) Certificate
                </button>
                <button
                  className={`pill-btn-ghost font-xs ${activeCertTab === 'membership' ? 'active-tab-emerald' : ''}`}
                  onClick={() => setActiveCertTab('membership')}
                >
                  Residence / Membership Certificate
                </button>
              </div>

              {activeCertTab === 'nikah' && (
                <div className="form-group">
                  <label className="form-label font-weight-700">Marriage Certificate Wording Template</label>
                  <textarea
                    rows={5}
                    className="form-control font-xs"
                    value={certNikahBody}
                    onChange={(e) => setCertNikahBody(e.target.value)}
                  />
                </div>
              )}

              {activeCertTab === 'noc' && (
                <div className="form-group">
                  <label className="form-label font-weight-700">NOC Certificate Wording Template</label>
                  <textarea
                    rows={5}
                    className="form-control font-xs"
                    value={certNocBody}
                    onChange={(e) => setCertNocBody(e.target.value)}
                  />
                </div>
              )}

              {activeCertTab === 'membership' && (
                <div className="form-group">
                  <label className="form-label font-weight-700">Membership Certificate Wording Template</label>
                  <textarea
                    rows={5}
                    className="form-control font-xs"
                    value={certMembershipBody}
                    onChange={(e) => setCertMembershipBody(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 4: NOTIFICATION CHANNELS (MATCHING IMAGES 1, 2, & 3) */}
        {activeSection === 'notifications' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ borderRadius: 24, padding: 32, border: '1.5px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
            <div className="section-head margin-bottom-lg" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#ecfdf5', color: '#01A350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={24} />
              </div>
              <div>
                <h3 className="font-lg font-weight-800 text-dark margin-0">Notification Channels</h3>
                <p className="font-xs color-subtle margin-top-3xs">Configure automated system notifications, payment alerts, and broadcast channels.</p>
              </div>
            </div>

            <div className="settings-form-body flex-col gap-md">
              {/* Push Alerts Option Card */}
              <div className="setting-option-card">
                <div className="flex-row-gap-md align-items-center">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ecfdf5', color: '#01A350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="font-sm font-weight-800 text-dark margin-0">In-App Push Alerts</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Receive live notifications in top bar</p>
                  </div>
                </div>
                <label className="ios-toggle-wrap">
                  <input 
                    type="checkbox" 
                    checked={pushAlerts} 
                    onChange={(e) => setPushAlerts(e.target.checked)}
                  />
                  <span className="ios-toggle-slider"></span>
                </label>
              </div>

              {/* Email Confirmations Option Card */}
              <div className="setting-option-card">
                <div className="flex-row-gap-md align-items-center">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eff6ff', color: '#0746D3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="font-sm font-weight-800 text-dark margin-0">Email Confirmations</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Send PDF receipts automatically via email</p>
                  </div>
                </div>
                <label className="ios-toggle-wrap">
                  <input 
                    type="checkbox" 
                    checked={emailConfirmations} 
                    onChange={(e) => setEmailConfirmations(e.target.checked)}
                  />
                  <span className="ios-toggle-slider"></span>
                </label>
              </div>

              {/* WhatsApp Reminders Option Card */}
              <div className="setting-option-card">
                <div className="flex-row-gap-md align-items-center">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="font-sm font-weight-800 text-dark margin-0">WhatsApp Dues Reminders</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Send automated subscription payment alerts via WhatsApp API</p>
                  </div>
                </div>
                <label className="ios-toggle-wrap">
                  <input 
                    type="checkbox" 
                    checked={whatsappReminders} 
                    onChange={(e) => setWhatsappReminders(e.target.checked)}
                  />
                  <span className="ios-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: BACKUP & DATA EXPORT */}
        {activeSection === 'backup' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ borderRadius: 24, padding: 32, border: '1.5px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
            <div className="section-head margin-bottom-lg" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#ecfdf5', color: '#01A350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={24} />
              </div>
              <div>
                <h3 className="font-lg font-weight-800 text-dark margin-0">Backup & Data Export</h3>
                <p className="font-xs color-subtle margin-top-3xs">Download full CSV/JSON datasets of households, members, and payment ledgers.</p>
              </div>
            </div>

            <div className="settings-form-body flex-col gap-md">
              <div className="setting-option-card">
                <div className="flex-row-gap-md align-items-center">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ecfdf5', color: '#01A350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="font-sm font-weight-800 text-dark margin-0">Full Database Backup (JSON)</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Complete snapshot of households, members, payments, and system settings</p>
                  </div>
                </div>
                <button className="pill-btn-primary font-xs" style={{ padding: '10px 18px', borderRadius: 9999 }} onClick={handleDownloadJsonBackup}>
                  <Download size={14} /> Download JSON
                </button>
              </div>

              <div className="setting-option-card">
                <div className="flex-row-gap-md align-items-center">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eff6ff', color: '#0746D3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h4 className="font-sm font-weight-800 text-dark margin-0">Export Members Directory (CSV)</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Full CSV roster of registered members</p>
                  </div>
                </div>
                <button className="pill-btn-secondary font-xs" style={{ padding: '10px 18px', borderRadius: 9999 }} onClick={handleExportMembersCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="setting-option-card">
                <div className="flex-row-gap-md align-items-center">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h4 className="font-sm font-weight-800 text-dark margin-0">Export Household Ledgers (CSV)</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">CSV report of all registered households and payment status</p>
                  </div>
                </div>
                <button className="pill-btn-secondary font-xs" style={{ padding: '10px 18px', borderRadius: 9999 }} onClick={handleExportHouseholdsCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* STICKY BOTTOM SAVE BAR */}
      {hasUnsavedChanges && (
        <div className="sticky-save-bar animate-bounce-in">
          <div className="flex-row-gap-xs align-items-center">
            <AlertCircle size={18} className="text-warning" />
            <span className="font-xs font-weight-700 text-dark">You have unsaved workspace settings changes.</span>
          </div>

          <div className="flex-row-gap-xs align-items-center">
            <button type="button" className="pill-btn-secondary font-xs" onClick={handleDiscard}>
              <RotateCcw size={14} /> Discard
            </button>
            <button type="button" className="pill-btn-primary font-xs" onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
            </button>
          </div>
        </div>
      )}
      {/* RESPONSIVE STYLES */}
      <style>{`
        .mobile-settings-select-container { display: none; }
        .desktop-settings-tabs-only { display: flex; flex-wrap: wrap; gap: 8px; }
        .dashed-upload-dropzone-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          width: 100%;
        }

        @media (max-width: 768px) {
          .mobile-settings-select-container { display: block; }
          .desktop-settings-tabs-only { display: none !important; }
          .shared-settings-container { padding: 12px !important; }
          .settings-section-card { padding: 18px !important; border-radius: 18px !important; }
          .dashed-upload-dropzone-container { grid-template-columns: 1fr !important; gap: 14px !important; }
          .form-row-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .dashed-upload-dropzone { 
            flex-direction: row !important; 
            align-items: center !important; 
            text-align: left !important; 
            padding: 14px 16px !important; 
            gap: 14px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .dropzone-left-preview { flex-shrink: 0 !important; }
          .dropzone-right-info { flex: 1 !important; }
          .setting-option-card { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .setting-option-card button { width: 100% !important; justify-content: center !important; }
        }
      `}</style>
    </div>
  );
};

export default SharedSettings;
