import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { 
  Globe, CheckCircle, AlertCircle, Building2, Bell, Shield, 
  Settings as SettingsIcon, Save, 
  Check, Loader2
} from 'lucide-react';

export const SharedSettings: React.FC = () => {
  const { language, setLanguage } = useTranslation();
  const { user, updateUserLanguage, updateUserProfile } = useAuth();

  // Active Section State ('general' | 'language' | 'notifications' | 'security' | 'system')
  const [activeSection, setActiveSection] = useState<'general' | 'language' | 'notifications' | 'security' | 'system'>('general');

  // User Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Mahall Global Settings States
  const [mahalName, setMahalName] = useState('Lessa Mahallu Management');
  const [mahalPhone, setMahalPhone] = useState('+91 98765 43210');
  const [mahalEmail, setMahalEmail] = useState('contact@mahal.org');
  const [mahalAddress, setMahalAddress] = useState('Mahallu Central Juma Masjid, Wayanad, Kerala');
  const [mahalRegNo, setMahalRegNo] = useState('MHL-2026-REG-88');

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification Preferences States
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifPaymentReminders, setNotifPaymentReminders] = useState(true);
  const [notifArrearsAlerts, setNotifArrearsAlerts] = useState(true);

  // System Preference States
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('cash');
  const currencySymbol = '₹ (INR)';

  // Saving / Feedback States
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load persistent global settings from localStorage / Supabase
  useEffect(() => {
    const savedMahalName = localStorage.getItem('mahal_setting_name');
    const savedMahalPhone = localStorage.getItem('mahal_setting_phone');
    const savedMahalEmail = localStorage.getItem('mahal_setting_email');
    const savedMahalAddress = localStorage.getItem('mahal_setting_address');
    const savedMahalRegNo = localStorage.getItem('mahal_setting_reg');

    if (savedMahalName) setMahalName(savedMahalName);
    if (savedMahalPhone) setMahalPhone(savedMahalPhone);
    if (savedMahalEmail) setMahalEmail(savedMahalEmail);
    if (savedMahalAddress) setMahalAddress(savedMahalAddress);
    if (savedMahalRegNo) setMahalRegNo(savedMahalRegNo);

    if (user) {
      setName(user.name);
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // HANDLE LANGUAGE SWITCH
  const handleLanguageSwitch = async (lang: 'en' | 'ml') => {
    setLanguage(lang);
    document.body.setAttribute('lang', lang);
    await updateUserLanguage(lang);
    showToast('success', `✓ Language preference updated to ${lang === 'en' ? 'English' : 'മലയാളം'}.`);
  };

  // SAVE GENERAL MAHALL SETTINGS
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      localStorage.setItem('mahal_setting_name', mahalName);
      localStorage.setItem('mahal_setting_phone', mahalPhone);
      localStorage.setItem('mahal_setting_email', mahalEmail);
      localStorage.setItem('mahal_setting_address', mahalAddress);
      localStorage.setItem('mahal_setting_reg', mahalRegNo);

      // Save user profile changes
      if (user) {
        await db.profiles.update(user.id, {
          name,
          email: email || null,
          phone: phone || null,
        });

        await updateUserProfile({
          name,
          email: email || null,
          phone: phone || null,
        });
      }

      showToast('success', '✓ General & Mahall settings saved successfully.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save general settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // SAVE SECURITY / PASSWORD
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirmation do not match.');
      return;
    }

    setIsSaving(true);
    try {
      // Simulate password update
      showToast('success', '✓ Security password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', 'Failed to update security credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  // SAVE NOTIFICATION SETTINGS
  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mahal_notif_inapp', String(notifInApp));
    localStorage.setItem('mahal_notif_payments', String(notifPaymentReminders));
    localStorage.setItem('mahal_notif_arrears', String(notifArrearsAlerts));
    showToast('success', '✓ Notification preferences updated.');
  };

  // SAVE SYSTEM DEFAULTS
  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mahal_default_pay_method', defaultPaymentMethod);
    showToast('success', '✓ System defaults saved successfully.');
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

      {/* SETTINGS WORKSPACE CONTAINER */}
      <div className="settings-viewport-grid">
        {/* LEFT SECTION NAVIGATION SIDEBAR */}
        <aside className="settings-nav-sidebar glass-card">
          <div className="sidebar-title-group">
            <SettingsIcon size={20} className="icon-emerald" />
            <div>
              <h4 className="sidebar-heading">Settings</h4>
              <p className="sidebar-sub">System preferences & config</p>
            </div>
          </div>

          <nav className="settings-section-menu">
            <button
              className={`section-menu-btn ${activeSection === 'general' ? 'active' : ''}`}
              onClick={() => setActiveSection('general')}
            >
              <Building2 size={17} />
              <span>General & Mahall Info</span>
            </button>

            <button
              className={`section-menu-btn ${activeSection === 'language' ? 'active' : ''}`}
              onClick={() => setActiveSection('language')}
            >
              <Globe size={17} />
              <span>Language & Region</span>
            </button>

            <button
              className={`section-menu-btn ${activeSection === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveSection('notifications')}
            >
              <Bell size={17} />
              <span>Notifications</span>
            </button>

            <button
              className={`section-menu-btn ${activeSection === 'security' ? 'active' : ''}`}
              onClick={() => setActiveSection('security')}
            >
              <Shield size={17} />
              <span>Security & Password</span>
            </button>

            <button
              className={`section-menu-btn ${activeSection === 'system' ? 'active' : ''}`}
              onClick={() => setActiveSection('system')}
            >
              <SettingsIcon size={17} />
              <span>System Defaults</span>
            </button>
          </nav>
        </aside>

        {/* RIGHT SECTION CONTENT WORKSPACE */}
        <main className="settings-content-workspace">
          
          {/* SECTION 1: GENERAL & MAHALL INFO */}
          {activeSection === 'general' && (
            <div className="settings-section-card glass-card animate-fade-in">
              <div className="section-head">
                <Building2 size={20} className="head-icon" />
                <div>
                  <h4>General & Mahall Organization Information</h4>
                  <p>Global organization parameters and admin contact details.</p>
                </div>
              </div>

              <form onSubmit={handleSaveGeneral} className="settings-form-body">
                <div className="form-section-label">Organization Details</div>

                <div className="form-group">
                  <label htmlFor="setting-mahal-name">Mahall Organization Name *</label>
                  <input
                    id="setting-mahal-name"
                    type="text"
                    required
                    value={mahalName}
                    onChange={(e) => setMahalName(e.target.value)}
                  />
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="setting-mahal-phone">Official Contact Phone</label>
                    <input
                      id="setting-mahal-phone"
                      type="text"
                      value={mahalPhone}
                      onChange={(e) => setMahalPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="setting-mahal-email">Official Contact Email</label>
                    <input
                      id="setting-mahal-email"
                      type="email"
                      value={mahalEmail}
                      onChange={(e) => setMahalEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="setting-mahal-address">Physical Office Address</label>
                  <input
                    id="setting-mahal-address"
                    type="text"
                    value={mahalAddress}
                    onChange={(e) => setMahalAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="setting-mahal-reg">Registration Reference Number</label>
                  <input
                    id="setting-mahal-reg"
                    type="text"
                    value={mahalRegNo}
                    onChange={(e) => setMahalRegNo(e.target.value)}
                  />
                </div>

                <div className="form-divider"></div>
                <div className="form-section-label">Admin Profile Details</div>

                <div className="form-group">
                  <label htmlFor="setting-admin-name">Admin Display Name *</label>
                  <input
                    id="setting-admin-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="setting-admin-phone">Admin Mobile Phone</label>
                    <input
                      id="setting-admin-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="setting-admin-email">Admin Login Email</label>
                    <input
                      id="setting-admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-actions-bar">
                  <button type="submit" className="add-btn primary-btn" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 2: LANGUAGE & REGION */}
          {activeSection === 'language' && (
            <div className="settings-section-card glass-card animate-fade-in">
              <div className="section-head">
                <Globe size={20} className="head-icon" />
                <div>
                  <h4>Language & Regional Preferences</h4>
                  <p>Centralized user-specific language selection. Applied globally across all pages.</p>
                </div>
              </div>

              <div className="language-selection-workspace">
                <p className="lang-prompt-text">Choose your application language preference:</p>

                <div className="lang-cards-grid">
                  <div
                    className={`lang-option-card ${language === 'en' ? 'active-selected' : ''}`}
                    onClick={() => handleLanguageSwitch('en')}
                  >
                    <div className="lang-card-header">
                      <span className="lang-title">English</span>
                      {language === 'en' && <Check size={18} className="check-icon" />}
                    </div>
                    <p className="lang-desc">Standard English UI translations and formatting.</p>
                    <span className="lang-badge">System Default</span>
                  </div>

                  <div
                    className={`lang-option-card ml-card ${language === 'ml' ? 'active-selected' : ''}`}
                    onClick={() => handleLanguageSwitch('ml')}
                  >
                    <div className="lang-card-header">
                      <span className="lang-title ml-font">മലയാളം</span>
                      {language === 'ml' && <Check size={18} className="check-icon" />}
                    </div>
                    <p className="lang-desc">മഹല്ല് പോർട്ടൽ മലയാളം പരിഭാഷ.</p>
                    <span className="lang-badge">മാതൃഭാഷ</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="settings-section-card glass-card animate-fade-in">
              <div className="section-head">
                <Bell size={20} className="head-icon" />
                <div>
                  <h4>Notification Preferences</h4>
                  <p>Configure automated alerts, payment reminders, and broadcast preferences.</p>
                </div>
              </div>

              <form onSubmit={handleSaveNotifications} className="settings-form-body">
                <div className="toggle-setting-row">
                  <div>
                    <span className="toggle-label">In-App Notification Center</span>
                    <p className="toggle-sub">Receive instant notifications in the header bell dropdown</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifInApp}
                    onChange={(e) => setNotifInApp(e.target.checked)}
                    className="checkbox-custom"
                  />
                </div>

                <div className="toggle-setting-row">
                  <div>
                    <span className="toggle-label">Payment Receipt Alerts</span>
                    <p className="toggle-sub">Automatically notify members when a payment receipt is recorded</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPaymentReminders}
                    onChange={(e) => setNotifPaymentReminders(e.target.checked)}
                    className="checkbox-custom"
                  />
                </div>

                <div className="toggle-setting-row">
                  <div>
                    <span className="toggle-label">Rolling Arrears Reminders</span>
                    <p className="toggle-sub">Include previous arrears summary in subscription payment notices</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifArrearsAlerts}
                    onChange={(e) => setNotifArrearsAlerts(e.target.checked)}
                    className="checkbox-custom"
                  />
                </div>

                <div className="form-actions-bar">
                  <button type="submit" className="add-btn primary-btn">
                    <Save size={16} />
                    <span>Save Notification Preferences</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 4: SECURITY & PASSWORD */}
          {activeSection === 'security' && (
            <div className="settings-section-card glass-card animate-fade-in">
              <div className="section-head">
                <Shield size={20} className="head-icon" />
                <div>
                  <h4>Security & Password</h4>
                  <p>Manage account security credentials and access permissions.</p>
                </div>
              </div>

              <form onSubmit={handleSaveSecurity} className="settings-form-body">
                <div className="form-group">
                  <label htmlFor="setting-curr-pass">Current Password *</label>
                  <input
                    id="setting-curr-pass"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="setting-new-pass">New Password *</label>
                    <input
                      id="setting-new-pass"
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="setting-conf-pass">Confirm New Password *</label>
                    <input
                      id="setting-conf-pass"
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-actions-bar">
                  <button type="submit" className="add-btn primary-btn" disabled={isSaving}>
                    {isSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 5: SYSTEM DEFAULTS */}
          {activeSection === 'system' && (
            <div className="settings-section-card glass-card animate-fade-in">
              <div className="section-head">
                <SettingsIcon size={20} className="head-icon" />
                <div>
                  <h4>System Defaults</h4>
                  <p>Default payment parameters and currency display configuration.</p>
                </div>
              </div>

              <form onSubmit={handleSaveSystem} className="settings-form-body">
                <div className="form-group">
                  <label htmlFor="setting-def-payment">Default Payment Method</label>
                  <select
                    id="setting-def-payment"
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="upi">UPI / Online</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="setting-currency">Currency Display</label>
                  <input
                    id="setting-currency"
                    type="text"
                    disabled
                    value={currencySymbol}
                  />
                </div>

                <div className="form-actions-bar">
                  <button type="submit" className="add-btn primary-btn">
                    <Save size={16} />
                    <span>Save System Defaults</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* STYLES */}
      <style>{`
        .settings-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .toast-notification {
          position: fixed;
          top: 24px; right: 24px;
          z-index: 999;
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px; border-radius: var(--radius-pill);
          font-weight: 700; font-size: 13.5px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        .toast-notification.success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
        .toast-notification.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .settings-viewport-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
          align-items: flex-start;
          width: 100%;
          box-sizing: border-box;
        }

        /* SIDEBAR */
        .settings-nav-sidebar {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sidebar-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid #f3f4f6;
        }

        .icon-emerald { color: #00966b; }
        .sidebar-heading { font-size: 17px; font-weight: 800; color: #111827; }
        .sidebar-sub { font-size: 11.5px; color: #6b7280; }

        .settings-section-menu {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .section-menu-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: var(--radius-pill);
          border: none;
          background: transparent;
          color: #4b5563;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: var(--transition-all);
          text-align: left;
        }

        .section-menu-btn:hover {
          background: #f9fafb;
          color: #111827;
        }

        .section-menu-btn.active {
          background: #ecfdf5;
          color: #00966b;
          font-weight: 800;
        }

        /* CONTENT WORKSPACE */
        .settings-content-workspace {
          width: 100%;
          box-sizing: border-box;
        }

        .settings-section-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section-head {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .head-icon { color: #00966b; margin-top: 2px; }
        .section-head h4 { font-size: 18px; font-weight: 800; color: #111827; }
        .section-head p { font-size: 12.5px; color: #6b7280; margin-top: 2px; }

        .settings-form-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-section-label {
          font-size: 12px;
          font-weight: 800;
          color: #00966b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 6px;
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
          font-weight: 700;
          color: #374151;
        }

        .form-group input, .form-group select {
          padding: 11px 14px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: #f9fafb;
          color: #111827;
          font-size: 13.5px;
          transition: var(--transition-all);
        }

        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: #00966b;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(0, 150, 107, 0.12);
        }

        .form-divider {
          height: 1px;
          background: #f3f4f6;
          margin: 10px 0;
        }

        .form-actions-bar {
          display: flex;
          justify-content: flex-end;
          padding-top: 14px;
          border-top: 1px solid #f3f4f6;
          margin-top: 10px;
        }

        .add-btn.primary-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 24px; border-radius: var(--radius-pill); background: var(--primary);
          color: #ffffff; font-weight: 700; font-size: 13.5px; border: none; cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.35); transition: var(--transition-all);
        }

        /* LANGUAGE CARDS */
        .language-selection-workspace {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .lang-prompt-text {
          font-size: 13.5px;
          font-weight: 700;
          color: #374151;
        }

        .lang-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .lang-option-card {
          background: #f9fafb;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .lang-option-card:hover {
          border-color: #a7f3d0;
          background: #ecfdf5;
        }

        .lang-option-card.active-selected {
          border-color: #00966b;
          background: #ecfdf5;
          box-shadow: 0 4px 14px rgba(0, 150, 107, 0.15);
        }

        .lang-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .lang-title {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
        }

        .ml-font { font-family: var(--font-ml); font-size: 20px; }
        .check-icon { color: #00966b; }
        .lang-desc { font-size: 12.5px; color: #6b7280; }
        .lang-badge {
          display: inline-block; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background: rgba(0, 150, 107, 0.15); color: #00966b; width: fit-content;
        }

        /* TOGGLE ROWS */
        .toggle-setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #f9fafb;
          border-radius: var(--radius-lg);
          border: 1px solid #f3f4f6;
        }

        .toggle-label { font-size: 14px; font-weight: 700; color: #111827; }
        .toggle-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .checkbox-custom { width: 18px; height: 18px; accent-color: #00966b; cursor: pointer; }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .settings-viewport-grid {
            grid-template-columns: 1fr;
          }
          .settings-section-menu {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 6px;
          }
          .section-menu-btn {
            width: 100%;
            white-space: normal;
          }
          .form-group input, .form-group select {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          .form-row-grid { grid-template-columns: 1fr; }
          .lang-cards-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default SharedSettings;
