import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService, AdminCustomer, AdminCollectionStats } from '../services/adminService';

const AdminDashboard: React.FC = () => {
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [stats, setStats] = useState<AdminCollectionStats | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getCustomers(),
      adminService.getCollections(),
    ]).then(([customers, collections]) => {
      setCustomerCount(customers.length);
      setRecentCustomers(customers.slice(0, 5));
      setStats(collections.stats);
    }).catch(err => {
      console.error('Dashboard load error:', err);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Customers', value: customerCount ?? 0, color: 'rgb(99,102,241)', bgColor: 'rgb(238,242,255)' },
    { label: 'Total Albums', value: stats?.totalAlbums ?? 0, color: 'rgb(221,110,66)', bgColor: 'rgb(255,243,235)' },
    { label: 'Portfolio Value', value: `$${(stats?.totalValue ?? 0).toLocaleString()}`, color: 'rgb(34,197,94)', bgColor: 'rgb(240,253,244)' },
    { label: 'Top Genre', value: stats?.genreBreakdown ? (Object.entries(stats.genreBreakdown) as [string, number][]).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A' : 'N/A', color: 'rgb(234,179,8)', bgColor: 'rgb(254,252,232)' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>Overview of your Rekkrd platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="rounded-xl border p-5" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bgColor }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: card.color }} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>{card.label}</p>
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Recent Customers</h3>
            <Link to="/admin/customers" className="text-xs font-medium" style={{ color: 'rgb(99,102,241)' }}>View all</Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgb(229,231,235)' }}>
            {recentCustomers.map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(17,24,39)' }}>{c.display_name || c.email}</p>
                  <p className="text-xs" style={{ color: 'rgb(156,163,175)' }}>{c.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  backgroundColor: c.subscription_plan === 'curator' ? 'rgb(238,242,255)' : c.subscription_plan === 'enthusiast' ? 'rgb(255,243,235)' : 'rgb(249,250,251)',
                  color: c.subscription_plan === 'curator' ? 'rgb(99,102,241)' : c.subscription_plan === 'enthusiast' ? 'rgb(221,110,66)' : 'rgb(107,114,128)',
                }}>
                  {c.subscription_plan || 'free'}
                </span>
              </div>
            ))}
            {recentCustomers.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'rgb(156,163,175)' }}>No customers yet</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Quick Actions</h3>
          </div>
          <div className="p-5 space-y-3">
            <Link to="/admin/collections" className="flex items-center gap-3 p-3 rounded-lg hover:bg-[rgb(249,250,251)] transition-colors">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(255,243,235)' }}>
                <svg className="w-4 h-4" style={{ color: 'rgb(221,110,66)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgb(17,24,39)' }}>Browse All Collections</p>
                <p className="text-xs" style={{ color: 'rgb(156,163,175)' }}>View albums across all users</p>
              </div>
            </Link>
            <Link to="/admin/emails" className="flex items-center gap-3 p-3 rounded-lg hover:bg-[rgb(249,250,251)] transition-colors">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(238,242,255)' }}>
                <svg className="w-4 h-4" style={{ color: 'rgb(99,102,241)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgb(17,24,39)' }}>Email Management</p>
                <p className="text-xs" style={{ color: 'rgb(156,163,175)' }}>Create templates and send test emails</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
