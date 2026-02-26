import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import CustomersPage from './pages/CustomersPage';
import CollectionsPage from './pages/CollectionsPage';
import EmailsPage from './pages/EmailsPage';
import ContentPage from './pages/ContentPage';
import BlogPage from './pages/BlogPage';
import CardAnalytics from '../src/components/admin/CardAnalytics';
import OnboardingPreviewPage from './pages/OnboardingPreviewPage';
import IntegrationsPage from './pages/IntegrationsPage';
import SellrAdminPanel from '../src/sellr/pages/AdminPanel';
import GearCatalogPage from './pages/GearCatalogPage';

const sellrAdminToken = import.meta.env.VITE_SELLR_ADMIN_TOKEN || '';

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="collections" element={<CollectionsPage />} />
      <Route path="emails" element={<EmailsPage />} />
      <Route path="content" element={<ContentPage />} />
      <Route path="blog" element={<BlogPage />} />
      <Route path="analytics" element={<CardAnalytics />} />
      <Route path="integrations" element={<IntegrationsPage />} />
      <Route path="onboarding-preview" element={<OnboardingPreviewPage />} />
      <Route path="sellr" element={<SellrAdminPanel authToken={sellrAdminToken} />} />
      <Route path="gear-catalog" element={<GearCatalogPage />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
