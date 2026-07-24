import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { Donation, DonationCampaign, SubscriptionYear } from '../../services/db';
import { 
  HeartHandshake, Plus, Search, 
  CheckCircle, AlertCircle, 
  X, Loader2, Printer, Layers 
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

export const Donations: React.FC = () => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'donations' | 'campaigns'>('donations');

  // Data States
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  // Modals
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  // Form Fields - Record Donation
  const [donationType, setDonationType] = useState<'general' | 'campaign'>('general');
  const [campaignId, setCampaignId] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorMemberId, setDonorMemberId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'>('cash');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Form Fields - Campaign
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('Programme Fund');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'active' | 'completed' | 'cancelled'>('active');

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const loadData = async () => {
    setLoading(true);
    try {
      const [donList, campList, yearList] = await Promise.all([
        db.donations.get(),
        db.donationCampaigns.get(),
        db.years.get(),
      ]);
      setDonations(donList);
      setCampaigns(campList);
      setYears(yearList);
    } catch (err) {
      console.error('Failed to load donation data:', err);
      showToast('error', 'Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDonations = useMemo(() => {
    // Resolve the selected year's numeric value from subscription_years
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    return donations.filter((d) => {
      const matchSearch =
        (d.donor_name && d.donor_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.receipt_number && d.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()));

      // Compare year extracted from donation_date against numeric year from subscription_years
      const matchYear = !selectedYearId || !selectedYear ||
        new Date(d.donation_date).getFullYear() === selectedYear;
      const matchCampaign = !selectedCampaignId || d.campaign_id === selectedCampaignId;
      const matchMethod = !selectedMethod || d.payment_method === selectedMethod;

      return matchSearch && matchYear && matchCampaign && matchMethod;
    });
  }, [donations, searchQuery, selectedYearId, selectedCampaignId, selectedMethod, years]);

  // Total metrics
  const totalDonationCollected = useMemo(() => {
    return donations.reduce((sum, d) => sum + d.amount, 0);
  }, [donations]);

  const openAddDonationModal = () => {
    setDonationType('general');
    setCampaignId(campaigns[0]?.id || '');
    setIsAnonymous(false);
    setDonorName('');
    setDonorPhone('');
    setDonorMemberId('');
    setAmount('');
    setPaymentMethod('cash');
    setDonationDate(new Date().toISOString().split('T')[0]);
    setReceiptNumber(`REC-${Date.now().toString().slice(-6)}`);
    setNotes('');
    setIsDonationModalOpen(true);
  };

  const openAddCampaignModal = () => {
    setCampaignName('');
    setCampaignType('Programme Fund');
    setCampaignDesc('');
    setTargetAmount('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setCampaignStatus('active');
    setIsCampaignModalOpen(true);
  };

  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showToast('error', 'Donation amount must be greater than zero');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<Donation, 'id' | 'created_at' | 'updated_at'> = {
        donation_type: donationType,
        campaign_id: donationType === 'campaign' ? campaignId : null,
        donor_name: isAnonymous ? 'Anonymous Donor' : (donorName.trim() || 'Wellwisher'),
        donor_phone: isAnonymous ? null : (donorPhone.trim() || null),
        donor_member_id: !isAnonymous && donorMemberId ? donorMemberId : null,
        is_anonymous: isAnonymous,
        amount: Number(amount),
        payment_method: paymentMethod,
        donation_date: donationDate,
        receipt_number: receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
        notes: notes.trim() || null,
        recorded_by: null,
      };

      const newDon = await db.donations.create(payload);
      showToast('success', 'Donation recorded successfully');
      setIsDonationModalOpen(false);
      setSelectedDonation(newDon);
      setIsReceiptModalOpen(true);
      loadData();
    } catch (err) {
      console.error('Error saving donation:', err);
      showToast('error', 'Failed to record donation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      showToast('error', 'Campaign name is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<DonationCampaign, 'id' | 'created_at' | 'updated_at'> = {
        campaign_name: campaignName.trim(),
        campaign_type: campaignType,
        description: campaignDesc.trim() || null,
        target_amount: targetAmount ? Number(targetAmount) : 0,
        start_date: startDate || null,
        end_date: endDate || null,
        cover_image: null,
        status: campaignStatus,
        created_by: null,
      };

      await db.donationCampaigns.create(payload);
      showToast('success', 'Donation campaign created');
      setIsCampaignModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving campaign:', err);
      showToast('error', 'Failed to create campaign');
    } finally {
      setIsSaving(false);
    }
  };

  const getCampaignProgress = (camp: DonationCampaign) => {
    const campDons = donations.filter((d) => d.campaign_id === camp.id);
    const collected = campDons.reduce((sum, d) => sum + d.amount, 0);
    const percentage = camp.target_amount > 0 ? Math.min(100, Math.round((collected / camp.target_amount) * 100)) : 0;
    return { collected, percentage };
  };

  return (
    <div className="donations-page animate-fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`}>
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="canvas-header-bar margin-bottom">
        <div className="canvas-title-group">
          <div className="canvas-title-icon-box">
            <HeartHandshake size={20} color="#ffffff" />
          </div>
          <div>
            <h2 className="canvas-page-title">Donations & Campaigns</h2>
            <p className="summary-card-sub">Manage general donations and special programme fundraising campaigns.</p>
          </div>
        </div>

        <div className="header-action-btns flex-row-gap">
          <button className="pill-btn-primary" onClick={openAddDonationModal}>
            <Plus size={16} />
            <span>+ Record Donation</span>
          </button>
          <button className="pill-btn-secondary" onClick={openAddCampaignModal}>
            <Layers size={16} />
            <span>+ Create Campaign</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dues-metrics-row margin-bottom">
        <div className="metric-box glass-card">
          <span className="metric-label">Total Donations Collected</span>
          <h3 className="metric-value text-success">{formatCurrency(totalDonationCollected)}</h3>
          <span className="metric-sub">General & campaign contributions</span>
        </div>
        <div className="metric-box glass-card">
          <span className="metric-label">Active Campaigns</span>
          <h3 className="metric-value">{campaigns.filter((c) => c.status === 'active').length}</h3>
          <span className="metric-sub">Special programme funds</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="reports-nav-tabs margin-bottom">
        <button
          className={`tab-pill-btn ${activeTab === 'donations' ? 'active' : ''}`}
          onClick={() => setActiveTab('donations')}
        >
          <HeartHandshake size={15} />
          <span>All Donations</span>
        </button>
        <button
          className={`tab-pill-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          <Layers size={15} />
          <span>Special Campaigns ({campaigns.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL DONATIONS */}
      {activeTab === 'donations' && (
        <>
          {/* Toolbar */}
          <div className="glass-card filter-bar margin-bottom">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by donor name or receipt number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-selectors-grid">
              <YearFilter
                selectedYearId={selectedYearId}
                onChange={setSelectedYearId}
                years={years}
                showAllOption={true}
              />

              <select value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)}>
                <option value="">All Campaigns / General</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.campaign_name}</option>
                ))}
              </select>

              <select value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                <option value="">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI / Online</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card main-table-card">
            {loading ? (
              <div className="loading-spinner-box"><Loader2 size={24} className="spinner" /></div>
            ) : filteredDonations.length === 0 ? (
              <div className="notif-empty">No donation records found.</div>
            ) : (
              <>
                <div className="table-responsive desktop-view-only">
                  <table className="lessa-table">
                    <thead>
                      <tr>
                        <th>Receipt No</th>
                        <th>Donor Name</th>
                        <th>Type / Campaign</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonations.map((d) => (
                        <tr key={d.id}>
                          <td className="sub-id-tag">{d.receipt_number || 'N/A'}</td>
                          <td className="bold-name">{d.is_anonymous ? '🔒 Anonymous Donor' : (d.donor_name || 'Wellwisher')}</td>
                          <td>
                            {d.donation_type === 'campaign' ? (
                              <span className="type-pill">{campaigns.find((c) => c.id === d.campaign_id)?.campaign_name || 'Campaign'}</span>
                            ) : (
                              <span className="badge-pill info">General</span>
                            )}
                          </td>
                          <td className="amount-highlight text-success">{formatCurrency(d.amount)}</td>
                          <td><span className="badge-pill success">{d.payment_method.toUpperCase()}</span></td>
                          <td>{d.donation_date}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="pill-btn-secondary font-xs"
                              onClick={() => { setSelectedDonation(d); setIsReceiptModalOpen(true); }}
                            >
                              <Printer size={13} />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="mobile-cards-directory">
                  {filteredDonations.map((d) => (
                    <div key={d.id} className="mobile-notif-card">
                      <div className="card-head">
                        <h4 className="notif-title">{d.is_anonymous ? '🔒 Anonymous Donor' : d.donor_name}</h4>
                        <span className="bold-text text-success">{formatCurrency(d.amount)}</span>
                      </div>
                      <div className="card-body font-xs">
                        <p><strong>Receipt:</strong> {d.receipt_number}</p>
                        <p><strong>Method:</strong> {d.payment_method.toUpperCase()} • {d.donation_date}</p>
                      </div>
                      <div className="card-footer">
                        <button className="pill-btn-secondary font-xs" onClick={() => { setSelectedDonation(d); setIsReceiptModalOpen(true); }}>
                          <Printer size={13} /> Print Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="report-stats-grid">
          {campaigns.map((c) => {
            const { collected, percentage } = getCampaignProgress(c);
            return (
              <div key={c.id} className="glass-card report-stat-card">
                <div className="card-head">
                  <span className="type-pill">{c.campaign_type}</span>
                  <span className={`badge-pill ${c.status === 'active' ? 'success' : 'warning'}`}>{c.status}</span>
                </div>
                <h3 className="summary-card-title margin-top">{c.campaign_name}</h3>
                <p className="summary-card-sub">{c.description || 'Special fundraising programme campaign'}</p>

                <div className="progress-bar-container margin-top">
                  <div className="progress-labels">
                    <span>{formatCurrency(collected)} / {formatCurrency(c.target_amount)}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RECORD DONATION MODAL */}
      {isDonationModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card animate-fade-in">
            <div className="modal-header">
              <h3>+ Record New Donation</h3>
              <button className="modal-close-btn" onClick={() => setIsDonationModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveDonation} className="modal-body-scroll">
              <div className="form-group">
                <label>Donation Category</label>
                <div className="flex-row-gap margin-top font-sm">
                  <label><input type="radio" name="donType" checked={donationType === 'general'} onChange={() => setDonationType('general')} /> General Donation</label>
                  <label><input type="radio" name="donType" checked={donationType === 'campaign'} onChange={() => setDonationType('campaign')} /> Special Campaign</label>
                </div>
              </div>

              {donationType === 'campaign' && (
                <div className="form-group">
                  <label>Select Campaign *</label>
                  <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.campaign_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="toggle-switch-row margin-bottom font-sm">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                  <span>☐ Anonymous Donation (Hide Donor Details)</span>
                </label>
              </div>

              {!isAnonymous && (
                <div className="form-row-grid">
                  <div className="form-group">
                    <label>Donor Name</label>
                    <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Donor Phone</label>
                    <input type="text" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Donation Amount (₹) *</label>
                  <input type="number" required min="1" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className="form-group">
                  <label>Payment Method *</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Donation Date</label>
                  <input type="date" value={donationDate} onChange={(e) => setDonationDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Receipt Number</label>
                  <input type="text" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="pill-btn-secondary" onClick={() => setIsDonationModalOpen(false)}>Cancel</button>
                <button type="submit" className="pill-btn-primary" disabled={isSaving}>Save & Print Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {isCampaignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card animate-fade-in">
            <div className="modal-header">
              <h3>+ Create Donation Campaign</h3>
              <button className="modal-close-btn" onClick={() => setIsCampaignModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCampaign} className="modal-body-scroll">
              <div className="form-group">
                <label>Campaign Name *</label>
                <input type="text" required placeholder="e.g. Rabeeh Programme Fund 2026" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Target Amount (₹)</label>
                  <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={campaignStatus} onChange={(e) => setCampaignStatus(e.target.value as any)}>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={campaignDesc} onChange={(e) => setCampaignDesc(e.target.value)} />
              </div>

              <div className="modal-footer">
                <button type="button" className="pill-btn-secondary" onClick={() => setIsCampaignModalOpen(false)}>Cancel</button>
                <button type="submit" className="pill-btn-primary" disabled={isSaving}>Save Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT PRINT MODAL */}
      {isReceiptModalOpen && selectedDonation && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card text-center" style={{ maxWidth: '420px' }}>
            <div className="receipt-print-wrapper padding">
              <h3>വെള്ളിക്കീൽ ഹിദായത്തുൽ ഇസ്ലാം മഹല്ല്</h3>
              <p className="font-xs text-muted">Donation Official Receipt</p>
              <hr className="margin-y" />
              <p><strong>Receipt No:</strong> {selectedDonation.receipt_number}</p>
              <p><strong>Donor:</strong> {selectedDonation.donor_name}</p>
              <h2 className="text-success margin-y">{formatCurrency(selectedDonation.amount)}</h2>
              <p className="font-xs">Date: {selectedDonation.donation_date} • Method: {selectedDonation.payment_method.toUpperCase()}</p>
            </div>
            <div className="modal-footer">
              <button className="pill-btn-secondary" onClick={() => setIsReceiptModalOpen(false)}>Close</button>
              <button className="pill-btn-primary" onClick={() => window.print()}><Printer size={15} /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donations;
