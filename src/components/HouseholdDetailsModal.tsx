import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { db } from '../services/db';
import type { Household, Member, MemberSubscription, Payment } from '../services/db';
import { Home, Users, FileText, Receipt, ShieldCheck, Plus, Eye, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'members' | 'subscriptions' | 'payments'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSubscriptions, setMemberSubscriptions] = useState<{ member: Member; sub: MemberSubscription | null }[]>([]);
  const [householdPayments, setHouseholdPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (household) {
      const loadHouseholdDetails = async () => {
        setLoading(true);
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
        } finally {
          setLoading(false);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Household #H-${household.house_number}`}
      subtitle={`Owner: ${household.house_owner_name} • ${household.address || 'Mahallu Central'}`}
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
      </div>
    </Modal>
  );
};

export default HouseholdDetailsModal;
