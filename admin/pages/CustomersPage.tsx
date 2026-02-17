import React, { useEffect, useState } from 'react';
import { adminService, AdminCustomer } from '../../services/adminService';

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    adminService.getCustomers()
      .then(setCustomers)
      .catch(err => console.error('Failed to load customers:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return c.email.toLowerCase().includes(q) ||
      (c.display_name || '').toLowerCase().includes(q);
  });

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const planBadge = (plan: string | null, status: string | null) => {
    const label = plan || 'free';
    const isTrialing = status === 'trialing';
    let bgColor = 'rgb(249,250,251)';
    let textColor = 'rgb(107,114,128)';

    if (plan === 'curator') {
      bgColor = 'rgb(238,242,255)';
      textColor = 'rgb(99,102,241)';
    } else if (plan === 'enthusiast') {
      bgColor = 'rgb(255,243,235)';
      textColor = 'rgb(221,110,66)';
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: bgColor, color: textColor }}>
        {label}
        {isTrialing && <span className="text-[10px] opacity-70">(trial)</span>}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Customers</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>{customers.length} registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'rgb(156,163,175)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]"
            style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(255,255,255)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'rgb(249,250,251)' }}>
              <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>User</th>
              <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(107,114,128)' }}>Plan</th>
              <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>Genres</th>
              <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>Joined</th>
              <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
            {filtered.map(c => (
              <React.Fragment key={c.id}>
                <tr
                  className="hover:bg-[rgb(249,250,251)] cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-medium" style={{ color: 'rgb(17,24,39)' }}>{c.display_name || '—'}</p>
                      <p className="text-xs" style={{ color: 'rgb(156,163,175)' }}>{c.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3">{planBadge(c.subscription_plan, c.subscription_status)}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(c.favorite_genres || []).slice(0, 3).map(g => (
                        <span key={g} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}>{g}</span>
                      ))}
                      {!c.favorite_genres?.length && <span style={{ color: 'rgb(209,213,219)' }}>—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>{formatDate(c.created_at)}</td>
                  <td className="px-5 py-3 hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>{formatDate(c.last_sign_in_at)}</td>
                </tr>
                {expandedId === c.id && (
                  <tr>
                    <td colSpan={5} className="px-5 py-4" style={{ backgroundColor: 'rgb(249,250,251)' }}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="font-medium uppercase tracking-wider mb-1" style={{ color: 'rgb(107,114,128)' }}>Role</p>
                          <p style={{ color: 'rgb(17,24,39)' }}>{c.role}</p>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-wider mb-1" style={{ color: 'rgb(107,114,128)' }}>Onboarding</p>
                          <p style={{ color: 'rgb(17,24,39)' }}>{c.onboarding_completed ? 'Complete' : 'Incomplete'}</p>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-wider mb-1" style={{ color: 'rgb(107,114,128)' }}>Setup</p>
                          <p style={{ color: 'rgb(17,24,39)' }}>{c.listening_setup || '—'}</p>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-wider mb-1" style={{ color: 'rgb(107,114,128)' }}>Goal</p>
                          <p style={{ color: 'rgb(17,24,39)' }}>{c.collecting_goal || '—'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center" style={{ color: 'rgb(156,163,175)' }}>
                  {search ? 'No customers match your search' : 'No customers yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersPage;
