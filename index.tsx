
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
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
