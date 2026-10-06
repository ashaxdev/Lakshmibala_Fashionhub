'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatINR } from '@/lib/utils';

const STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];
const PAGE_SIZE = 20;

// useSearchParams must be inside a Suspense boundary (required for next build)
export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="text-brand-ink/50">Loading...</p>}>
      <AdminOrdersInner />
    </Suspense>
  );
}

function AdminOrdersInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Page, status and search live in the URL:
  //   /admin/orders?page=2&status=shipped&search=9876
  // so they survive opening an order and coming back.
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const updateParams = useCallback(
    (updates, { replace = false } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) params.delete(key);
        else params.set(key, String(value));
      });
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setPage = useCallback((p) => updateParams({ page: p }), [updateParams]);

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [serverPaged, setServerPaged] = useState(true);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [searchInput, setSearchInput] = useState(search);

  // Keep the box in sync when the URL changes (back/forward)
  useEffect(() => { setSearchInput(search); }, [search]);

  // Ignore responses from outdated requests
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (status) params.set('status', status);
      if (search) params.set('search', search);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (id !== reqId.current) return;

      const list = data.orders || [];
      setOrders(list);

      if (typeof data.pages === 'number' || typeof data.total === 'number') {
        // API paginates on the server
        const count = typeof data.total === 'number' ? data.total : null;
        setServerPaged(true);
        setTotal(count);
        setTotalPages(
          Math.max(1, typeof data.pages === 'number' ? data.pages : Math.ceil(count / PAGE_SIZE))
        );
      } else {
        // API returned everything with no page info: paginate in the browser
        setServerPaged(false);
        setTotal(list.length);
        setTotalPages(Math.max(1, Math.ceil(list.length / PAGE_SIZE)));
      }
    } catch {
      if (id === reqId.current) toast.error('Failed to load orders');
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setFirstLoad(false);
      }
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  // If the current page no longer exists (e.g. after filtering), step back
  useEffect(() => {
    if (!loading && page > totalPages) updateParams({ page: totalPages }, { replace: true });
  }, [loading, page, totalPages, updateParams]);

  function applySearch() {
    updateParams({ search: searchInput.trim(), page: 1 });
  }

  function changeStatus(value) {
    updateParams({ status: value, page: 1 });
  }

  function clearFilters() {
    setSearchInput('');
    updateParams({ status: '', search: '', page: 1 });
  }

  const visibleOrders = serverPaged
    ? orders
    : orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = status !== '' || search !== '';

  return (
    <div>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
        <h1 className="font-display text-2xl font-bold text-brand-magenta">Orders</h1>
        {total !== null && !firstLoad && (
          <span className="text-sm text-brand-ink/50">{total} order{total === 1 ? '' : 's'}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Search by order number, name, phone"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={applySearch} className="btn-outline text-sm">Search</button>
        {(hasFilters || searchInput) && (
          <button onClick={clearFilters} className="text-sm text-brand-magenta px-2">Clear filters</button>
        )}
      </div>

      {firstLoad ? (
        <p className="text-brand-ink/50">Loading...</p>
      ) : (
        // Table stays mounted while reloading (just dimmed), so the page doesn't jump
        <div className={`card-soft overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-brand-ink/10 text-brand-ink/50">
                <th className="p-3">Order #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((o) => (
                <tr key={o._id} className="border-b border-brand-ink/5">
                  <td className="p-3 font-medium">{o.orderNumber}</td>
                  <td className="p-3">{o.customer?.name}<br /><span className="text-xs text-brand-ink/50">{o.customer?.phone}</span></td>
                  <td className="p-3">{formatINR(o.total)}</td>
                  <td className="p-3 capitalize">{o.paymentStatus}</td>
                  <td className="p-3 capitalize">{o.status}</td>
                  <td className="p-3 text-xs text-brand-ink/50">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="p-3"><Link href={`/admin/orders/${o._id}`} className="text-brand-magenta font-medium">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length === 0 && !loading && (
            <p className="text-center text-brand-ink/40 py-10">
              {hasFilters ? 'No orders match your filters.' : 'No orders found.'}
            </p>
          )}
        </div>
      )}

      {!firstLoad && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  const goTo = (p) => {
    const clamped = Math.min(Math.max(p, 1), totalPages);
    if (clamped !== page) {
      onPageChange(clamped);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1 mt-6" aria-label="Pagination">
      <button
        onClick={() => goTo(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg text-sm font-medium text-brand-ink/70 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-cream transition-colors"
        aria-label="Previous page"
      >
        Prev
      </button>

      {pageNumbers.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-brand-ink/40">…</span>
        ) : (
          <button
            key={p}
            onClick={() => goTo(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
              p === page ? 'bg-brand-magenta text-white' : 'text-brand-ink/70 hover:bg-brand-cream'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => goTo(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-2 rounded-lg text-sm font-medium text-brand-ink/70 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-cream transition-colors"
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}

function getPageNumbers(current, total) {
  const delta = 1;
  const range = [];
  const rangeWithDots = [];
  let last;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (last) {
      if (i - last === 2) {
        rangeWithDots.push(last + 1);
      } else if (i - last > 2) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    last = i;
  }

  return rangeWithDots;
}