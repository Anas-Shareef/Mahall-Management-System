import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { VmOneLogo } from '../components/VmOneLogo';
import { db } from '../services/db';
import { 
  Building2, UserCheck, DollarSign, Award, Bell, 
  Database, Upload, Save, RotateCcw, CheckCircle, AlertCircle, 
  Download, Loader2
} from 'lucide-react';

type SettingsSection = 
  | 'organization'
  | 'administrator'
  | 'financial'
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

  // Branding Colors
  const [primaryColor] = useState(branding.primaryColor || '#01A350');
  const [secondaryColor] = useState(branding.secondaryColor || '#0746D3');

  // Admin Profile
  const [adminName, setAdminName] = useState(branding.adminDisplayName || user?.name || '');
  const [adminEmail, setAdminEmail] = useState(user?.email || '');
  const [adminPhone, setAdminPhone] = useState(user?.phone || '');

  // Financial & Subscription Settings (Varika Rates)
  const [varikaStandard, setVarikaStandard] = useState('250');
  const [varikaNonResident, setVarikaNonResident] = useState('500');
  const [autoReceiptNumber, setAutoReceiptNumber] = useState(true);
  const [receiptPrefix, setReceiptPrefix] = useState('MHL-2026-');
  const [donationPrefix, setDonationPrefix] = useState('DON-2026-');

  // Certificate Templates State
  const [activeCertTab, setActiveCertTab] = useState<'nikah' | 'noc' | 'membership'>('nikah');
  const [certNikahBody, setCertNikahBody] = useState('This is to certify that the marriage (Nikah) between {{Groom_Name}} and {{Bride_Name}} was solemnized at {{Venue}} on {{Date}} under official Mahallu Register No. {{Register_No}}.');
  const [certNocBody, setCertNocBody] = useState('The Mahallu Committee has No Objection for {{Member_Name}} (Member ID: {{Member_ID}}) to apply for official administrative procedures.');
  const [certMembershipBody, setCertMembershipBody] = useState('This is to certify that {{Head_Name}} and family residing at {{House_Address}} are registered members of VM ONE Mahallu Committee.');

  // UI Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
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
      adminName !== (branding.adminDisplayName || user?.name || '') ||
      primaryColor !== (branding.primaryColor || '#01A350')
    );
  }, [orgName, orgNameMl, logoUrl, phone, email, address, regNo, website, adminName, primaryColor, branding, user]);

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
        primaryColor,
        secondaryColor,
      });

      if (user) {
        await db.profiles.update(user.id, {
          name: adminName.trim(),
          email: adminEmail.trim() || null,
          phone: adminPhone.trim() || null,
        });

        await updateUserProfile({
          name: adminName.trim(),
          email: adminEmail.trim() || null,
          phone: adminPhone.trim() || null,
        });
      }

      showToast('success', '✓ Workspace settings & configuration saved successfully!');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('error', 'Logo file must be under 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        const url = evt.target.result as string;
        setLogoUrl(url);
        updateBranding({ logoUrl: url });
        showToast('success', '✓ Official logo updated live!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setSealUrl(evt.target.result as string);
        showToast('success', '✓ Official Mahallu Seal uploaded!');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="settings-page animate-fade-in">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type} animate-bounce-in`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER TITLE */}
      <div className="settings-header-banner margin-bottom-lg flex-between align-items-center flex-wrap gap-md">
        <div>
          <h2 className="font-xl font-weight-800 text-dark margin-0">
            Settings <span className="font-xs color-subtle">/ {activeSection.toUpperCase()}</span>
          </h2>
          <p className="font-xs color-subtle margin-top-2xs">Configure Mahallu organization identity, Varika rates, permission matrix, SMS gateway, and certificates.</p>
        </div>
      </div>

      {/* 2-COLUMN ENTERPRISE WORKSPACE GRID */}
      <div className="settings-viewport-grid">
        {/* LEFT CATEGORY SIDEBAR NAVIGATION */}
        <aside className="settings-nav-sidebar glass-card">
          <nav className="settings-section-menu">
            <div className="menu-group-label">MAHALL IDENTITY</div>
            <button
              className={`section-menu-btn ${activeSection === 'organization' ? 'active' : ''}`}
              onClick={() => setActiveSection('organization')}
            >
              <div className="menu-icon-badge"><Building2 size={16} /></div>
              <span>Mahall Profile</span>
            </button>

            <button
              className={`section-menu-btn ${activeSection === 'administrator' ? 'active' : ''}`}
              onClick={() => setActiveSection('administrator')}
            >
              <div className="menu-icon-badge"><UserCheck size={16} /></div>
              <span>Administrator</span>
            </button>

            <div className="menu-group-label margin-top-md">FINANCES & CONFIGURATION</div>
            <button
              className={`section-menu-btn ${activeSection === 'financial' ? 'active' : ''}`}
              onClick={() => setActiveSection('financial')}
            >
              <div className="menu-icon-badge"><DollarSign size={16} /></div>
              <span>Financials & Varika</span>
            </button>

            <div className="menu-group-label margin-top-md">COMMUNICATION & TEMPLATES</div>
            <button
              className={`section-menu-btn ${activeSection === 'certificates' ? 'active' : ''}`}
              onClick={() => setActiveSection('certificates')}
            >
              <div className="menu-icon-badge"><Award size={16} /></div>
              <span>Certificate Templates</span>
            </button>

            <button
              className={`section-menu-btn ${activeSection === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveSection('notifications')}
            >
              <div className="menu-icon-badge"><Bell size={16} /></div>
              <span>Notifications</span>
            </button>

            <div className="menu-group-label margin-top-md">SYSTEM & DATA</div>
            <button
              className={`section-menu-btn ${activeSection === 'backup' ? 'active' : ''}`}
              onClick={() => setActiveSection('backup')}
            >
              <div className="menu-icon-badge"><Database size={16} /></div>
              <span>Backup & Export</span>
            </button>
          </nav>
        </aside>

        {/* RIGHT CATEGORY CONTENT PANEL */}
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
                {/* LOGO & SEAL UPLOAD CARDS */}
                <div className="form-row-grid">
                  <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm">
                    <div className="flex-row-gap-md align-items-center">
                      <div className="brand-icon-box shadow-sm" style={{ width: 56, height: 56, borderRadius: 14, background: '#ffffff' }}>
                        {logoUrl ? <img src={logoUrl} alt="Logo" className="brand-logo-img" /> : <VmOneLogo size={36} showWordmark={false} />}
                      </div>
                      <div>
                        <h4 className="font-xs font-weight-800 text-dark margin-0">Mahall Logo</h4>
                        <p className="font-2xs color-subtle margin-top-3xs">PNG / SVG / WEBP (Max 3MB)</p>
                      </div>
                    </div>
                    <label htmlFor="logo-upload-input" className="pill-btn-primary font-2xs cursor-pointer">
                      <Upload size={13} /> Upload
                      <input id="logo-upload-input" type="file" accept="image/*" className="display-none" onChange={handleLogoUpload} />
                    </label>
                  </div>

                  <div className="glass-card padding-md flex-between align-items-center flex-wrap gap-sm">
                    <div className="flex-row-gap-md align-items-center">
                      <div className="brand-icon-box shadow-sm" style={{ width: 56, height: 56, borderRadius: 14, background: '#f8fafc', border: '1.5px dashed #cbd5e1' }}>
                        {sealUrl ? <img src={sealUrl} alt="Official Seal" className="brand-logo-img" /> : <Award size={24} className="text-emerald" />}
                      </div>
                      <div>
                        <h4 className="font-xs font-weight-800 text-dark margin-0">Official Stamp / Seal</h4>
                        <p className="font-2xs color-subtle margin-top-3xs">Used on printed certificates</p>
                      </div>
                    </div>
                    <label htmlFor="seal-upload-input" className="pill-btn-secondary font-2xs cursor-pointer">
                      <Upload size={13} /> Upload Seal
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
                </div>

                <div className="form-row-grid">
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
            </div>
          )}



          {/* SECTION 3: ADMINISTRATOR */}
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

          {/* SECTION 4: FINANCIALS & VARIKA */}
          {activeSection === 'financial' && (
            <div className="settings-section-card glass-card animate-fade-in">
              <div className="section-head">
                <DollarSign size={22} className="head-icon icon-emerald" />
                <div>
                  <h4>Financials & Subscription Rates (Varika)</h4>
                  <p>Enforces Indian Rupee (₹) currency and configures default monthly subscription dues.</p>
                </div>
              </div>

              <div className="settings-form-body">
                <div className="glass-card padding-md flex-between align-items-center">
                  <div>
                    <h4 className="font-xs font-weight-800 text-dark margin-0">System Currency</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Strict default for all receipts & dues</p>
                  </div>
                  <span className="badge-pill badge-emerald font-weight-800">INR (₹)</span>
                </div>

                <div className="form-section-label">Monthly Varika (Subscription) Default Dues</div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="varika-std" className="form-label font-weight-700">Standard Household Rate (₹ / month)</label>
                    <input
                      id="varika-std"
                      type="number"
                      className="form-control"
                      value={varikaStandard}
                      onChange={(e) => setVarikaStandard(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="varika-nri" className="form-label font-weight-700">Non-Resident / Gulf Member Rate (₹ / month)</label>
                    <input
                      id="varika-nri"
                      type="number"
                      className="form-control"
                      value={varikaNonResident}
                      onChange={(e) => setVarikaNonResident(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-section-label">Automated Receipt Numbering</div>

                <div className="glass-card padding-md flex-between align-items-center margin-bottom-sm">
                  <div>
                    <h4 className="font-xs font-weight-800 text-dark margin-0">Auto-Generate Receipt Serial Numbers</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Automatically increment receipt number on payment recording</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReceiptNumber}
                    onChange={(e) => setAutoReceiptNumber(e.target.checked)}
                  />
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="rec-prefix" className="form-label font-weight-700">Offline Payment Receipt Prefix</label>
                    <input
                      id="rec-prefix"
                      type="text"
                      className="form-control font-mono"
                      value={receiptPrefix}
                      onChange={(e) => setReceiptPrefix(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="don-prefix" className="form-label font-weight-700">Donation Receipt Prefix</label>
                    <input
                      id="don-prefix"
                      type="text"
                      className="form-control font-mono"
                      value={donationPrefix}
                      onChange={(e) => setDonationPrefix(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* SECTION 7: CERTIFICATE TEMPLATES */}
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

          {/* SECTION 8: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="settings-section-card glass-card animate-fade-in">
              <div className="section-head">
                <Bell size={22} className="head-icon icon-emerald" />
                <div>
                  <h4>Notification Channels</h4>
                  <p>Configure automated system notifications, payment alerts, and broadcast channels.</p>
                </div>
              </div>

              <div className="settings-form-body">
                <div className="glass-card padding-md margin-bottom-sm flex-between align-items-center">
                  <div>
                    <h4 className="font-xs font-weight-700 text-dark margin-0">In-App Push Alerts</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Receive live notifications in top bar</p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </div>

                <div className="glass-card padding-md flex-between align-items-center">
                  <div>
                    <h4 className="font-xs font-weight-700 text-dark margin-0">Email Confirmations</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Send PDF receipts automatically via email</p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
            </div>
          )}



          {/* SECTION 10: BACKUP & EXPORT */}
          {activeSection === 'backup' && (
            <div className="settings-section-card glass-card animate-fade-in">
              <div className="section-head">
                <Database size={22} className="head-icon icon-emerald" />
                <div>
                  <h4>Backup & Data Export</h4>
                  <p>Download full CSV/JSON datasets of households, members, and payment ledgers.</p>
                </div>
              </div>

              <div className="settings-form-body flex-col gap-sm">
                <div className="glass-card padding-md flex-between align-items-center">
                  <div>
                    <h4 className="font-xs font-weight-700 text-dark margin-0">Export Members Directory</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Full CSV roster of registered members</p>
                  </div>
                  <button className="pill-btn-primary font-xs" onClick={() => showToast('success', 'Exporting Members CSV...')}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                <div className="glass-card padding-md flex-between align-items-center">
                  <div>
                    <h4 className="font-xs font-weight-700 text-dark margin-0">Export Household Ledgers</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">CSV report of all registered households</p>
                  </div>
                  <button className="pill-btn-primary font-xs" onClick={() => showToast('success', 'Exporting Household Ledgers...')}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

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
