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
  Download,
  Calendar
} from 'lucide-react';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
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
      console.error('Error fetching user notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 30000);
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
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotificationOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  const adminLinks = [
    { to: '/admin/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/admin/households', label: t('nav.households'), icon: Home },
    { to: '/admin/members', label: t('nav.members'), icon: Users },
    { to: '/admin/subscriptions', label: t('nav.subscriptions'), icon: FileText },
    { to: '/admin/payments', label: t('nav.payments'), icon: Receipt },
    { to: '/admin/notifications', label: t('nav.notifications'), icon: Bell },
    { to: '/admin/reports', label: t('nav.reports'), icon: BarChart3 },
    { to: '/admin/settings', label: t('nav.settings'), icon: Settings },
  ];

  const memberLinks = [
    { to: '/member/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/member/my-subscription', label: t('nav.mySubscription'), icon: FileText },
    { to: '/member/payment-history', label: t('nav.paymentHistory'), icon: Receipt },
    { to: '/member/profile', label: t('nav.myProfile'), icon: User },
    { to: '/member/settings', label: t('nav.settings'), icon: Settings },
  ];

  const menuLinks = user?.role === 'admin' ? adminLinks : memberLinks;

  // Get user initials
  const userInitials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'VH';

  // Current page title mapping
  const getPageTitle = () => {
    if (location.pathname.includes('dashboard')) return t('nav.dashboard');
    if (location.pathname.includes('households')) return t('nav.households');
    if (location.pathname.includes('members')) return t('nav.members');
    if (location.pathname.includes('subscriptions')) return t('nav.subscriptions');
    if (location.pathname.includes('payments')) return t('nav.payments');
    if (location.pathname.includes('notifications')) return t('nav.notifications');
    if (location.pathname.includes('reports')) return t('nav.reports');
    if (location.pathname.includes('settings')) return t('nav.settings');
    if (location.pathname.includes('my-subscription')) return t('nav.mySubscription');
    if (location.pathname.includes('payment-history')) return t('nav.paymentHistory');
    if (location.pathname.includes('profile')) return t('nav.myProfile');
    return 'Dashboard';
  };

  return (
    <div className="layout-shell">
      {/* SIDEBAR (Clean Light SaaS style) */}
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
          <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav-container">
          <span className="nav-section-label">Menu</span>
          {menuLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar-pill-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-left">
                  <Icon size={19} className="link-icon" />
                  <span className="link-text">{link.label}</span>
                </div>
                <ChevronDown size={14} className="link-chevron" />
              </NavLink>
            );
          })}

          {/* Sidebar Promo / Announcement Banner Cards */}
          <div className="sidebar-promo-section">
            <span className="nav-section-label">Notice Board</span>
            <div className="sidebar-promo-card">
              <div className="promo-badge">PROMO</div>
              <p className="promo-title">Annual Subscription</p>
              <h3 className="promo-highlight">2026 Active</h3>
              <p className="promo-desc">Record offline receipts seamlessly.</p>
            </div>

            <div className="sidebar-promo-card secondary">
              <div className="promo-badge orange">ANNOUNCEMENT</div>
              <p className="promo-title">Mahallu Portal</p>
              <h3 className="promo-highlight">Offline Mode</h3>
              <p className="promo-desc">Vellikkeel Hidayathul Islam</p>
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
        {/* HEADER NAVBAR (Greeting + Quick Stats + User Avatar) */}
        <header className="header-bar">
          <div className="header-left-greeting">
            <button className="mobile-toggle-btn" onClick={() => setIsMobileMenuOpen(true)}>
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
            {/* Language Switcher */}
            <div className="lang-switcher-wrap">
              <button className="icon-circle-btn" title={t('settings.changeLanguage')}>
                <Languages size={18} />
              </button>
              <div className="lang-popover-menu">
                <button
                  className={`lang-popover-item ${language === 'en' ? 'active' : ''}`}
                  onClick={() => handleLanguageSwitch('en')}
                >
                  <span>English</span>
                  {language === 'en' && <Check size={13} />}
                </button>
                <button
                  className={`lang-popover-item ${language === 'ml' ? 'active' : ''}`}
                  onClick={() => handleLanguageSwitch('ml')}
                >
                  <span style={{ fontFamily: 'var(--font-ml)' }}>മലയാളം</span>
                  {language === 'ml' && <Check size={13} />}
                </button>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="notif-bell-wrap">
              <button
                className="icon-circle-btn"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-dot-badge"></span>}
              </button>

              {isNotificationOpen && (
                <div className="notif-dropdown-card">
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
                  {notifications.length > 5 && (
                    <div className="notif-card-footer">
                      <Link
                        to={user?.role === 'admin' ? '/admin/notifications' : '/member/settings'}
                        onClick={() => setIsNotificationOpen(false)}
                      >
                        {t('common.view')}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Balance / Status Summary Pill */}
            <div className="header-balance-pill">
              <span className="balance-label">Role status</span>
              <span className="balance-amount">
                {user?.role === 'admin' ? 'Admin Portal' : 'Member Portal'}
              </span>
            </div>

            {/* Profile Avatar Pill */}
            <div className="profile-pill-wrap">
              <button
                className="profile-pill-trigger"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="user-avatar-img">{userInitials}</div>
                <ChevronDown size={14} className="profile-chevron" />
              </button>

              {isProfileOpen && (
                <div className="profile-popover-card">
                  <div className="profile-pop-header">
                    <h4>{user?.name}</h4>
                    <p>{user?.role === 'admin' ? t('auth.adminLogin') : t('auth.memberLogin')}</p>
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

        {/* CURVED SAAS INNER CANVAS CONTAINER */}
        <div className="canvas-wrapper">
          {/* Canvas Header Bar (Title + Filter Pill + CTA Pill) */}
          <div className="canvas-header-bar">
            <div className="canvas-title-group">
              <div className="canvas-title-icon-box">
                <LayoutDashboard size={20} color="#ffffff" />
              </div>
              <h2 className="canvas-page-title">{getPageTitle()}</h2>
            </div>

            <div className="canvas-actions-group">
              {/* Year Filter Pill Dropdown */}
              <div className="filter-pill-dropdown">
                <Calendar size={15} className="filter-icon" />
                <span>This year</span>
                <ChevronDown size={14} />
              </div>

              {/* Primary Action Button */}
              <button className="pill-btn-primary">
                <Download size={16} />
                <span>Download report</span>
              </button>
            </div>
          </div>

          {/* PAGE CONTENT WORKSPACE */}
          <main className="canvas-content-body animate-fade-in">
            {children}
          </main>
        </div>
      </div>

      <style>{`
        /* ════════════════════════════════════════════════
           LESSA SAAS DASHBOARD LAYOUT STYLES
        ════════════════════════════════════════════════ */
        .layout-shell {
          min-height: 100vh;
          display: flex;
          background: var(--bg-app);
          color: var(--text-main);
          position: relative;
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
          padding-bottom: 24px;
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

        .brand-text-group {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-size: 22px;
          font-weight: 800;
          color: #111827;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .brand-sub {
          font-family: var(--font-ml);
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }

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
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          margin: 14px 12px 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .sidebar-pill-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-radius: var(--radius-pill);
          color: #4b5563;
          font-weight: 600;
          font-size: 14px;
          transition: var(--transition-all);
          text-decoration: none;
        }

        .sidebar-pill-link .link-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar-pill-link .link-icon {
          color: #6b7280;
          transition: var(--transition-all);
        }

        .sidebar-pill-link .link-chevron {
          color: #9ca3af;
          transition: var(--transition-all);
        }

        .sidebar-pill-link:hover {
          background: #f3f4f6;
          color: #111827;
        }

        /* Active Pill Item (Emerald Green) */
        .sidebar-pill-link.active {
          background: var(--primary);
          color: #ffffff;
          box-shadow: 0 8px 18px -2px rgba(0, 150, 107, 0.4);
        }

        .sidebar-pill-link.active .link-icon {
          color: #ffffff;
        }

        .sidebar-pill-link.active .link-chevron {
          color: rgba(255, 255, 255, 0.7);
        }

        /* Promo Section */
        .sidebar-promo-section {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sidebar-promo-card {
          background: linear-gradient(135deg, #00966b 0%, #05805b 100%);
          border-radius: var(--radius-lg);
          padding: 16px;
          color: #ffffff;
          box-shadow: 0 8px 20px -4px rgba(0, 150, 107, 0.3);
          position: relative;
          overflow: hidden;
        }

        .sidebar-promo-card.secondary {
          background: linear-gradient(135deg, #00966b 0%, #007a57 100%);
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
          margin-bottom: 8px;
        }

        .promo-badge.orange {
          background: rgba(255, 122, 0, 0.85);
        }

        .promo-title {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.85;
          text-transform: uppercase;
        }

        .promo-highlight {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.2;
          margin: 2px 0;
        }

        .promo-desc {
          font-size: 11px;
          opacity: 0.8;
        }

        .sidebar-footer {
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }

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

        .sidebar-logout-pill:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fca5a5;
        }

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
          padding: 16px 24px 24px;
        }

        /* ── TOP HEADER ── */
        .header-bar {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .header-left-greeting {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mobile-toggle-btn {
          display: none;
          background: #ffffff;
          border: 1px solid var(--border-color);
          padding: 8px;
          border-radius: 10px;
          cursor: pointer;
        }

        .user-greeting {
          font-size: 22px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .hand-wave {
          display: inline-block;
          font-size: 20px;
        }

        .greeting-sub {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
        }

        .header-right-tools {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .icon-circle-btn {
          width: 40px;
          height: 40px;
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

        .icon-circle-btn:hover {
          background: #f3f4f6;
          color: var(--primary);
        }

        .notif-dot-badge {
          position: absolute;
          top: 9px; right: 9px;
          width: 8px; height: 8px;
          background: var(--primary);
          border-radius: 50%;
          border: 2px solid #ffffff;
        }

        .header-balance-pill {
          display: flex;
          flex-direction: column;
          padding: 6px 16px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          box-shadow: var(--shadow-sm);
          border-left: 3px solid var(--primary);
        }

        .balance-label {
          font-size: 10px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
        }

        .balance-amount {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--primary);
        }

        /* Profile Trigger */
        .profile-pill-wrap {
          position: relative;
        }

        .profile-pill-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          padding: 4px 10px 4px 4px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: var(--transition-all);
        }

        .profile-pill-trigger:hover {
          border-color: #d1d5db;
        }

        .user-avatar-img {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #f3f4f6;
          color: var(--primary);
          font-weight: 800;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
        }

        .profile-chevron {
          color: #6b7280;
        }

        /* Popover menus */
        .profile-popover-card,
        .lang-popover-menu,
        .notif-dropdown-card {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-floating);
          z-index: 120;
          animation: fadeIn 0.2s ease;
          overflow: hidden;
        }

        .profile-popover-card { width: 220px; padding: 8px 0; }
        .lang-popover-menu { width: 140px; padding: 6px 0; }
        .notif-dropdown-card { width: 320px; }

        .profile-pop-header { padding: 12px 16px; }
        .profile-pop-header h4 { font-size: 14px; font-weight: 700; color: #111827; }
        .profile-pop-header p { font-size: 11px; color: #6b7280; margin-top: 2px; }

        .pop-divider { height: 1px; background: #e5e7eb; margin: 6px 0; }

        .pop-item, .lang-popover-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: #374151;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-all);
        }

        .pop-item:hover, .lang-popover-item:hover {
          background: #f3f4f6;
          color: var(--primary);
        }

        .pop-item.logout-red:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .notif-card-header {
          padding: 14px 16px;
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

        .notif-card-footer {
          padding: 10px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          font-weight: 600;
        }
        .notif-card-footer a { color: var(--primary); }

        /* ── INNER CURVED SAAS CANVAS WRAPPER ── */
        .canvas-wrapper {
          flex: 1;
          background: var(--bg-canvas);
          border-radius: var(--radius-xl);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        /* Canvas Top Header (Dashboard icon box + Page Title + Filter Pill + CTA Button) */
        .canvas-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .canvas-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .canvas-title-icon-box {
          width: 38px;
          height: 38px;
          background: #0f2d1f;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 45, 31, 0.25);
        }

        .canvas-page-title {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .canvas-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .filter-pill-dropdown {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          padding: 9px 18px;
          border-radius: var(--radius-pill);
          font-size: 13.5px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
        }

        .filter-pill-dropdown .filter-icon {
          color: #6b7280;
        }

        .canvas-content-body {
          flex: 1;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 991px) {
          .sidebar-aside { transform: translateX(-100%); }
          .sidebar-aside.mobile-visible { transform: translateX(0); }
          .sidebar-close-btn { display: block; }
          .sidebar-overlay { display: block; }
          .main-viewport { margin-left: 0; padding: 12px; }
          .mobile-toggle-btn { display: flex; }
          .canvas-wrapper { padding: 16px; border-radius: 16px; }
          .user-greeting { font-size: 18px; }
          .greeting-sub { font-size: 11px; }
          .canvas-header-bar { flex-direction: column; align-items: flex-start; gap: 12px; }
          .canvas-actions-group { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
