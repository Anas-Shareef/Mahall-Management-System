import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { VmOneLogo } from '../components/VmOneLogo';
import { db } from '../services/db';
import type { Expense } from '../services/db';
import { 
  Building2, UserCheck, Award, Bell, 
  Database, Save, RotateCcw, CheckCircle, AlertCircle, 
  Download, Loader2, FileSpreadsheet, MessageSquare, Mail, ShieldCheck,
  Receipt, Printer, DollarSign, TrendingDown, FileText, PieChart
} from 'lucide-react';

type SettingsSection = 
  | 'organization'
  | 'administrator'
  | 'certificates'
  | 'notifications'
  | 'backup'
  | 'portal'
  | 'expenses_report';

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
  // Member Portal Settings
  const [maxPortalMembers, setMaxPortalMembers] = useState<number>(branding.maxPortalMembersPerHousehold || 2);
  const [enablePortal, setEnablePortal] = useState<boolean>(branding.enableMemberPortal ?? true);

  // Certificate Templates State
  const [activeCertTab, setActiveCertTab] = useState<'nikah' | 'noc' | 'membership'>('nikah');
  const [certNikahBody, setCertNikahBody] = useState('This is to certify that the marriage (Nikah) between {{Groom_Name}} and {{Bride_Name}} was solemnized at {{Venue}} on {{Date}} under official Mahallu Register No. {{Register_No}}.');
  const [certNocBody, setCertNocBody] = useState('The Mahallu Committee has No Objection for {{Member_Name}} (Member ID: {{Member_ID}}) to apply for official administrative procedures.');
  const [certMembershipBody, setCertMembershipBody] = useState('This is to certify that {{Head_Name}} and family residing at {{House_Address}} are registered members of VM ONE Mahallu Committee.');

  // Notification Toggles
  const [pushAlerts, setPushAlerts] = useState(true);
  const [emailConfirmations, setEmailConfirmations] = useState(true);
  const [whatsappReminders, setWhatsappReminders] = useState(true);

  // Expense Data & Reports State
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const fetchExpensesData = async () => {
      try {
        const list = await db.expenses.getAll();
        setExpenses(list || []);
      } catch (err) {
        console.warn('Failed to load expenses in settings:', err);
      }
    };
    fetchExpensesData();
  }, []);

  // Category Summary Memo for Expenses
  const categorySummary = useMemo(() => {
    const map: { [key: string]: { categoryName: string; totalAmount: number; count: number } } = {};
    expenses.forEach((e) => {
      if (e.status === 'approved' || e.status === 'pending') {
        const cat = e.category_name || 'General';
        if (!map[cat]) {
          map[cat] = { categoryName: cat, totalAmount: 0, count: 0 };
        }
        map[cat].totalAmount += e.amount || 0;
        map[cat].count += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [expenses]);

  // CSV Exporter for Expenses
  const handleExportExpensesCsv = async () => {
    try {
      const expList = expenses.length > 0 ? expenses : await db.expenses.getAll();
      if (expList.length === 0) {
        showToast('error', 'No expense records found to export.');
        return;
      }

      const headers = [
        'Expense Number',
        'Expense Date',
        'Category Name',
        'Paid To',
        'Description',
        'Amount (INR)',
        'Payment Method',
        'Fund ID',
        'Reference Number',
        'Status',
        'Approved By',
        'Approved Date',
      ];

      const rows = expList.map((e: any) => [
        `"${e.expense_number}"`,
        `"${e.expense_date}"`,
        `"${(e.category_name || '').replace(/"/g, '""')}"`,
        `"${(e.paid_to || '').replace(/"/g, '""')}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        e.amount,
        `"${e.payment_method}"`,
        `"${e.fund_id || 'general_fund'}"`,
        `"${e.reference_number || e.transaction_reference || e.upi_reference_id || ''}"`,
        `"${e.status.toUpperCase()}"`,
        `"${(e.approved_by || '').replace(/"/g, '""')}"`,
        `"${e.approved_at ? new Date(e.approved_at).toLocaleDateString() : ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mahallu_Expenses_Ledger_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('success', '✓ Expense Ledger CSV Report exported successfully!');
    } catch (err) {
      showToast('error', 'Failed to export Expense Report CSV.');
    }
  };

  // Printable PDF Statement Generator for Expenses
  const handlePrintExpensesPdfReport = () => {
    if (expenses.length === 0) {
      showToast('error', 'No expense records available to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Popup blocked. Please allow popups to generate PDF report.');
      return;
    }

    const approvedList = expenses.filter((e) => e.status === 'approved');
    const totalSpent = approvedList.reduce((sum, e) => sum + (e.amount || 0), 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Audit & Disbursement Report - ${branding.organizationName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; background: #fff; line-height: 1.4; }
          .form-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .org-title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0; }
          .form-subtitle { font-size: 13px; font-weight: 700; color: #00966b; text-transform: uppercase; margin-top: 4px; }
          .form-meta { font-size: 11px; color: #64748b; margin-top: 6px; }
          
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
          .summary-card { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
          .summary-card label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .summary-card .val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { background: #0f172a; color: #fff; font-size: 10px; text-transform: uppercase; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          tr.total-row { background: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a; }
          
          .status-badge { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
          .status-approved { background: #dcfce7; color: #15803d; }
          .status-pending { background: #fef3c7; color: #b45309; }
          
          .signatures { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
          .sig-box { text-align: center; width: 180px; }
          .sig-line { border-bottom: 1px solid #0f172a; height: 35px; margin-bottom: 6px; }
          .sig-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="form-header">
          <h1 class="org-title">${branding.organizationName}</h1>
          <div class="form-subtitle">OFFICIAL EXPENSE DISBURSEMENT & AUDIT STATEMENT</div>
          <div class="form-meta">Generated on ${new Date().toLocaleString()} | Mahallu Committee Audit</div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <label>Total Recorded Expenses</label>
            <div class="val">${expenses.length} Records</div>
          </div>
          <div class="summary-card">
            <label>Total Approved Disbursements</label>
            <div class="val" style="color:#00966b">₹${totalSpent.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card">
            <label>Pending Audit Approvals</label>
            <div class="val" style="color:#d97706">₹${expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Exp #</th>
              <th>Date</th>
              <th>Category</th>
              <th>Paid To</th>
              <th>Description</th>
              <th>Method</th>
              <th>Status</th>
              <th style="text-align: right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map((e) => `
              <tr>
                <td><strong>${e.expense_number}</strong></td>
                <td>${e.expense_date}</td>
                <td>${e.category_name}</td>
                <td>${e.paid_to}</td>
                <td>${e.description}</td>
                <td>${e.payment_method.toUpperCase()}</td>
                <td><span class="status-badge ${e.status === 'approved' ? 'status-approved' : 'status-pending'}">${e.status}</span></td>
                <td style="text-align: right; font-weight: 700">₹${(e.amount || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="7" style="text-align: right">TOTAL APPROVED DISBURSEMENTS:</td>
              <td style="text-align: right; font-size: 13px; color: #00966b">₹${totalSpent.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Prepared By (Accountant)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Verified By (Auditor)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Approved By (President/Secretary)</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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
        maxPortalMembersPerHousehold: maxPortalMembers,
        enableMemberPortal: enablePortal,
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
          <option value="expenses_report">💸 Expense Reports & Audit</option>
          <option value="notifications">🔔 Notifications & Alerts</option>
          <option value="backup">💾 Backup & Data Export</option>
          <option value="portal">🔑 Member Portal Settings</option>
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
          className={`settings-pill-tab ${activeSection === 'expenses_report' ? 'active' : ''}`}
          onClick={() => setActiveSection('expenses_report')}
        >
          <Receipt size={16} />
          <span>Expense Reports & Audit</span>
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

        <button
          className={`settings-pill-tab ${activeSection === 'portal' ? 'active' : ''}`}
          onClick={() => setActiveSection('portal')}
        >
          <ShieldCheck size={16} />
          <span>Member Portal Settings</span>
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
                  <input id="logo-upload-input" type="file" accept="image/*" className="display-none" style={{ display: 'none' }} onChange={handleLogoUpload} />
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
                  <input id="seal-upload-input" type="file" accept="image/*" className="display-none" style={{ display: 'none' }} onChange={handleSealUpload} />
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

              <div className="setting-option-card">
                <div className="flex-row-gap-md align-items-center">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h4 className="font-sm font-weight-800 text-dark margin-0">Export Expense Ledger & Audits (CSV)</h4>
                    <p className="font-2xs color-subtle margin-top-3xs">Complete CSV ledger of all recorded expenses, categories, voucher numbers, and approval status</p>
                  </div>
                </div>
                <button className="pill-btn-secondary font-xs" style={{ padding: '10px 18px', borderRadius: 9999 }} onClick={handleExportExpensesCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: MEMBER PORTAL SETTINGS */}
        {activeSection === 'portal' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ borderRadius: 24, padding: 32, border: '1.5px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
            <div className="section-head margin-bottom-lg" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#ecfdf5', color: '#01A350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-lg font-weight-800 text-dark margin-0">Member Portal Settings</h3>
                <p className="font-xs color-subtle margin-top-3xs">Configure maximum portal members per household, authentication features, and access policies.</p>
              </div>
            </div>

            <div className="settings-form-body flex-col gap-md">
              <div className="setting-option-card flex-between align-items-center flex-wrap gap-md" style={{ padding: 20, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h4 className="font-sm font-weight-800 text-dark margin-0">Maximum Portal Members Per Household</h4>
                  <p className="font-2xs color-subtle margin-top-3xs">Controls how many household members are permitted to hold active Member Portal login accounts simultaneously (Default: 2).</p>
                </div>
                <div style={{ width: 140 }}>
                  <input
                    type="number"
                    className="form-control font-weight-800 text-emerald"
                    min="1"
                    max="10"
                    value={maxPortalMembers}
                    onChange={(e) => setMaxPortalMembers(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  />
                </div>
              </div>

              <div className="setting-option-card flex-between align-items-center flex-wrap gap-md" style={{ padding: 20, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h4 className="font-sm font-weight-800 text-dark margin-0">Enable Member Portal Authentication</h4>
                  <p className="font-2xs color-subtle margin-top-3xs">When enabled, members with active portal credentials can log in to view household subscription ledgers.</p>
                </div>
                <label className="ios-toggle-switch">
                  <input
                    type="checkbox"
                    checked={enablePortal}
                    onChange={(e) => setEnablePortal(e.target.checked)}
                  />
                  <span className="ios-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: EXPENSE REPORTS & AUDITS */}
        {activeSection === 'expenses_report' && (
          <div className="settings-section-card glass-card animate-fade-in" style={{ borderRadius: 24, padding: 32, border: '1.5px solid #e2e8f0', background: '#ffffff', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
            <div className="section-head margin-bottom-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={24} />
                </div>
                <div>
                  <h3 className="font-lg font-weight-800 text-dark margin-0">Expense Reports & Audit Statement</h3>
                  <p className="font-xs color-subtle margin-top-3xs">Official financial reports, category breakdown ledgers, and formal PDF/CSV statements for all Mahallu disbursements.</p>
                </div>
              </div>

              <div className="flex-row-gap-xs align-items-center">
                <button type="button" className="pill-btn-ghost font-xs" onClick={handleExportExpensesCsv}>
                  <Download size={14} /> Export CSV Report
                </button>
                <button type="button" className="pill-btn-primary font-xs" onClick={handlePrintExpensesPdfReport}>
                  <Printer size={14} /> Print Audit PDF
                </button>
              </div>
            </div>

            {/* EXPENSE FINANCIAL SUMMARY METRICS */}
            <div className="summary-cards-grid margin-bottom-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
                <div className="flex-between align-items-center margin-bottom-xs">
                  <span className="font-2xs font-weight-700 color-subtle text-uppercase">Approved Disbursements</span>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={16} />
                  </div>
                </div>
                <div className="font-lg font-weight-800 text-dark">
                  ₹{expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString('en-IN')}
                </div>
                <div className="font-3xs color-subtle margin-top-3xs">
                  {expenses.filter(e => e.status === 'approved').length} Approved Vouchers
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
                <div className="flex-between align-items-center margin-bottom-xs">
                  <span className="font-2xs font-weight-700 color-subtle text-uppercase">Pending Approvals</span>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown size={16} />
                  </div>
                </div>
                <div className="font-lg font-weight-800 text-dark">
                  ₹{expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString('en-IN')}
                </div>
                <div className="font-3xs color-subtle margin-top-3xs">
                  {expenses.filter(e => e.status === 'pending').length} Pending Vouchers
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
                <div className="flex-between align-items-center margin-bottom-xs">
                  <span className="font-2xs font-weight-700 color-subtle text-uppercase">Active Categories</span>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PieChart size={16} />
                  </div>
                </div>
                <div className="font-lg font-weight-800 text-dark">
                  {categorySummary.length} Categories
                </div>
                <div className="font-3xs color-subtle margin-top-3xs">
                  Disbursement Fund Types
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
                <div className="flex-between align-items-center margin-bottom-xs">
                  <span className="font-2xs font-weight-700 color-subtle text-uppercase">Total Records</span>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={16} />
                  </div>
                </div>
                <div className="font-lg font-weight-800 text-dark">
                  {expenses.length} Expenses
                </div>
                <div className="font-3xs color-subtle margin-top-3xs">
                  Audited Logged Entries
                </div>
              </div>
            </div>

            {/* CATEGORY BREAKDOWN TABLE */}
            <div className="margin-bottom-xl">
              <h4 className="font-sm font-weight-800 text-dark margin-bottom-sm flex-row-gap-xs align-items-center">
                <PieChart size={16} className="text-emerald" /> Category Breakdown Ledger
              </h4>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Category Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>Transactions</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Total Spent (INR)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySummary.map((cat, idx) => {
                      const totalApproved = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 1);
                      const sharePct = Math.round((cat.totalAmount / totalApproved) * 100);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{cat.categoryName}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{cat.count} Vouchers</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#01A350' }}>₹{cat.totalAmount.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>{sharePct}%</td>
                        </tr>
                      );
                    })}
                    {categorySummary.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No category disbursements recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EXPENSE TRANSACTIONS AUDIT ROSTER TABLE */}
            <div>
              <div className="flex-between align-items-center margin-bottom-sm">
                <h4 className="font-sm font-weight-800 text-dark margin-0 flex-row-gap-xs align-items-center">
                  <FileText size={16} className="text-emerald" /> Audit Disbursement Ledger
                </h4>
                <button type="button" className="pill-btn-ghost font-2xs" onClick={handleExportExpensesCsv}>
                  <Download size={12} /> Download CSV Report
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Exp #</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Paid To</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Method</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>{e.expense_number}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{e.expense_date}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{e.category_name}</td>
                        <td style={{ padding: '10px 14px' }}>{e.paid_to}</td>
                        <td style={{ padding: '10px 14px', color: '#475569', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>{e.payment_method}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '10px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: e.status === 'approved' ? '#dcfce7' : e.status === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: e.status === 'approved' ? '#15803d' : e.status === 'pending' ? '#b45309' : '#b91c1c',
                          }}>
                            {e.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{(e.amount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No expense records available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
