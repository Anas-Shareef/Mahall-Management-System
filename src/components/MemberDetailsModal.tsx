import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { db } from '../services/db';
import type { Member, Household, MemberSubscription, Payment } from '../services/db';
import { User, Home, FileText, Receipt, ShieldCheck } from 'lucide-react';

interface MemberDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onGrantAccess?: (member: Member) => void;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  isOpen,
  onClose,
  member,
  onGrantAccess,
}) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'household' | 'subscriptions' | 'payments'>('personal');
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<Member[]>([]);
  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      const loadMemberDetails = async () => {
        setLoading(true);
        try {
          const [house, hMembers, subs, pays] = await Promise.all([
            db.households.getById(member.household_id),
            db.members.getByHousehold(member.household_id),
            db.subscriptions.getByMember(member.id),
            db.payments.getByMember(member.id),
          ]);
          setHousehold(house);
          setHouseholdMembers(hMembers);
          setSubscriptions(subs);
          setPayments(pays);
        } catch (err) {
          console.error('Error loading member details:', err);
        } finally {
          setLoading(false);
        }
      };

      loadMemberDetails();
    }
  }, [member]);

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member.name}
      subtitle={`Member Record • Household No. ${household?.house_number || 'N/A'}`}
      icon={<User size={22} className="text-emerald" />}
      size="lg"
      footer={
        <div className="flex-between width-100 align-items-center">
          <span className={`status-badge-pill ${member.portal_status || 'not_granted'}`}>
            Portal Access: {(member.portal_status || 'not_granted').replace('_', ' ').toUpperCase()}
          </span>
          <div className="flex-row-gap-xs align-items-center">
            {onGrantAccess && (
              <button
                type="button"
                className="pill-btn-primary font-xs flex-row-gap-xs"
                onClick={() => {
                  onClose();
                  onGrantAccess(member);
                }}
              >
                <ShieldCheck size={14} /> Manage Portal Access
              </button>
            )}
            <button type="button" className="pill-btn-ghost font-xs" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="flex-col gap-md">
        {/* TAB HEADERS */}
        <div className="settings-horizontal-tabs-bar" style={{ marginBottom: 16 }}>
          <button
            className={`settings-pill-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <User size={15} /> Personal Info
          </button>
          <button
            className={`settings-pill-tab ${activeTab === 'household' ? 'active' : ''}`}
            onClick={() => setActiveTab('household')}
          >
            <Home size={15} /> Household ({householdMembers.length})
          </button>
          <button
            className={`settings-pill-tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <FileText size={15} /> Subscriptions ({subscriptions.length})
          </button>
          <button
            className={`settings-pill-tab ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <Receipt size={15} /> Payment History ({payments.length})
          </button>
        </div>

        {/* TAB 1: PERSONAL INFO */}
        {activeTab === 'personal' && (
          <div className="flex-col gap-sm animate-fade-in">
            <div className="form-card" style={{ padding: 20, borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <h4 className="font-xs font-weight-800 text-uppercase color-subtle margin-bottom-md">Personal Information</h4>
              
              <div className="form-row-grid">
                <div>
                  <span className="font-2xs color-subtle">Full Name</span>
                  <p className="font-sm font-weight-700 text-dark margin-0">{member.name}</p>
                </div>
                <div>
                  <span className="font-2xs color-subtle">Relationship to Owner</span>
                  <p className="font-sm font-weight-700 text-dark margin-0">{member.relationship}</p>
                </div>
              </div>

              <div className="form-row-grid margin-top-md">
                <div>
                  <span className="font-2xs color-subtle">Phone Number</span>
                  <p className="font-sm font-weight-700 text-dark margin-0">{member.phone || 'Not Provided'}</p>
                </div>
                <div>
                  <span className="font-2xs color-subtle">Email Address</span>
                  <p className="font-sm font-weight-700 text-dark margin-0">{member.email || 'Not Provided'}</p>
                </div>
              </div>

              <div className="form-row-grid margin-top-md">
                <div>
                  <span className="font-2xs color-subtle">Accountability</span>
                  <p className="font-sm font-weight-700 text-dark margin-0">
                    {member.is_subscription_accountable !== false ? 'Accountable for Subscription' : 'Exempt'}
                  </p>
                </div>
                <div>
                  <span className="font-2xs color-subtle">Portal Access Status</span>
                  <p className="font-sm font-weight-700 text-dark margin-0">
                    {(member.portal_status || 'not_granted').toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOUSEHOLD */}
        {activeTab === 'household' && (
          <div className="flex-col gap-sm animate-fade-in">
            <div className="glass-card padding-md border-radius-lg margin-bottom-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 className="font-sm font-weight-800 text-dark margin-0">House No. {household?.house_number}</h4>
              <p className="font-xs color-subtle margin-top-3xs">
                Owner: <strong>{household?.house_owner_name}</strong> • Address: {household?.address || 'Mahallu Area'}
              </p>
            </div>

            <div className="flex-col gap-xs">
              <h4 className="font-xs font-weight-800 text-uppercase color-subtle margin-bottom-xs">All Family Members</h4>
              {householdMembers.map((m) => (
                <div key={m.id} className="glass-card padding-sm flex-between align-items-center" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <div>
                    <div className="font-sm font-weight-700 text-dark">
                      {m.name} {m.id === member.id && <span className="font-2xs text-emerald" style={{ fontWeight: 800 }}>(Selected)</span>}
                    </div>
                    <div className="font-2xs color-subtle">{m.relationship} • {m.phone || 'No phone'}</div>
                  </div>
                  <span className={`status-badge-pill ${m.portal_status || 'not_granted'}`}>
                    {(m.portal_status || 'not_granted').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="flex-col gap-sm animate-fade-in">
            {subscriptions.length === 0 ? (
              <div className="notif-empty">No subscription ledger entries found for this member.</div>
            ) : (
              <div className="table-responsive">
                <table className="custom-data-table font-xs">
                  <thead>
                    <tr>
                      <th>Annual Fee</th>
                      <th>Arrears</th>
                      <th>Total Due</th>
                      <th>Total Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td className="font-weight-700">₹{s.annual_fee}</td>
                        <td className="color-subtle">₹{s.previous_arrears}</td>
                        <td className="font-weight-800">₹{s.total_due}</td>
                        <td className="text-emerald font-weight-800">₹{s.total_paid}</td>
                        <td className="text-danger font-weight-800">₹{s.balance}</td>
                        <td>
                          <span className={`status-badge-pill ${s.status}`}>
                            {s.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAYMENT HISTORY */}
        {activeTab === 'payments' && (
          <div className="flex-col gap-sm animate-fade-in">
            {payments.length === 0 ? (
              <div className="notif-empty">No offline payment receipts recorded yet for this member.</div>
            ) : (
              <div className="table-responsive">
                <table className="custom-data-table font-xs">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Receipt No.</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.payment_date}</td>
                        <td className="font-weight-800 text-emerald">₹{p.amount}</td>
                        <td className="text-uppercase font-weight-700">{p.payment_method}</td>
                        <td><code>{p.reference_number || 'REC-OFFLINE'}</code></td>
                        <td className="color-subtle">{p.notes || '-'}</td>
                      </tr>
                    ))}
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

export default MemberDetailsModal;
