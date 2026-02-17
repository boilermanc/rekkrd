import React, { useEffect, useState, useMemo } from 'react';
import { adminService, AdminAlbum, AdminCollectionStats } from '../../services/adminService';

type SortKey = 'title' | 'artist' | 'year' | 'genre' | 'price_median' | 'created_at';
type SortDir = 'asc' | 'desc';

const CollectionsPage: React.FC = () => {
  const [albums, setAlbums] = useState<AdminAlbum[]>([]);
  const [stats, setStats] = useState<AdminCollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    adminService.getCollections()
      .then(({ albums, stats }) => {
        setAlbums(albums);
        setStats(stats);
      })
      .catch(err => console.error('Failed to load collections:', err))
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

  const sorted = useMemo(() => {
    let result = albums.filter(a => {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        (a.genre || '').toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'artist': cmp = a.artist.localeCompare(b.artist); break;
        case 'year': cmp = parseInt(a.year || '0') - parseInt(b.year || '0'); break;
        case 'genre': cmp = (a.genre || '').localeCompare(b.genre || ''); break;
        case 'price_median': cmp = (a.price_median || 0) - (b.price_median || 0); break;
        case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [albums, search, sortKey, sortDir]);

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

  const topGenres = stats?.genreBreakdown
    ? (Object.entries(stats.genreBreakdown) as [string, number][]).sort(([,a], [,b]) => b - a).slice(0, 5)
    : [];

  const topDecades = stats?.decadeBreakdown
    ? (Object.entries(stats.decadeBreakdown) as [string, number][]).sort(([,a], [,b]) => b - a).slice(0, 5)
    : [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Collections</h1>
        <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>All albums across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgb(107,114,128)' }}>Total Albums</p>
          <p className="text-xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>{stats?.totalAlbums ?? 0}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgb(107,114,128)' }}>Total Value</p>
          <p className="text-xl font-semibold" style={{ color: 'rgb(34,197,94)' }}>${(stats?.totalValue ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgb(107,114,128)' }}>Top Genres</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {topGenres.slice(0, 3).map(([g, n]) => (
              <span key={g} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }}>{g} ({n})</span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgb(107,114,128)' }}>Top Decades</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {topDecades.slice(0, 3).map(([d, n]) => (
              <span key={d} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(255,243,235)', color: 'rgb(221,110,66)' }}>{d} ({n})</span>
            ))}
          </div>
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
            placeholder="Search albums..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]"
            style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(255,255,255)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgb(249,250,251)' }}>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider w-12" style={{ color: 'rgb(107,114,128)' }}></th>
                <SortHeader label="Title" field="title" />
                <SortHeader label="Artist" field="artist" />
                <SortHeader label="Year" field="year" className="hidden md:table-cell" />
                <SortHeader label="Genre" field="genre" className="hidden lg:table-cell" />
                <SortHeader label="Value" field="price_median" className="hidden md:table-cell" />
                <SortHeader label="Added" field="created_at" className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
              {sorted.map(a => (
                <tr key={a.id} className="hover:bg-[rgb(249,250,251)] transition-colors">
                  <td className="px-5 py-2">
                    {a.cover_url ? (
                      <img src={a.cover_url} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'rgb(243,244,246)' }}>
                        <svg className="w-4 h-4" style={{ color: 'rgb(209,213,219)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium" style={{ color: 'rgb(17,24,39)' }}>{a.title}</td>
                  <td className="px-5 py-3" style={{ color: 'rgb(107,114,128)' }}>{a.artist}</td>
                  <td className="px-5 py-3 hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>{a.year || '—'}</td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {a.genre ? (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}>{a.genre}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell" style={{ color: a.price_median ? 'rgb(17,24,39)' : 'rgb(209,213,219)' }}>
                    {a.price_median ? `$${a.price_median}` : '—'}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center" style={{ color: 'rgb(156,163,175)' }}>
                    {search ? 'No albums match your search' : 'No albums in the platform'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs mt-3" style={{ color: 'rgb(156,163,175)' }}>Showing {sorted.length} of {albums.length} albums</p>
    </div>
  );
};

export default CollectionsPage;
