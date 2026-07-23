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
  Check
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
    // Refresh notifications every 30s
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

  // Close menus when clicking outside or navigating
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

  return (
    <div className="layout-container">
      {/* LEFT SIDEBAR (Desktop) */}
      <aside className={`sidebar-aside ${isMobileMenuOpen ? 'mobile-visible' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span>VH</span>
          </div>
          <div className="sidebar-title-group">
            <h1 className="sidebar-main-title">ഹിദായത്തുൽ ഇസ്ലാം</h1>
            <p className="sidebar-sub-title">വള്ളിക്ക്കീൽ മഹല്ല്</p>
          </div>
          <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} className="link-icon" />
                <span className="link-text">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* RIGHT MAIN WORKSPACE */}
      <div className="main-workspace">
        {/* HEADER */}
        <header className="header-navbar">
          <div className="header-left">
            <button className="header-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="header-page-title">
              {location.pathname.includes('dashboard') && t('nav.dashboard')}
              {location.pathname.includes('households') && t('nav.households')}
              {location.pathname.includes('members') && t('nav.members')}
              {location.pathname.includes('subscriptions') && t('nav.subscriptions')}
              {location.pathname.includes('payments') && t('nav.payments')}
              {location.pathname.includes('notifications') && t('nav.notifications')}
              {location.pathname.includes('reports') && t('nav.reports')}
              {location.pathname.includes('settings') && t('nav.settings')}
              {location.pathname.includes('my-subscription') && t('nav.mySubscription')}
              {location.pathname.includes('payment-history') && t('nav.paymentHistory')}
              {location.pathname.includes('profile') && t('nav.myProfile')}
            </h2>
          </div>

          <div className="header-right">
            {/* Quick Language Selection Dropdown */}
            <div className="language-selector-wrapper">
              <button className="icon-badge-btn" title={t('settings.changeLanguage')}>
                <Languages size={20} />
              </button>
              <div className="language-dropdown-menu">
                <button
                  className={`lang-option ${language === 'en' ? 'active' : ''}`}
                  onClick={() => handleLanguageSwitch('en')}
                >
                  <span>English</span>
                  {language === 'en' && <Check size={14} />}
                </button>
                <button
                  className={`lang-option ${language === 'ml' ? 'active' : ''}`}
                  onClick={() => handleLanguageSwitch('ml')}
                >
                  <span style={{ fontFamily: 'var(--font-ml)' }}>മലയാളം</span>
                  {language === 'ml' && <Check size={14} />}
                </button>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="notification-bell-wrapper">
              <button 
                className="icon-badge-btn" 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {isNotificationOpen && (
                <div className="notification-dropdown">
                  <div className="dropdown-header">
                    <h4>{t('notifications.notificationCenter')}</h4>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead} className="mark-all-read-btn">
                        {t('notifications.markAsRead')}
                      </button>
                    )}
                  </div>
                  <div className="dropdown-body">
                    {notifications.length === 0 ? (
                      <div className="empty-state">{t('common.noData')}</div>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`notification-item ${!notif.read_at ? 'unread' : ''}`}
                          onClick={() => !notif.read_at && handleMarkAsRead(notif.recipient_id)}
                        >
                          <div className="notification-item-content">
                            <h5 className="item-title">
                              {language === 'en' ? notif.title_en : notif.title_ml}
                            </h5>
                            <p className="item-message">
                              {language === 'en' ? notif.message_en : notif.message_ml}
                            </p>
                            <span className="item-time">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {!notif.read_at && <span className="unread-dot"></span>}
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 5 && (
                    <div className="dropdown-footer">
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

            {/* Profile Dropdown */}
            <div className="profile-menu-wrapper">
              <button 
                className="profile-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="avatar-circle">
                  <User size={18} />
                </div>
                <span className="profile-name">{user?.name}</span>
              </button>

              {isProfileOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-profile-header">
                    <h4>{user?.name}</h4>
                    <p>{user?.role === 'admin' ? t('auth.adminLogin') : t('auth.memberLogin')}</p>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link 
                    to={user?.role === 'admin' ? '/admin/settings' : '/member/profile'} 
                    className="dropdown-item"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User size={16} />
                    <span>{t('nav.myProfile')}</span>
                  </Link>
                  <Link 
                    to={user?.role === 'admin' ? '/admin/settings' : '/member/settings'} 
                    className="dropdown-item"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings size={16} />
                    <span>{t('nav.settings')}</span>
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENTS */}
        <main className="main-content">
          <div className="page-fade-in-container">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        .layout-container {
          min-height: 100vh;
          display: flex;
          background: var(--bg-app);
          color: var(--text-main);
          position: relative;
        }

        /* SIDEBAR STYLE */
        .sidebar-aside {
          width: 260px;
          background: var(--bg-sidebar);
          color: var(--text-inverse);
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 100;
          transition: var(--transition-all);
        }

        .sidebar-header {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          position: relative;
        }

        .sidebar-logo {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-dark) 100%);
          border: 2px solid var(--gold);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sidebar-logo span {
          color: var(--gold);
          font-weight: 800;
          font-size: 15px;
        }

        .sidebar-title-group {
          display: flex;
          flex-direction: column;
        }

        .sidebar-main-title {
          font-family: var(--font-ml);
          font-size: 16px;
          color: var(--text-inverse);
          font-weight: 700;
          line-height: 1.2;
        }

        .sidebar-sub-title {
          font-size: 10px;
          color: var(--gold-light);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sidebar-close-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-inverse);
          cursor: pointer;
          position: absolute;
          right: 20px;
        }

        .sidebar-nav {
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          overflow-y: auto;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: rgba(255, 255, 255, 0.7);
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-size: 14px;
          transition: var(--transition-all);
        }

        .sidebar-link:hover {
          color: var(--text-inverse);
          background: rgba(255, 255, 255, 0.04);
        }

        .sidebar-link.active {
          color: var(--text-inverse);
          background: var(--bg-sidebar-active);
          border-left: 3px solid var(--gold);
          box-shadow: inset 2px 0 8px rgba(0, 0, 0, 0.15);
        }

        .sidebar-link .link-icon {
          color: var(--gold-light);
        }

        .sidebar-link.active .link-icon {
          color: var(--gold);
        }

        .sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sidebar-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.7);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: var(--transition-all);
        }

        .sidebar-logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          border-color: #ef4444;
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 99;
          animation: fadeIn 0.2s ease;
        }

        /* MAIN WORKSPACE STYLE */
        .main-workspace {
          flex: 1;
          margin-left: 260px;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Prevents overflow */
        }

        /* HEADER NAVBAR */
        .header-navbar {
          height: 70px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 90;
        }

        .header-menu-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-main);
          cursor: pointer;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-page-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary);
        }

        [data-theme="dark"] .header-page-title {
          color: var(--gold-light);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        /* ICON BUTTONS */
        .icon-badge-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          position: relative;
          padding: 6px;
          border-radius: var(--radius-sm);
          transition: var(--transition-all);
        }

        .icon-badge-btn:hover {
          color: var(--primary);
          background: var(--border-color);
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--error);
          color: white;
          font-size: 9px;
          font-weight: 700;
          height: 16px;
          min-width: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid var(--bg-card);
        }

        /* LANGUAGE SELECTOR WRAPPER */
        .language-selector-wrapper {
          position: relative;
        }

        .language-selector-wrapper:hover .language-dropdown-menu {
          display: block;
        }

        .language-dropdown-menu {
          display: none;
          position: absolute;
          top: 100%;
          right: 0;
          width: 130px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-md);
          padding: 4px 0;
          z-index: 120;
        }

        .lang-option {
          width: 100%;
          padding: 8px 16px;
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          color: var(--text-main);
          font-size: 13px;
          transition: var(--transition-all);
        }

        .lang-option:hover {
          background: var(--bg-app);
          color: var(--primary);
        }

        .lang-option.active {
          font-weight: 700;
          color: var(--primary);
        }

        /* PROFILE BUTTON & DROPDOWN */
        .profile-menu-wrapper {
          position: relative;
        }

        .profile-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: var(--radius-md);
          transition: var(--transition-all);
        }

        .profile-btn:hover {
          background: var(--bg-app);
        }

        .avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary-10);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--primary-20);
        }

        .profile-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
        }

        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 220px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 8px 0;
          z-index: 120;
          margin-top: 8px;
          animation: fadeIn 0.2s ease;
        }

        .dropdown-profile-header {
          padding: 12px 16px;
        }

        .dropdown-profile-header h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-main);
        }

        .dropdown-profile-header p {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .dropdown-divider {
          height: 1px;
          background: var(--border-color);
          margin: 6px 0;
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 13px;
          cursor: pointer;
          transition: var(--transition-all);
          text-align: left;
        }

        .dropdown-item:hover {
          background: var(--bg-app);
          color: var(--primary);
        }

        .dropdown-item.logout-btn:hover {
          color: var(--error);
          background: var(--error-bg);
        }

        /* NOTIFICATION DROPDOWN */
        .notification-bell-wrapper {
          position: relative;
        }

        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 320px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: 120;
          margin-top: 8px;
          animation: fadeIn 0.2s ease;
        }

        .dropdown-header {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
        }

        .dropdown-header h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-main);
        }

        .mark-all-read-btn {
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .dropdown-body {
          max-height: 280px;
          overflow-y: auto;
        }

        .empty-state {
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }

        .notification-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: var(--transition-all);
        }

        .notification-item:hover {
          background: var(--bg-app);
        }

        .notification-item.unread {
          background: var(--primary-10);
        }

        .notification-item-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .item-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .item-message {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .item-time {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--info);
          flex-shrink: 0;
          margin-top: 4px;
        }

        .dropdown-footer {
          padding: 8px 16px;
          text-align: center;
          border-top: 1px solid var(--border-color);
          font-size: 12px;
          font-weight: 600;
        }

        .dropdown-footer a {
          color: var(--primary);
        }

        /* MAIN CONTENT AREA */
        .main-content {
          padding: 32px;
          flex: 1;
          overflow-y: auto;
        }

        .page-fade-in-container {
          animation: fadeIn 0.4s ease forwards;
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 991px) {
          .sidebar-aside {
            transform: translateX(-100%);
          }

          .sidebar-aside.mobile-visible {
            transform: translateX(0);
          }

          .sidebar-close-btn {
            display: block;
          }

          .sidebar-overlay {
            display: block;
          }

          .main-workspace {
            margin-left: 0;
          }

          .header-navbar {
            padding: 0 20px;
          }

          .header-menu-btn {
            display: block;
          }

          .profile-name {
            display: none;
          }
          
          .main-content {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};
export default DashboardLayout;
