
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import NotFound from './pages/NotFound';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
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
                  <Route path="/" element={<App />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SubscriptionProvider>
            </AuthProvider>
            <Toast />
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
