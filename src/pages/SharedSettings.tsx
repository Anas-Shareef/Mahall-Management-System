import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { VmOneLogo } from '../components/VmOneLogo';
import { 
  Building2, UserCheck, Award, Bell, 
  Database, Upload, Save, RotateCcw, CheckCircle, AlertCircle, 
  Download, Loader2, ShieldCheck, Mail, Smartphone, FileSpreadsheet
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

  // Admin Profile
  const [adminName, setAdminName] = useState(branding.adminDisplayName || user?.name || '');
  const [adminEmail, setAdminEmail] = useState(user?.email || '');
  const [adminPhone, setAdminPhone] = useState(user?.phone || '');

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

  return (
    <div className="shared-settings-container padding-lg">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type} animate-bounce-in`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER TITLE */}
      <div className="settings-header-banner margin-bottom-md flex-between align-items-center flex-wrap gap-md">
        <div>
          <h2 className="font-xl font-weight-800 text-dark margin-0">
            System Settings <span className="font-xs color-subtle">/ {activeSection.toUpperCase()}</span>
          </h2>
          <p className="font-xs color-subtle margin-top-2xs">Configure Mahallu organization identity, logo, certificate templates, notification alerts, and data backups.</p>
        </div>
      </div>

      {/* HORIZONTAL PILL TAB NAVIGATION BAR (MATCHING IMAGE 3) */}
      <div className="settings-horizontal-tabs-bar margin-bottom-lg">
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
          <div className="settings-section-card glass-card animate-fade-in">
            <div className="section-head">
              <Building2 size={22} className="head-icon icon-emerald" />
              <div>
                <h4>Mahall Profile & Identity</h4>
                <p>Configure official Mahallu organization names, Waqf board registration, logo, and seal.</p>
              </div>
            </div>

            <div className="settings-form-body">
              {/* REDESIGNED LOGO & SEAL UPLOAD CARDS */}
              <div className="form-row-grid margin-bottom-md">
                {/* MAHALL LOGO UPLOAD */}
                <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm" style={{ border: '1.5px solid #e2e8f0', borderRadius: 20 }}>
                  <div className="flex-row-gap-md align-items-center">
                    <div className="brand-icon-box shadow-sm" style={{ width: 64, height: 64, borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {logoUrl ? <img src={logoUrl} alt="Logo" className="brand-logo-img" style={{ maxHeight: 52, maxWidth: 52 }} /> : <VmOneLogo size={42} showWordmark={false} />}
                    </div>
                    <div>
                      <h4 className="font-sm font-weight-800 text-dark margin-0">Mahall Logo</h4>
                      <p className="font-2xs color-subtle margin-top-3xs">PNG / SVG / WEBP (Max 3MB)</p>
                    </div>
                  </div>
                  <label htmlFor="logo-upload-input" className="pill-btn-primary font-xs cursor-pointer" style={{ padding: '10px 18px', borderRadius: 9999 }}>
                    <Upload size={14} /> Upload Logo
                    <input id="logo-upload-input" type="file" accept="image/*" className="display-none" onChange={handleLogoUpload} />
                  </label>
                </div>

                {/* OFFICIAL STAMP / SEAL UPLOAD */}
                <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm" style={{ border: '1.5px solid #e2e8f0', borderRadius: 20 }}>
                  <div className="flex-row-gap-md align-items-center">
                    <div className="brand-icon-box shadow-sm" style={{ width: 64, height: 64, borderRadius: 16, background: '#f8fafc', border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sealUrl ? <img src={sealUrl} alt="Official Seal" className="brand-logo-img" style={{ maxHeight: 52, maxWidth: 52 }} /> : <Award size={28} className="text-emerald" />}
                    </div>
                    <div>
                      <h4 className="font-sm font-weight-800 text-dark margin-0">Official Stamp / Seal</h4>
                      <p className="font-2xs color-subtle margin-top-3xs">Used on printed certificates</p>
                    </div>
                  </div>
                  <label htmlFor="seal-upload-input" className="pill-btn-secondary font-xs cursor-pointer" style={{ padding: '10px 18px', borderRadius: 9999 }}>
                    <Upload size={14} /> Upload Seal
                    <input id="seal-upload-input" type="file" accept="image/*" className="display-none" onChange={handleSealUpload} />
                  </label>
                </div>
              </div>

              <div className="form-row-grid">
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

              <div className="form-row-grid">
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

              <div className="form-row-grid">
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

              <div className="form-group margin-top-xs">
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
          <div className="settings-section-card glass-card animate-fade-in">
            <div className="section-head">
              <UserCheck size={22} className="head-icon icon-emerald" />
              <div>
                <h4>Administrator Profile</h4>
                <p>Manage your login credentials, system display name, and mobile contact.</p>
              </div>
            </div>

            <div className="settings-form-body">
              <div className="form-group">
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
            </div>
          </div>
        )}

        {/* SECTION 3: CERTIFICATE TEMPLATES */}
        {activeSection === 'certificates' && (
          <div className="settings-section-card glass-card animate-fade-in">
            <div className="section-head">
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

        {/* SECTION 4: NOTIFICATION CHANNELS (MATCHING IMAGES 1 & 2) */}
        {activeSection === 'notifications' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ borderRadius: 24, padding: 32, border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
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
              <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm" style={{ border: '1.5px solid #e2e8f0', borderRadius: 18, background: '#ffffff' }}>
                <div>
                  <h4 className="font-sm font-weight-800 text-dark margin-0">In-App Push Alerts</h4>
                  <p className="font-2xs color-subtle margin-top-3xs">Receive live notifications in top bar</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={pushAlerts} 
                  onChange={(e) => setPushAlerts(e.target.checked)}
                  style={{ width: 22, height: 22, accentColor: '#01A350', cursor: 'pointer' }}
                />
              </div>

              {/* Email Confirmations Option Card */}
              <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm" style={{ border: '1.5px solid #e2e8f0', borderRadius: 18, background: '#ffffff' }}>
                <div>
                  <h4 className="font-sm font-weight-800 text-dark margin-0">Email Confirmations</h4>
                  <p className="font-2xs color-subtle margin-top-3xs">Send PDF receipts automatically via email</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailConfirmations} 
                  onChange={(e) => setEmailConfirmations(e.target.checked)}
                  style={{ width: 22, height: 22, accentColor: '#01A350', cursor: 'pointer' }}
                />
              </div>

              {/* WhatsApp Reminders Option Card */}
              <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm" style={{ border: '1.5px solid #e2e8f0', borderRadius: 18, background: '#ffffff' }}>
                <div>
                  <h4 className="font-sm font-weight-800 text-dark margin-0">WhatsApp Dues Reminders</h4>
                  <p className="font-2xs color-subtle margin-top-3xs">Send automated subscription payment alerts via WhatsApp API</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={whatsappReminders} 
                  onChange={(e) => setWhatsappReminders(e.target.checked)}
                  style={{ width: 22, height: 22, accentColor: '#01A350', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: BACKUP & DATA EXPORT */}
        {activeSection === 'backup' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ borderRadius: 24, padding: 32, border: '1px solid #e2e8f0', background: '#ffffff' }}>
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
              <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm" style={{ border: '1.5px solid #e2e8f0', borderRadius: 18 }}>
                <div>
                  <h4 className="font-sm font-weight-800 text-dark margin-0">Full Database Backup (JSON)</h4>
                  <p className="font-2xs color-subtle margin-top-3xs">Complete snapshot of households, members, payments, and system settings</p>
                </div>
                <button className="pill-btn-primary font-xs" style={{ padding: '10px 18px', borderRadius: 9999 }} onClick={() => showToast('success', 'Database JSON backup generated & downloaded.')}>
                  <Download size={14} /> Download JSON Backup
                </button>
              </div>

              <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm" style={{ border: '1.5px solid #e2e8f0', borderRadius: 18 }}>
                <div>
                  <h4 className="font-sm font-weight-800 text-dark margin-0">Export Members Directory (CSV)</h4>
                  <p className="font-2xs color-subtle margin-top-3xs">Full CSV roster of registered members</p>
                </div>
                <button className="pill-btn-secondary font-xs" style={{ padding: '10px 18px', borderRadius: 9999 }} onClick={() => showToast('success', 'Exporting Members CSV...')}>
                  <FileSpreadsheet size={14} /> Export Members CSV
                </button>
              </div>

              <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm" style={{ border: '1.5px solid #e2e8f0', borderRadius: 18 }}>
                <div>
                  <h4 className="font-sm font-weight-800 text-dark margin-0">Export Household Ledgers (CSV)</h4>
                  <p className="font-2xs color-subtle margin-top-3xs">CSV report of all registered households and payment status</p>
                </div>
                <button className="pill-btn-secondary font-xs" style={{ padding: '10px 18px', borderRadius: 9999 }} onClick={() => showToast('success', 'Exporting Household Ledgers...')}>
                  <FileSpreadsheet size={14} /> Export Households CSV
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
    </div>
  );
};

export default SharedSettings;
