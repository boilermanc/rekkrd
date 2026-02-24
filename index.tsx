
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Toast from './components/Toast';
import AdminAuthGuard from './components/AdminAuthGuard';
import AdminRoutes from './admin/AdminRoutes';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import BlogList from './pages/BlogList';
import BlogPost from './pages/BlogPost';
import ErrorPage from './components/ErrorPage';
import SupportPage from './components/SupportPage';
import WelcomeLandingPage from './src/components/WelcomeLandingPage';
import SellrLandingPage from './src/sellr/pages/LandingPage';
import SellrScanPage from './src/sellr/pages/ScanPage';
import SellrReviewPage from './src/sellr/pages/ReviewPage';
import SellrCheckoutPage from './src/sellr/pages/CheckoutPage';
import SellrSuccessPage from './src/sellr/pages/SuccessPage';
import SellrReportPage from './src/sellr/pages/ReportPage';
import SellrImportPage from './src/sellr/pages/ImportPage';
import SellrOnboardingPage from './src/sellr/pages/OnboardingPage';
import SellrDashboardPage from './src/sellr/pages/DashboardPage';
import SellrAccountPage from './src/sellr/pages/AccountPage';
import SellrLoginPage from './src/sellr/pages/LoginPage';
import SellrSignupPage from './src/sellr/pages/SignupPage';
import SellrLotReportPage from './src/sellr/pages/LotReportPage';
import SellrLotSharePage from './src/sellr/pages/LotSharePage';
import SellrNotFoundPage from './src/sellr/pages/NotFoundPage';
import { SellrAuthProvider } from './src/sellr/contexts/SellrAuthContext';
import { SellrProtectedRoute } from './src/sellr/components/SellrProtectedRoute';


function NotFoundPage() {
  const navigate = useNavigate();
  return <ErrorPage type="404" onGoHome={() => navigate('/')} />;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <Routes>
                  <Route path="/admin/*" element={
                    <AdminAuthGuard>
                      <AdminRoutes />
                    </AdminAuthGuard>
                  } />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/blog" element={<BlogList />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/welcome" element={<WelcomeLandingPage />} />
                  <Route element={<SellrAuthProvider><Outlet /></SellrAuthProvider>}>
                    {/* Public Sellr routes */}
                    <Route path="/sellr" element={<SellrLandingPage />} />
                    <Route path="/sellr/start" element={<SellrOnboardingPage />} />
                    <Route path="/sellr/login" element={<SellrLoginPage />} />
                    <Route path="/sellr/signup" element={<SellrSignupPage />} />
                    <Route path="/sellr/report/share/:token" element={<SellrReportPage />} />
                    <Route path="/sellr/lot/share/:token" element={<SellrLotSharePage />} />
                    {/* Protected Sellr routes */}
                    <Route path="/sellr/scan" element={<SellrProtectedRoute><SellrScanPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/review" element={<SellrProtectedRoute><SellrReviewPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/checkout" element={<SellrProtectedRoute><SellrCheckoutPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/success" element={<SellrProtectedRoute><SellrSuccessPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/report" element={<SellrProtectedRoute><SellrReportPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/lot" element={<SellrProtectedRoute><SellrLotReportPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/import" element={<SellrProtectedRoute><SellrImportPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/dashboard" element={<SellrProtectedRoute><SellrDashboardPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/account" element={<SellrProtectedRoute><SellrAccountPage /></SellrProtectedRoute>} />
                    <Route path="/sellr/*" element={<SellrNotFoundPage />} />
                  </Route>
                  <Route path="/" element={<App />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </SubscriptionProvider>
            </AuthProvider>
            <Toast />
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
