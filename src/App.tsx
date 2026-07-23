import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LanguageSelect from './pages/LanguageSelect';
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminHouseholds from './pages/admin/Households';
import AdminMembers from './pages/admin/Members';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminPayments from './pages/admin/Payments';
import AdminNotifications from './pages/admin/Notifications';
import AdminReports from './pages/admin/Reports';

// Member Pages
import MemberDashboard from './pages/member/Dashboard';
import MemberSubscriptionPage from './pages/member/MySubscription';
import MemberPaymentHistory from './pages/member/PaymentHistory';
import MemberProfile from './pages/member/Profile';

// Shared Pages
import SharedSettings from './pages/SharedSettings';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Onboarding & Authentication */}
            <Route path="/" element={<LanguageSelect />} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRole="admin">
                  <DashboardLayout>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="households" element={<AdminHouseholds />} />
                      <Route path="members" element={<AdminMembers />} />
                      <Route path="subscriptions" element={<AdminSubscriptions />} />
                      <Route path="payments" element={<AdminPayments />} />
                      <Route path="notifications" element={<AdminNotifications />} />
                      <Route path="reports" element={<AdminReports />} />
                      <Route path="settings" element={<SharedSettings />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Member Routes */}
            <Route
              path="/member/*"
              element={
                <ProtectedRoute allowedRole="member">
                  <DashboardLayout>
                    <Routes>
                      <Route path="dashboard" element={<MemberDashboard />} />
                      <Route path="my-subscription" element={<MemberSubscriptionPage />} />
                      <Route path="payment-history" element={<MemberPaymentHistory />} />
                      <Route path="profile" element={<MemberProfile />} />
                      <Route path="settings" element={<SharedSettings />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback routing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
