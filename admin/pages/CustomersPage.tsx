import React, { useEffect, useState, useMemo } from 'react';
import { adminService, AdminCustomer } from '../../services/adminService';

type SortKey = 'display_name' | 'email' | 'subscription_plan' | 'created_at' | 'last_sign_in_at';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 25, 50];

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSub, setEditSub] = useState<{ plan: string; status: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    adminService.getCustomers()
      .then(setCustomers)
      .catch(err => console.error('Failed to load customers:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleSaveSub = async (userId: string) => {
    if (!editSub) return;
    setSaving(true);
    try {
      await adminService.updateCustomerSubscription(userId, editSub);
      setCustomers(prev =>
        prev.map(c =>
          c.id === userId
            ? { ...c, subscription_plan: editSub.plan, subscription_status: editSub.status }
            : c
        )
      );
      setEditSub(null);
    } catch (err) {
      console.error('Failed to update subscription:', err);
      alert(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    let result = customers.filter(c => {
      const q = search.toLowerCase();
      return c.email.toLowerCase().includes(q) ||
        (c.display_name || '').toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'display_name': cmp = (a.display_name || '').localeCompare(b.display_name || ''); break;
        case 'email': cmp = a.email.localeCompare(b.email); break;
        case 'subscription_plan': cmp = (a.subscription_plan || '').localeCompare(b.subscription_plan || ''); break;
        case 'created_at': cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(); break;
        case 'last_sign_in_at': cmp = new Date(a.last_sign_in_at || 0).getTime() - new Date(b.last_sign_in_at || 0).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [customers, search, sortKey, sortDir]);

  // Reset to page 1 when search or sort changes
  useEffect(() => { setPage(1); }, [search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

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

  const SortHeader: React.FC<{ label: string; field: SortKey; className?: string }> = ({ label, field, className }) => (
    <th
      className={`text-left px-5 py-3 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-[rgb(17,24,39)] select-none ${className || ''}`}
      style={{ color: sortKey === field ? 'rgb(99,102,241)' : 'rgb(107,114,128)' }}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        )}
      </span>
    </th>
  );

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
              <SortHeader label="User" field="display_name" />
              <SortHeader label="Plan" field="subscription_plan" />
              <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>Genres</th>
              <SortHeader label="Joined" field="created_at" className="hidden lg:table-cell" />
              <SortHeader label="Last Active" field="last_sign_in_at" className="hidden lg:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
            {paged.map(c => (
              <React.Fragment key={c.id}>
                <tr
                  className="hover:bg-[rgb(249,250,251)] cursor-pointer transition-colors"
                  onClick={() => {
                    if (expandedId === c.id) {
                      setExpandedId(null);
                      setEditSub(null);
                    } else {
                      setExpandedId(c.id);
                      setEditSub({ plan: c.subscription_plan || 'collector', status: c.subscription_status || 'active' });
                    }
                  }}
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
                      {/* Subscription Override */}
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgb(229,231,235)' }}>
                        <p className="font-medium uppercase tracking-wider mb-1 text-xs" style={{ color: 'rgb(107,114,128)' }}>
                          Subscription Override
                        </p>
                        <p className="text-xs mb-3" style={{ color: 'rgb(156,163,175)' }}>
                          Manually set this user's plan and status without Stripe. Saving resets their scan counter and sets the billing period to 1 year from now.
                        </p>
                        <div className="flex items-end gap-3">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'rgb(107,114,128)' }}>Plan</label>
                            <select
                              value={editSub?.plan || 'collector'}
                              onChange={e => setEditSub(prev => prev ? { ...prev, plan: e.target.value } : null)}
                              className="text-xs border rounded px-2 py-1.5"
                              style={{ borderColor: 'rgb(229,231,235)' }}
                            >
                              <option value="collector">collector</option>
                              <option value="curator">curator</option>
                              <option value="enthusiast">enthusiast</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'rgb(107,114,128)' }}>Status</label>
                            <select
                              value={editSub?.status || 'active'}
                              onChange={e => setEditSub(prev => prev ? { ...prev, status: e.target.value } : null)}
                              className="text-xs border rounded px-2 py-1.5"
                              style={{ borderColor: 'rgb(229,231,235)' }}
                            >
                              <option value="active">active</option>
                              <option value="trialing">trialing</option>
                              <option value="canceled">canceled</option>
                              <option value="past_due">past_due</option>
                              <option value="incomplete">incomplete</option>
                              <option value="expired">expired</option>
                            </select>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveSub(c.id); }}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 rounded font-medium text-white disabled:opacity-50 transition-colors"
                            style={{ backgroundColor: 'rgb(99,102,241)' }}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center" style={{ color: 'rgb(156,163,175)' }}>
                  {search ? 'No customers match your search' : 'No customers yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(107,114,128)' }}>
          <span>Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="border rounded px-1.5 py-0.5 text-xs"
            style={{ borderColor: 'rgb(229,231,235)', color: 'rgb(107,114,128)' }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1 text-xs rounded border disabled:opacity-40 hover:bg-[rgb(249,250,251)] transition-colors"
            style={{ borderColor: 'rgb(229,231,235)', color: 'rgb(107,114,128)' }}
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`e${i}`} className="px-1 text-xs" style={{ color: 'rgb(156,163,175)' }}>...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 text-xs rounded border transition-colors ${page === p ? 'bg-[rgb(99,102,241)] text-white border-[rgb(99,102,241)]' : 'hover:bg-[rgb(249,250,251)]'}`}
                  style={page !== p ? { borderColor: 'rgb(229,231,235)', color: 'rgb(107,114,128)' } : undefined}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2.5 py-1 text-xs rounded border disabled:opacity-40 hover:bg-[rgb(249,250,251)] transition-colors"
            style={{ borderColor: 'rgb(229,231,235)', color: 'rgb(107,114,128)' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomersPage;
