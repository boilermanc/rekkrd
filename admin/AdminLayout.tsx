import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', end: true },
  { to: '/admin/customers', label: 'Customers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', end: false },
  { to: '/admin/collections', label: 'Collections', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', end: false },
  { to: '/admin/emails', label: 'Emails', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', end: false },
  { to: '/admin/content', label: 'Content', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', end: false },
  { to: '/admin/blog', label: 'Blog', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z', end: false },
];

const AdminLayout: React.FC = () => {
  const { signOut } = useAuthContext();

  return (
    <div className="admin-root flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col shrink-0" style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(255,255,255)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #dd6e42, #4f6d7a)' }}>
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>REKKRD</h1>
              <p className="text-[10px]" style={{ color: 'rgb(156,163,175)' }}>Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[rgb(238,242,255)] text-[rgb(99,102,241)]'
                    : 'text-[rgb(107,114,128)] hover:text-[rgb(17,24,39)] hover:bg-[rgb(249,250,251)]'
                }`
              }
            >
              <svg className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: 'rgb(229,231,235)' }}>
          <a
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[rgb(107,114,128)] hover:text-[rgb(17,24,39)] hover:bg-[rgb(249,250,251)] transition-colors"
          >
            <svg className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to App
          </a>
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[rgb(107,114,128)] hover:text-[rgb(239,68,68)] hover:bg-red-50 transition-colors w-full text-left"
          >
            <svg className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
