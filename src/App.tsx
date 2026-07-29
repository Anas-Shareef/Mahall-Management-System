import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LanguageSelect from './pages/LanguageSelect';
import LoginGateway from './pages/auth/LoginGateway';
import AdminLogin from './pages/auth/AdminLogin';
import AdminSignup from './pages/auth/AdminSignup';
import MemberLogin from './pages/auth/MemberLogin';
import MemberSignup from './pages/auth/MemberSignup';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminHouseholds from './pages/admin/Households';
import AdminMembers from './pages/admin/Members';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminPayments from './pages/admin/Payments';
import AdminDonations from './pages/admin/Donations';
import AdminDeaths from './pages/admin/Deaths';
import AdminMarriages from './pages/admin/Marriages';
import AdminNotifications from './pages/admin/Notifications';
import AdminGallery from './pages/admin/Gallery';
import AdminReports from './pages/admin/Reports';

// Dedicated Entity Form Pages
import HouseholdForm from './pages/admin/HouseholdForm';
import MemberForm from './pages/admin/MemberForm';
import DonationForm from './pages/admin/DonationForm';
import DeathForm from './pages/admin/DeathForm';
import MarriageForm from './pages/admin/MarriageForm';

// Member Pages
import MemberDashboard from './pages/member/Dashboard';
import MyHousehold from './pages/member/MyHousehold';
import MemberSubscriptionPage from './pages/member/MySubscription';
import MemberPaymentHistory from './pages/member/PaymentHistory';
import MemberProfile from './pages/member/Profile';

// Shared Pages
import SharedSettings from './pages/SharedSettings';

const App: React.FC = () => {
  return (
    <OrganizationProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            {/* Onboarding & Authentication Gateway */}
            <Route path="/" element={<LanguageSelect />} />
            <Route path="/login" element={<LoginGateway />} />

            {/* Dedicated Auth Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/signup" element={<AdminSignup />} />
            <Route path="/member/login" element={<MemberLogin />} />
            <Route path="/member/signup" element={<MemberSignup />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRole="admin">
                  <DashboardLayout>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      
                      {/* Households */}
                      <Route path="households" element={<AdminHouseholds />} />
                      <Route path="households/new" element={<HouseholdForm />} />
                      <Route path="households/:id/edit" element={<HouseholdForm />} />

                      {/* Members */}
                      <Route path="members" element={<AdminMembers />} />
                      <Route path="members/new" element={<MemberForm />} />
                      <Route path="members/:id/edit" element={<MemberForm />} />

                      <Route path="subscriptions" element={<AdminSubscriptions />} />
                      <Route path="payments" element={<AdminPayments />} />

                      {/* Donations */}
                      <Route path="donations" element={<AdminDonations />} />
                      <Route path="donations/new" element={<DonationForm />} />
                      <Route path="donations/:id/edit" element={<DonationForm />} />

                      {/* Deaths */}
                      <Route path="deaths" element={<AdminDeaths />} />
                      <Route path="deaths/new" element={<DeathForm />} />
                      <Route path="deaths/:id/edit" element={<DeathForm />} />

                      {/* Marriages */}
                      <Route path="marriages" element={<AdminMarriages />} />
                      <Route path="marriages/new" element={<MarriageForm />} />
                      <Route path="marriages/:id/edit" element={<MarriageForm />} />

                      <Route path="notifications" element={<AdminNotifications />} />
                      <Route path="gallery" element={<AdminGallery />} />
                      <Route path="reports" element={<AdminReports />} />
                      <Route path="settings" element={<SharedSettings />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected Member Routes */}
            <Route
              path="/member/*"
              element={
                <ProtectedRoute allowedRole="member">
                  <DashboardLayout>
                    <Routes>
                      <Route path="dashboard" element={<MemberDashboard />} />
                      <Route path="household" element={<MyHousehold />} />
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
  </OrganizationProvider>
);
};

export default App;
