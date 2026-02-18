import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import CustomersPage from './pages/CustomersPage';
import CollectionsPage from './pages/CollectionsPage';
import EmailsPage from './pages/EmailsPage';
import ContentPage from './pages/ContentPage';
import BlogPage from './pages/BlogPage';

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="customers" element={<CustomersPage />} />
      <Route path="collections" element={<CollectionsPage />} />
      <Route path="emails" element={<EmailsPage />} />
      <Route path="content" element={<ContentPage />} />
      <Route path="blog" element={<BlogPage />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
