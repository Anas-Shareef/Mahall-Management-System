import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { db } from '../services/db';
import type { Notification } from '../services/db';
import {
  LayoutDashboard,
  Home,
  Users,
  FileText,
  Receipt,
  Bell,
  BarChart3,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Languages,
  Check,
  ChevronDown,
  Globe,
  HeartHandshake,
  UserX,
  Heart,
  Image as ImageIcon,
  Search,
  Command
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Global Command Spotlight Search State
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [spotlightResults, setSpotlightResults] = useState<{
    members: any[];
    households: any[];
    donations: any[];
    deaths: any[];
    marriages: any[];
  }>({ members: [], households: [], donations: [], deaths: [], marriages: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Global Shortcut Ctrl+K / Cmd+K Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Query global database on search input
  useEffect(() => {
    if (!spotlightQuery.trim() || spotlightQuery.trim().length < 2) {
      setSpotlightResults({ members: [], households: [], donations: [], deaths: [], marriages: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = spotlightQuery.toLowerCase().trim();
        const [allMembers, allHouseholds, allDonations, allDeaths, allMarriages] = await Promise.all([
          db.members.get(),
          db.households.get(),
          db.donations.get(),
          db.deaths.get(),
          db.marriages.get()
        ]);

        const members = allMembers.filter((m) => m.name.toLowerCase().includes(q) || (m.phone && m.phone.includes(q))).slice(0, 4);
        const households = allHouseholds.filter((h) => h.house_number.toLowerCase().includes(q) || h.house_owner_name.toLowerCase().includes(q)).slice(0, 4);
        const donations = allDonations.filter((d) => (d.donor_name && d.donor_name.toLowerCase().includes(q)) || (d.receipt_number && d.receipt_number.toLowerCase().includes(q))).slice(0, 4);
        const deaths = allDeaths.filter((d) => d.deceased_name.toLowerCase().includes(q)).slice(0, 4);
        const marriages = allMarriages.filter((m) => m.groom_name.toLowerCase().includes(q) || m.bride_name.toLowerCase().includes(q)).slice(0, 4);

        setSpotlightResults({ members, households, donations, deaths, marriages });
      } catch (err) {
        console.error('Error conducting spotlight search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [spotlightQuery]);
  
  // Notification states
  const [notifications, setNotifications] = useState<(Notification & { read_at: string | null; recipient_id: string })[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Sync lang changes to body tag
  useEffect(() => {
    if (user?.language) {
      setLanguage(user.language);
      document.body.setAttribute('lang', user.language);
    }
  }, [user]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await db.notifications.getUserNotifications(user.id);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read_at).length);
    } catch (err) {
      console.warn('Notice fetching user notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 35000);
    return () => clearInterval(timer);
  }, [user]);

  const handleMarkAsRead = async (recipientId: string) => {
    try {
      await db.notifications.markAsRead(recipientId);
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read_at);
      await Promise.all(unread.map(n => db.notifications.markAsRead(n.recipient_id)));
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleLanguageSwitch = (lang: 'en' | 'ml') => {
    setLanguage(lang);
    document.body.setAttribute('lang', lang);
    if (user) {
      db.profiles.update(user.id, { language: lang });
    }
    setIsLangMenuOpen(false);
    setIsProfileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotificationOpen(false);
    setIsProfileOpen(false);
    setIsLangMenuOpen(false);
  }, [location.pathname]);

  const adminMenuGroups = [
    {
      label: null,
      items: [{ to: '/admin/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard }],
    },
    {
      label: t('nav.people'),
      items: [
        { to: '/admin/households', label: t('nav.households'), icon: Home },
        { to: '/admin/members', label: t('nav.members'), icon: Users },
      ],
    },
    {
      label: t('nav.finance'),
      items: [
        { to: '/admin/subscriptions', label: t('nav.subscriptions'), icon: FileText },
        { to: '/admin/payments', label: t('nav.payments'), icon: Receipt },
        { to: '/admin/donations', label: t('nav.donations'), icon: HeartHandshake },
      ],
    },
    {
      label: t('nav.community'),
      items: [
        { to: '/admin/deaths', label: t('nav.deaths'), icon: UserX },
        { to: '/admin/marriages', label: t('nav.marriages'), icon: Heart },
      ],
    },
    {
      label: t('nav.communication'),
      items: [{ to: '/admin/notifications', label: t('nav.notifications'), icon: Bell }],
    },
    {
      label: t('nav.media'),
      items: [{ to: '/admin/gallery', label: t('nav.gallery'), icon: ImageIcon }],
    },
    {
      label: null,
      items: [
        { to: '/admin/reports', label: t('nav.reports'), icon: BarChart3 },
        { to: '/admin/settings', label: t('nav.settings'), icon: Settings },
      ],
    },
  ];

  const memberLinks = [
    { to: '/member/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/member/my-subscription', label: t('nav.mySubscription'), icon: FileText },
    { to: '/member/payment-history', label: t('nav.paymentHistory'), icon: Receipt },
    { to: '/member/profile', label: t('nav.myProfile'), icon: User },
    { to: '/member/settings', label: t('nav.settings'), icon: Settings },
  ];

  // Get user initials
  const userInitials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'VH';



  return (
    <div className="layout-shell">
      {/* SIDEBAR */}
      <aside className={`sidebar-aside ${isMobileMenuOpen ? 'mobile-visible' : ''}`}>
        {/* Brand Logo Header */}
        <div className="sidebar-brand-header">
          <div className="brand-icon-box">
            <span className="brand-letter">G</span>
          </div>
          <div className="brand-text-group">
            <h1 className="brand-name">lessa</h1>
            <p className="brand-sub">മഹല്ല് പോർട്ടൽ</p>
          </div>
          <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close sidebar menu">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav-container">
          {user?.role === 'admin' ? (
            adminMenuGroups.map((group, gIdx) => (
              <div key={gIdx} className="nav-group-section">
                {group.label && <span className="nav-section-label">{group.label}</span>}
                {group.items.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) => `sidebar-pill-link ${isActive ? 'active' : ''}`}
                    >
                      <div className="link-left">
                        <Icon size={18} className="link-icon" />
                        <span className="link-text">{link.label}</span>
                      </div>
                      <ChevronDown size={14} className="link-chevron" />
                    </NavLink>
                  );
                })}
              </div>
            ))
          ) : (
            memberLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `sidebar-pill-link ${isActive ? 'active' : ''}`}
                >
                  <div className="link-left">
                    <Icon size={18} className="link-icon" />
                    <span className="link-text">{link.label}</span>
                  </div>
                  <ChevronDown size={14} className="link-chevron" />
                </NavLink>
              );
            })
          )}

          {/* Notice Cards */}
          <div className="sidebar-promo-section">
            <span className="nav-section-label">Notice Board</span>
            <div className="sidebar-promo-card">
              <div className="promo-badge">ACTIVE YEAR</div>
              <p className="promo-title">Annual Subscription</p>
              <h3 className="promo-highlight">2026 Year</h3>
              <p className="promo-desc">Mahallu offline receipts online.</p>
            </div>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-pill" onClick={handleLogout}>
            <LogOut size={16} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* MAIN CONTAINER */}
      <div className="main-viewport">
        {/* HEADER NAVBAR */}
        <header className="header-bar">
          <div className="header-left-greeting">
            <button className="mobile-toggle-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open navigation menu">
              <Menu size={20} />
            </button>
            <div className="greeting-text-box">
              <h2 className="user-greeting">
                Good morning {user?.name || 'Member'} <span className="hand-wave">👋</span>
              </h2>
              <p className="greeting-sub">Time to rise up for today's Mahallu management</p>
            </div>
          </div>

          <div className="header-right-tools">
            {/* Global Spotlight Search Trigger */}
            <button 
              className="spotlight-header-trigger"
              onClick={() => setIsSpotlightOpen(true)}
              title="Search database (Ctrl+K)"
            >
              <Search size={15} />
              <span className="spotlight-placeholder">Search database...</span>
              <kbd className="shortcut-kbd">Ctrl+K</kbd>
            </button>

            {/* Language Switcher Popover */}
            <div className="lang-switcher-wrap">
              <button
                className="icon-circle-btn"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                title={t('settings.changeLanguage')}
                aria-label="Select application language"
              >
                <Globe size={18} />
              </button>
              {isLangMenuOpen && (
                <div className="lang-popover-menu animate-fade-in">
                  <div className="pop-header-title">Language / ഭാഷ</div>
                  <button
                    className={`lang-popover-item ${language === 'en' ? 'active' : ''}`}
                    onClick={() => handleLanguageSwitch('en')}
                  >
                    <span>English</span>
                    {language === 'en' && <Check size={14} color="#00966b" />}
                  </button>
                  <button
                    className={`lang-popover-item ${language === 'ml' ? 'active' : ''}`}
                    onClick={() => handleLanguageSwitch('ml')}
                  >
                    <span style={{ fontFamily: 'var(--font-ml)' }}>മലയാളം</span>
                    {language === 'ml' && <Check size={14} color="#00966b" />}
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="notif-bell-wrap">
              <button
                className="icon-circle-btn"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-dot-badge"></span>}
              </button>

              {isNotificationOpen && (
                <div className="notif-dropdown-card animate-fade-in">
                  <div className="notif-card-header">
                    <h4>{t('notifications.notificationCenter')}</h4>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead} className="mark-read-btn">
                        {t('notifications.markAsRead')}
                      </button>
                    )}
                  </div>
                  <div className="notif-card-body">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">{t('common.noData')}</div>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          className={`notif-list-item ${!notif.read_at ? 'unread' : ''}`}
                          onClick={() => !notif.read_at && handleMarkAsRead(notif.recipient_id)}
                        >
                          <div className="notif-item-body">
                            <h5 className="notif-item-title">
                              {language === 'en' ? notif.title_en : notif.title_ml}
                            </h5>
                            <p className="notif-item-msg">
                              {language === 'en' ? notif.message_en : notif.message_ml}
                            </p>
                            <span className="notif-item-time">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {!notif.read_at && <span className="unread-dot"></span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role Status Pill */}
            <div className="header-balance-pill desktop-only-pill">
              <span className="balance-label">Role status</span>
              <span className="balance-amount">
                {user?.role === 'admin' ? 'Admin Portal' : 'Member Portal'}
              </span>
            </div>

            {/* Profile Avatar Pill & Dropdown */}
            <div className="profile-pill-wrap">
              <button
                className="profile-pill-trigger"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="User menu"
              >
                <div className="user-avatar-img">{userInitials}</div>
                <ChevronDown size={14} className="profile-chevron" />
              </button>

              {isProfileOpen && (
                <div className="profile-popover-card animate-fade-in">
                  <div className="profile-pop-header">
                    <h4>{user?.name}</h4>
                    <p>{user?.role === 'admin' ? t('auth.adminLogin') : t('auth.memberLogin')}</p>
                  </div>
                  <div className="pop-divider"></div>
                  
                  {/* Language Quick Toggle inside User Profile */}
                  <div className="profile-lang-selector-row">
                    <span className="lang-row-label"><Languages size={14} /> Language</span>
                    <div className="lang-pill-btn-group">
                      <button 
                        className={`lang-mini-btn ${language === 'en' ? 'active' : ''}`}
                        onClick={() => handleLanguageSwitch('en')}
                      >
                        EN
                      </button>
                      <button 
                        className={`lang-mini-btn ${language === 'ml' ? 'active' : ''}`}
                        onClick={() => handleLanguageSwitch('ml')}
                      >
                        മല
                      </button>
                    </div>
                  </div>

                  <div className="pop-divider"></div>

                  <Link
                    to={user?.role === 'admin' ? '/admin/settings' : '/member/profile'}
                    className="pop-item"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User size={15} />
                    <span>{t('nav.myProfile')}</span>
                  </Link>
                  <Link
                    to={user?.role === 'admin' ? '/admin/settings' : '/member/settings'}
                    className="pop-item"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings size={15} />
                    <span>{t('nav.settings')}</span>
                  </Link>
                  <div className="pop-divider"></div>
                  <button className="pop-item logout-red" onClick={handleLogout}>
                    <LogOut size={15} />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN WORKSPACE CANVAS */}
        <main className="canvas-content-body animate-fade-in">
          {children}
        </main>
      </div>

      {/* GLOBAL SPOTLIGHT SEARCH MODAL */}
      <Modal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        title="Global Spotlight Search"
        subtitle="Instant jump to members, households, donations, or records"
        icon={<Command size={20} className="text-primary" />}
        size="lg"
      >
        <div className="search-box margin-bottom-md">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="font-size-md"
            placeholder="Type name, phone, house #, or receipt #..."
            value={spotlightQuery}
            onChange={(e) => setSpotlightQuery(e.target.value)}
            autoFocus
          />
        </div>

        {isSearching ? (
          <div className="flex-center py-lg">
            <div className="spinner text-primary margin-right-xs" />
            <span className="font-sm color-subtle">Searching database...</span>
          </div>
        ) : !spotlightQuery.trim() ? (
          <div className="py-md text-center color-subtle font-xs">
            Start typing to search across Members, Households, Financial Contributions, Deaths, and Marriages.
          </div>
        ) : (
          <div className="flex-col gap-md max-height-400 overflow-y-auto">
            {/* MEMBERS RESULTS */}
            {spotlightResults.members.length > 0 && (
              <div>
                <div className="font-xs font-weight-700 color-subtle text-uppercase margin-bottom-xs">Members ({spotlightResults.members.length})</div>
                {spotlightResults.members.map((m) => (
                  <div 
                    key={m.id} 
                    className="member-select-card margin-bottom-xs"
                    onClick={() => { navigate(`/admin/members/${m.id}/edit`); setIsSpotlightOpen(false); }}
                  >
                    <div className="flex-row-gap-sm">
                      <div className="donor-avatar-circle sm avatar-member">{m.name.charAt(0)}</div>
                      <div>
                        <div className="font-weight-700 font-sm text-dark">{m.name}</div>
                        <span className="font-xs color-subtle">Relation: {m.relationship} • Phone: {m.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <span className="pill-btn-ghost font-xs">View Profile →</span>
                  </div>
                ))}
              </div>
            )}

            {/* HOUSEHOLDS RESULTS */}
            {spotlightResults.households.length > 0 && (
              <div>
                <div className="font-xs font-weight-700 color-subtle text-uppercase margin-bottom-xs">Households ({spotlightResults.households.length})</div>
                {spotlightResults.households.map((h) => (
                  <div 
                    key={h.id} 
                    className="member-select-card margin-bottom-xs"
                    onClick={() => { navigate(`/admin/households/${h.id}/edit`); setIsSpotlightOpen(false); }}
                  >
                    <div className="flex-row-gap-sm">
                      <div className="donor-avatar-circle sm emerald"><Home size={16} /></div>
                      <div>
                        <div className="font-weight-700 font-sm text-dark">House #{h.house_number}</div>
                        <span className="font-xs color-subtle">Head: {h.house_owner_name} • Ward: {h.area || 'N/A'}</span>
                      </div>
                    </div>
                    <span className="pill-btn-ghost font-xs">Manage Household →</span>
                  </div>
                ))}
              </div>
            )}

            {/* DONATIONS RESULTS */}
            {spotlightResults.donations.length > 0 && (
              <div>
                <div className="font-xs font-weight-700 color-subtle text-uppercase margin-bottom-xs">Donations ({spotlightResults.donations.length})</div>
                {spotlightResults.donations.map((d) => (
                  <div 
                    key={d.id} 
                    className="member-select-card margin-bottom-xs"
                    onClick={() => { navigate(`/admin/donations/${d.id}/edit`); setIsSpotlightOpen(false); }}
                  >
                    <div className="flex-row-gap-sm">
                      <div className="donor-avatar-circle sm yellow"><HeartHandshake size={16} /></div>
                      <div>
                        <div className="font-weight-700 font-sm text-dark">{d.donor_name} (₹{d.amount})</div>
                        <span className="font-xs color-subtle">Receipt: {d.receipt_number || 'N/A'} • Date: {d.donation_date}</span>
                      </div>
                    </div>
                    <span className="pill-btn-ghost font-xs">View Donation →</span>
                  </div>
                ))}
              </div>
            )}

            {/* DEATHS & MARRIAGES */}
            {spotlightResults.deaths.length > 0 && (
              <div>
                <div className="font-xs font-weight-700 color-subtle text-uppercase margin-bottom-xs">Death Records ({spotlightResults.deaths.length})</div>
                {spotlightResults.deaths.map((d) => (
                  <div 
                    key={d.id} 
                    className="member-select-card margin-bottom-xs"
                    onClick={() => { navigate(`/admin/deaths/${d.id}/edit`); setIsSpotlightOpen(false); }}
                  >
                    <div className="flex-row-gap-sm">
                      <div className="donor-avatar-circle sm purple"><UserX size={16} /></div>
                      <div>
                        <div className="font-weight-700 font-sm text-dark">{d.deceased_name}</div>
                        <span className="font-xs color-subtle">Date: {d.date_of_death}</span>
                      </div>
                    </div>
                    <span className="pill-btn-ghost font-xs">View Record →</span>
                  </div>
                ))}
              </div>
            )}

            {spotlightResults.members.length === 0 && 
             spotlightResults.households.length === 0 && 
             spotlightResults.donations.length === 0 && 
             spotlightResults.deaths.length === 0 && (
              <div className="py-md text-center color-subtle font-xs">
                No matching records found for "{spotlightQuery}".
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        /* ════════════════════════════════════════════════
           LESSA SAAS DASHBOARD LAYOUT STYLES
        ════════════════════════════════════════════════ */
        .layout-shell {
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
          display: flex;
          background: var(--bg-app);
          color: var(--text-main);
          position: relative;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        /* ── SIDEBAR ── */
        .sidebar-aside {
          width: 250px;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; bottom: 0; left: 0;
          z-index: 100;
          padding: 24px 16px;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 20px;
          position: relative;
        }

        .brand-icon-box {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ff7a00 0%, #ff9500 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(255, 122, 0, 0.35);
          flex-shrink: 0;
        }

        .brand-letter {
          color: #ffffff;
          font-weight: 800;
          font-size: 20px;
          line-height: 1;
        }

        .brand-text-group { display: flex; flex-direction: column; }
        .brand-name { font-size: 22px; font-weight: 800; color: #111827; line-height: 1.1; letter-spacing: -0.02em; }
        .brand-sub { font-family: var(--font-ml); font-size: 11px; color: var(--text-muted); font-weight: 600; }

        .sidebar-close-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          position: absolute;
          right: 0; top: 8px;
        }

        /* Nav Links Container */
        .sidebar-nav-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          padding-top: 8px;
        }

        .nav-section-label {
          font-size: 11px;
          font-weight: 700;
          color: #9ca3af;
          margin: 14px 12px 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sidebar-pill-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 16px;
          border-radius: var(--radius-pill);
          color: #4b5563;
          font-weight: 600;
          font-size: 13.5px;
          transition: var(--transition-all);
          text-decoration: none;
        }

        .sidebar-pill-link .link-left { display: flex; align-items: center; gap: 12px; }
        .sidebar-pill-link .link-icon { color: #6b7280; transition: var(--transition-all); }
        .sidebar-pill-link .link-chevron { color: #9ca3af; transition: var(--transition-all); }

        .sidebar-pill-link:hover { background: #f3f4f6; color: #111827; }

        .sidebar-pill-link.active {
          background: var(--primary);
          color: #ffffff;
          box-shadow: 0 8px 18px -2px rgba(0, 150, 107, 0.4);
        }
        .sidebar-pill-link.active .link-icon { color: #ffffff; }
        .sidebar-pill-link.active .link-chevron { color: rgba(255, 255, 255, 0.7); }

        /* Promo Section */
        .sidebar-promo-section { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }

        .sidebar-promo-card {
          background: linear-gradient(135deg, #00966b 0%, #05805b 100%);
          border-radius: var(--radius-lg);
          padding: 14px;
          color: #ffffff;
          box-shadow: 0 8px 20px -4px rgba(0, 150, 107, 0.3);
        }

        .promo-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 6px;
          margin-bottom: 6px;
        }

        .promo-title { font-size: 11px; font-weight: 500; opacity: 0.85; text-transform: uppercase; }
        .promo-highlight { font-size: 17px; font-weight: 800; line-height: 1.2; margin: 2px 0; }
        .promo-desc { font-size: 11px; opacity: 0.8; }

        .sidebar-footer { padding-top: 16px; border-top: 1px solid var(--border-color); }

        .sidebar-logout-pill {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: #f9fafb;
          border: 1px solid var(--border-color);
          color: #4b5563;
          border-radius: var(--radius-pill);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .sidebar-logout-pill:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 99;
        }

        /* ── MAIN VIEWPORT ── */
        .main-viewport {
          flex: 1;
          margin-left: 250px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          width: calc(100% - 250px);
          max-width: 100%;
          padding: 16px 20px 24px;
          box-sizing: border-box;
        }

        /* ── TOP HEADER ── */
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 12px;
          box-sizing: border-box;
        }

        .header-left-greeting {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .mobile-toggle-btn {
          display: none;
          background: #ffffff;
          border: 1px solid var(--border-color);
          padding: 8px;
          border-radius: 10px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .greeting-text-box {
          min-width: 0;
        }

        .user-greeting {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hand-wave { display: inline-block; font-size: 18px; }

        .greeting-sub {
          font-size: 12.5px;
          color: #6b7280;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-right-tools {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .icon-circle-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid var(--border-color);
          color: #4b5563;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          box-shadow: var(--shadow-sm);
          transition: var(--transition-all);
        }

        .icon-circle-btn:hover { background: #f3f4f6; color: var(--primary); }

        .notif-dot-badge {
          position: absolute;
          top: 8px; right: 8px;
          width: 8px; height: 8px;
          background: var(--primary);
          border-radius: 50%;
          border: 2px solid #ffffff;
        }

        .header-balance-pill {
          display: flex;
          flex-direction: column;
          padding: 5px 14px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          box-shadow: var(--shadow-sm);
          border-left: 3px solid var(--primary);
        }

        .balance-label { font-size: 9.5px; color: #6b7280; font-weight: 700; text-transform: uppercase; }
        .balance-amount { font-size: 12.5px; font-weight: 800; color: var(--primary); }

        /* Profile Trigger */
        .profile-pill-wrap, .lang-switcher-wrap, .notif-bell-wrap { position: relative; }

        .profile-pill-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          padding: 4px 8px 4px 4px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
        }

        .user-avatar-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ecfdf5;
          color: #00966b;
          font-weight: 800;
          font-size: 12.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #a7f3d0;
        }

        .profile-chevron { color: #6b7280; }

        /* Popover menus */
        .profile-popover-card,
        .lang-popover-menu,
        .notif-dropdown-card {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
          z-index: 150;
          overflow: hidden;
        }

        .profile-popover-card { width: 230px; padding: 8px 0; }
        .lang-popover-menu { width: 160px; padding: 6px 0; }
        .notif-dropdown-card { width: 320px; }

        .pop-header-title {
          font-size: 11px;
          font-weight: 800;
          color: #9ca3af;
          text-transform: uppercase;
          padding: 8px 14px 4px;
        }

        .profile-pop-header { padding: 10px 16px; }
        .profile-pop-header h4 { font-size: 14px; font-weight: 800; color: #111827; }
        .profile-pop-header p { font-size: 11px; color: #6b7280; margin-top: 2px; }

        .profile-lang-selector-row {
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .lang-row-label {
          font-size: 12px;
          font-weight: 600;
          color: #4b5563;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .lang-pill-btn-group {
          display: flex;
          background: #f3f4f6;
          padding: 2px;
          border-radius: 12px;
        }

        .lang-mini-btn {
          border: none;
          background: transparent;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 10px;
          color: #4b5563;
          cursor: pointer;
        }

        .lang-mini-btn.active {
          background: #ffffff;
          color: #00966b;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        .pop-divider { height: 1px; background: #e5e7eb; margin: 6px 0; }

        .pop-item, .lang-popover-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 16px;
          background: transparent;
          border: none;
          color: #374151;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .pop-item:hover, .lang-popover-item:hover { background: #f3f4f6; color: var(--primary); }
        .pop-item.logout-red:hover { background: #fee2e2; color: #dc2626; }

        .notif-card-header {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .notif-card-header h4 { font-size: 13.5px; font-weight: 700; color: #111827; }
        .mark-read-btn { background: none; border: none; color: var(--primary); font-size: 11px; font-weight: 600; cursor: pointer; }

        .notif-card-body { max-height: 280px; overflow-y: auto; }
        .notif-empty { padding: 24px; text-align: center; font-size: 13px; color: #9ca3af; }

        .notif-list-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          cursor: pointer;
        }
        .notif-list-item.unread { background: #ecfdf5; }
        .notif-item-title { font-size: 13px; font-weight: 700; color: #111827; }
        .notif-item-msg { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .notif-item-time { font-size: 10px; color: #9ca3af; margin-top: 4px; display: block; }
        .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); flex-shrink: 0; }

        /* ── WORKSPACE CANVAS WRAPPER ── */
        .canvas-wrapper {
          flex: 1;
          background: transparent;
          border-radius: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: none;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
        }

        .canvas-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .canvas-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .canvas-title-icon-box {
          width: 36px;
          height: 36px;
          background: #0f2d1f;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 45, 31, 0.25);
        }

        .canvas-page-title {
          font-size: 19px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .canvas-content-body {
          flex: 1;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* ── RESPONSIVE OPTIMIZATION FOR MOBILE & SAMSUNG GALAXY S8 ── */
        @media (max-width: 991px) {
          .sidebar-aside { transform: translateX(-100%); }
          .sidebar-aside.mobile-visible { transform: translateX(0); }
          .sidebar-close-btn { display: block; }
          .sidebar-overlay { display: block; }
          .main-viewport { margin-left: 0; width: 100%; padding: 12px 12px 20px; }
          .mobile-toggle-btn { display: flex; }
          .desktop-only-pill { display: none; }
          .canvas-wrapper { padding: 14px; border-radius: 16px; }
          .user-greeting { font-size: 16px; }
          .greeting-sub { font-size: 11px; }
        }

        @media (max-width: 576px) {
          .main-viewport { padding: 10px 10px 16px; }
          .header-bar { margin-bottom: 12px; }
          .greeting-sub { display: none; }
          .user-greeting { font-size: 15px; }
          .canvas-wrapper { padding: 12px; border-radius: 14px; }
          .canvas-page-title { font-size: 17px; }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
