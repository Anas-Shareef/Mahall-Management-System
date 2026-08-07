import React, { useState, useEffect } from 'react';
import { SidePanel } from './SidePanel';
import { db } from '../services/db';
import type { Household, Member, MemberSubscription, Payment } from '../services/db';
import { Home, Users, FileText, Receipt, ShieldCheck, Plus, DollarSign, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';

interface HouseholdDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household | null;
  onGrantAccess?: (member: Member) => void;
  onRefresh?: () => void;
}

export const HouseholdDetailsModal: React.FC<HouseholdDetailsModalProps> = ({
  isOpen,
  onClose,
  household,
  onGrantAccess,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'members' | 'subscriptions' | 'payments'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSubscriptions, setMemberSubscriptions] = useState<{ member: Member; sub: MemberSubscription | null }[]>([]);
  const [householdPayments, setHouseholdPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (household) {
      const loadHouseholdDetails = async () => {
        try {
          const [hMembers, allSubs, allPayments] = await Promise.all([
            db.members.getByHousehold(household.id),
            db.subscriptions.get(),
            db.payments.get(),
          ]);

          setMembers(hMembers);

          // Map subscriptions for members
          const subMap = hMembers.map((m) => {
            const sub = allSubs.find((s) => s.member_id === m.id) || null;
            return { member: m, sub };
          });
          setMemberSubscriptions(subMap);

          // Filter payments for members of this household
          const memberIds = hMembers.map((m) => m.id);
          const hPayments = allPayments.filter((p) => memberIds.includes(p.member_id));
          setHouseholdPayments(hPayments);
        } catch (err) {
          console.error('Error loading household details:', err);
        }
      };

      loadHouseholdDetails();
    }
  }, [household]);

  if (!household) return null;

  // Calculate totals
  const totalExpected = memberSubscriptions.reduce((acc, curr) => acc + (curr.sub?.total_due || 0), 0);
  const totalPaid = memberSubscriptions.reduce((acc, curr) => acc + (curr.sub?.total_paid || 0), 0);
  const outstanding = Math.max(0, totalExpected - totalPaid);
  const portalUsersCount = members.filter((m) => m.portal_access).length;
  const { branding } = useOrganization();

  // WhatsApp Share Helper
  const handleShareHouseholdWhatsApp = () => {
    let text = `🏡 *MAHALLU HOUSEHOLD STATEMENT & ROSTER*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📌 *House No:* H-${household.house_number}\n`;
    text += `👤 *House Owner:* ${household.house_owner_name}\n`;
    text += `📞 *Phone:* ${household.house_owner_phone || 'N/A'}\n`;
    text += `📍 *Area/Zone:* ${household.area || 'Mahallu Central'}\n`;
    if (household.address) text += `🏠 *Address:* ${household.address}\n`;
    text += `👥 *Total Family Members:* ${members.length}\n\n`;

    text += `📊 *FINANCIAL SUMMARY*\n`;
    text += `• Total Expected: ₹${totalExpected.toLocaleString('en-IN')}\n`;
    text += `• Total Paid: ₹${totalPaid.toLocaleString('en-IN')}\n`;
    text += `• *Outstanding Balance:* ₹${outstanding.toLocaleString('en-IN')}\n\n`;

    text += `📋 *FAMILY MEMBERS ROSTER*\n`;
    memberSubscriptions.forEach(({ member, sub }, idx) => {
      text += `${idx + 1}. *${member.name}* (${member.relationship})\n   Paid: ₹${(sub?.total_paid || 0).toLocaleString('en-IN')} | Bal: ₹${(sub?.balance || 0).toLocaleString('en-IN')}\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Shared via ${branding?.organizationName || 'Mahall Management System'}_`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // PDF Form Download Helper
  const handleDownloadHouseholdFormPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Household Form - H-${household.house_number}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; background: #fff; line-height: 1.4; }
          .form-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .org-title { font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0; }
          .form-subtitle { font-size: 13px; font-weight: 700; color: #00966b; text-transform: uppercase; margin-top: 4px; }
          .form-meta-row { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-top: 8px; }
          
          .info-box-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
          .info-field { font-size: 12px; }
          .info-field label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; }
          .info-field span { font-weight: 700; color: #0f172a; font-size: 13px; }
          
          .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; border-left: 3px solid #00966b; padding-left: 8px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th { background: #0f172a; color: #fff; font-size: 11px; text-transform: uppercase; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          tr.total-row { background: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a; }
          
          .financial-summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; }
          .fin-card { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; }
          .fin-card label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .fin-card .val { font-size: 16px; font-weight: 800; margin-top: 2px; }
          
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
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
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="background: #00966b; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">🖨️ Save as PDF / Print Form</button>
        </div>

        <div class="form-header">
          <h1 class="org-title">${branding?.organizationName || 'VELLIKKEEL MAHALLU JAMA-ATH'}</h1>
          <div class="form-subtitle">OFFICIAL HOUSEHOLD ROSTER & FINANCIAL STATEMENT FORM</div>
          <div class="form-meta-row">
            <span>FORM REF: FORM-${household.id.slice(0, 8).toUpperCase()}</span>
            <span>DATE: ${new Date().toLocaleDateString('en-IN')}</span>
          </div>
        </div>

        <div class="info-box-grid">
          <div class="info-field">
            <label>House Number</label>
            <span>H-${household.house_number}</span>
          </div>
          <div class="info-field">
            <label>House Owner Name</label>
            <span>${household.house_owner_name}</span>
          </div>
          <div class="info-field">
            <label>Contact Phone</label>
            <span>${household.house_owner_phone || 'N/A'}</span>
          </div>
          <div class="info-field">
            <label>Mahallu Ward / Area</label>
            <span>${household.area || 'Mahallu Central'}</span>
          </div>
          <div class="info-field" style="grid-column: span 2;">
            <label>Residential Address</label>
            <span>${household.address || 'N/A'}</span>
          </div>
        </div>

        <div class="section-title">FAMILY ROSTER & INDIVIDUAL FINANCIAL SUMMARY</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Member Name</th>
              <th>Relationship</th>
              <th>Member ID</th>
              <th style="text-align: right;">Total Due</th>
              <th style="text-align: right;">Total Paid</th>
              <th style="text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${memberSubscriptions.map(({ member, sub }, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${member.name}</strong></td>
                <td>${member.relationship}</td>
                <td>${member.member_number || `MEM-${member.id.slice(0, 6)}`}</td>
                <td style="text-align: right;">₹${(sub?.total_due || 0).toLocaleString('en-IN')}</td>
                <td style="text-align: right; color: #00966b; font-weight: bold;">₹${(sub?.total_paid || 0).toLocaleString('en-IN')}</td>
                <td style="text-align: right; color: ${(sub?.balance || 0) > 0 ? '#dc2626' : '#00966b'}; font-weight: bold;">₹${(sub?.balance || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4">CONSOLIDATED HOUSEHOLD TOTAL (${members.length} MEMBERS)</td>
              <td style="text-align: right;">₹${totalExpected.toLocaleString('en-IN')}</td>
              <td style="text-align: right; color: #00966b;">₹${totalPaid.toLocaleString('en-IN')}</td>
              <td style="text-align: right; color: ${outstanding > 0 ? '#dc2626' : '#00966b'};">₹${outstanding.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">CONSOLIDATED FINANCIAL STATEMENT</div>
        <div class="financial-summary-cards">
          <div class="fin-card">
            <label>Expected Fees</label>
            <div class="val">₹${totalExpected.toLocaleString('en-IN')}</div>
          </div>
          <div class="fin-card">
            <label>Total Amount Paid</label>
            <div class="val" style="color: #00966b;">₹${totalPaid.toLocaleString('en-IN')}</div>
          </div>
          <div class="fin-card">
            <label>Outstanding Balance</label>
            <div class="val" style="color: ${outstanding > 0 ? '#dc2626' : '#00966b'};">₹${outstanding.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div class="signature-section">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">House Owner Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Mahallu Secretary</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-title">Official Seal & Date</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Household #H-${household.house_number}`}
      subtitle={`Owner: ${household.house_owner_name} • ${household.address || 'Mahallu Central'} • ${portalUsersCount} Active Portal User(s)`}
      icon={<Home size={22} className="text-emerald" />}
      size="lg"
      footer={
        <div className="flex-between width-100 align-items-center">
          <button
            type="button"
            className="pill-btn-primary font-xs flex-row-gap-xs"
            onClick={() => {
              onClose();
              navigate('/admin/members/new');
            }}
          >
            <Plus size={14} /> Add Household Member
          </button>
          <button type="button" className="pill-btn-ghost font-xs" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="flex-col gap-md">
        {/* SUMMARY CARDS GRID */}
        <div className="analytics-stats-grid">
          <div className="stat-card glass-card">
            <div className="stat-icon emerald"><Users size={18} /></div>
            <div className="stat-content">
              <span className="stat-label">Total Family Members</span>
              <h4 className="stat-value">{members.length}</h4>
            </div>
          </div>

          <div className="stat-card glass-card">
            <div className="stat-icon info"><FileText size={18} /></div>
            <div className="stat-content">
              <span className="stat-label">Expected Fees</span>
              <h4 className="stat-value">₹{totalExpected}</h4>
            </div>
          </div>

          <div className="stat-card glass-card">
            <div className="stat-icon success"><DollarSign size={18} /></div>
            <div className="stat-content">
              <span className="stat-label">Total Paid</span>
              <h4 className="stat-value text-emerald">₹{totalPaid}</h4>
            </div>
          </div>

          <div className="stat-card glass-card">
            <div className="stat-icon danger"><Receipt size={18} /></div>
            <div className="stat-content">
              <span className="stat-label">Outstanding Balance</span>
              <h4 className="stat-value text-danger">₹{outstanding}</h4>
            </div>
          </div>
        </div>

        {/* TABS BAR */}
        <div className="settings-horizontal-tabs-bar" style={{ marginBottom: 12 }}>
          <button
            className={`settings-pill-tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={15} /> Family Members ({members.length})
          </button>
          <button
            className={`settings-pill-tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <FileText size={15} /> Consolidated Ledgers
          </button>
          <button
            className={`settings-pill-tab ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <Receipt size={15} /> Household Payments ({householdPayments.length})
          </button>
        </div>

        {/* TAB 1: MEMBERS */}
        {activeTab === 'members' && (
          <div className="flex-col gap-xs animate-fade-in">
            {members.map((m) => (
              <div key={m.id} className="glass-card padding-sm flex-between align-items-center" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <div>
                  <div className="font-sm font-weight-700 text-dark">
                    {m.name} {m.relationship === 'Self (Owner)' && <span className="font-2xs text-emerald font-weight-800">(House Owner)</span>}
                  </div>
                  <div className="font-2xs color-subtle">{m.relationship} • {m.phone || 'No phone'}</div>
                </div>
                <div className="flex-row-gap-xs align-items-center">
                  <span className={`status-badge-pill ${m.portal_status || 'not_granted'}`}>
                    {(m.portal_status || 'not_granted').replace('_', ' ').toUpperCase()}
                  </span>
                  {onGrantAccess && (
                    <button
                      type="button"
                      className="pill-btn-ghost font-2xs flex-row-gap-xs"
                      onClick={() => {
                        onClose();
                        onGrantAccess(m);
                      }}
                    >
                      <ShieldCheck size={13} /> Grant / Manage Access
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: CONSOLIDATED SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="flex-col gap-sm animate-fade-in">
            <div className="table-responsive">
              <table className="custom-data-table font-xs">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Expected</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {memberSubscriptions.map(({ member, sub }) => (
                    <tr key={member.id}>
                      <td className="font-weight-700">{member.name}</td>
                      <td>₹{sub?.total_due || 0}</td>
                      <td className="text-emerald font-weight-800">₹{sub?.total_paid || 0}</td>
                      <td className="text-danger font-weight-800">₹{sub?.balance || 0}</td>
                      <td>
                        <span className={`status-badge-pill ${sub?.status || 'unpaid'}`}>
                          {(sub?.status || 'unpaid').replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="flex-col gap-sm animate-fade-in">
            {householdPayments.length === 0 ? (
              <div className="notif-empty">No offline payments recorded for this household yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="custom-data-table font-xs">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {householdPayments.map((p) => {
                      const m = members.find((mem) => mem.id === p.member_id);
                      return (
                        <tr key={p.id}>
                          <td>{p.payment_date}</td>
                          <td className="font-weight-700">{m?.name || 'Household Member'}</td>
                          <td className="font-weight-800 text-emerald">₹{p.amount}</td>
                          <td className="text-uppercase font-weight-700">{p.payment_method}</td>
                          <td><code>{p.reference_number || 'REC-OFFLINE'}</code></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* PDF FORM DOWNLOAD & WHATSAPP SHARE ACTION BAR */}
        <div className="flex-between align-items-center flex-wrap gap-xs margin-top-sm padding-top-xs" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            className="pill-btn-ghost font-xs flex-row-gap-xs"
            onClick={handleDownloadHouseholdFormPDF}
            style={{ border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 700 }}
          >
            <FileText size={15} className="text-primary" />
            <span>Download PDF (Form Look)</span>
          </button>

          <button
            type="button"
            className="pill-btn-ghost font-xs flex-row-gap-xs"
            onClick={handleShareHouseholdWhatsApp}
            style={{ border: '1.5px solid #86efac', background: '#f0fdf4', color: '#15803d', fontWeight: 700 }}
          >
            <Share2 size={15} className="text-emerald" />
            <span>Share Details via WhatsApp</span>
          </button>
        </div>
      </div>
    </SidePanel>
  );
};

export default HouseholdDetailsModal;
