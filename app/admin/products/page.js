'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, UploadCloud, Search, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';

const PAGE_SIZE = 20;

// useSearchParams must be inside a Suspense boundary (required for next build)
export default function AdminProductsPage() {
  return (
    <Suspense fallback={<p className="text-brand-ink/50">Loading...</p>}>
      <AdminProductsInner />
    </Suspense>
  );
}

function AdminProductsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Page, search and category all live in the URL:
  //   /admin/products?page=3&search=kurta&category=<id>
  // so they survive navigating to the edit page and back.
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  // Update one or more URL params. Empty values remove the param.
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

  // Same signature as a useState setter (number or updater function)
  const setPage = useCallback(
    (next) => {
      const value = typeof next === 'function' ? next(page) : next;
      updateParams({ page: value });
    },
    [page, updateParams]
  );

  // Current list URL, passed to the edit page so it can return here
  const qs = searchParams.toString();
  const returnTo = qs ? `${pathname}?${qs}` : pathname;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Search box: typing is local, the URL updates after a short pause
  const [searchInput, setSearchInput] = useState(search);

  // Keep the box in sync when the URL changes (back/forward, clear filters)
  useEffect(() => {
    setSearchInput((cur) => (cur.trim() === search ? cur : search));
  }, [search]);

  // Debounced push to the URL; replace so typing doesn't fill browser history
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== search) {
        updateParams({ search: trimmed, page: 1 }, { replace: true });
        setSelected(new Set());
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, search, updateParams]);

  // Categories for the dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch {
        /* dropdown just stays empty */
      }
    })();
  }, []);

  // Ignore responses from outdated requests (fast typing / quick page changes)
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (category) params.set('category', category);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await res.json();
      if (id !== reqId.current) return;

      setProducts(data.products || []);
      if (typeof data.pages === 'number') {
        setTotalPages(Math.max(1, data.pages));
      } else if (typeof data.total === 'number') {
        setTotalPages(Math.max(1, Math.ceil(data.total / PAGE_SIZE)));
      } else {
        setTotalPages(1);
      }
    } catch {
      if (id === reqId.current) toast.error('Failed to load products');
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setFirstLoad(false);
      }
    }
  }, [page, search, category]);

  useEffect(() => { load(); }, [load]);

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    const pageIds = products.map((p) => p._id);
    const allSelected = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function changeCategory(value) {
    updateParams({ category: value, page: 1 });
    setSelected(new Set()); // don't keep selections from a different filter
  }

  function clearFilters() {
    setSearchInput('');
    updateParams({ search: '', category: '', page: 1 });
    setSelected(new Set());
  }

  async function remove(id) {
    if (!confirm('Delete this product? This also removes its images from storage.')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Product deleted');
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (products.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        load();
      }
    } else toast.error('Failed to delete');
  }

  async function bulkRemove() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected product${ids.length > 1 ? 's' : ''}? This also removes their images from storage.`)) return;

    setBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${data.deletedCount} product${data.deletedCount === 1 ? '' : 's'}`);
        const deletedOnThisPage = products.filter((p) => ids.includes(p._id)).length;
        setSelected(new Set());
        if (deletedOnThisPage >= products.length && page > 1) {
          setPage((p) => p - 1);
        } else {
          load();
        }
      } else {
        toast.error(data.error || 'Bulk delete failed');
      }
    } catch {
      toast.error('Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  }

  const pageIds = products.map((p) => p._id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const hasFilters = search !== '' || category !== '' || searchInput.trim() !== '';

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h1 className="font-display text-2xl font-bold text-brand-magenta">Products</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={bulkRemove}
              disabled={bulkDeleting}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
            >
              <Trash2 size={16} />
              {bulkDeleting ? 'Deleting…' : `Delete (${selected.size})`}
            </button>
          )}
          <Link href="/admin/products/bulk" className="btn-outline flex items-center gap-1 text-sm">
            <UploadCloud size={16} /> Bulk Upload
          </Link>
          <Link href="/admin/products/new" className="btn-primary flex items-center gap-1 text-sm"><Plus size={16} /> Add Product</Link>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products"
            className="w-full border rounded-lg pl-9 pr-8 py-2 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-ink/40 hover:text-brand-ink"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => changeCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button onClick={clearFilters} className="text-sm text-brand-magenta px-2 py-2">
            Clear filters
          </button>
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
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on page"
                  />
                </th>
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Variants</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="border-b border-brand-ink/5">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p._id)}
                      onChange={() => toggleOne(p._id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-brand-ink/60">{p.category?.name}</td>
                  <td className="p-3">{formatINR(p.basePrice)}</td>
                  <td className="p-3">{p.variants?.length}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.isActive ? 'bg-brand-green/15 text-brand-deepgreen' : 'bg-brand-ink/10 text-brand-ink/50'}`}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2 justify-end">
                    <Link
                      href={`/admin/products/${p._id}/edit?returnTo=${encodeURIComponent(returnTo)}`}
                      className="p-1.5 text-brand-magenta"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button onClick={() => remove(p._id)} className="p-1.5 text-brand-magenta"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && !loading && (
            <p className="text-center text-brand-ink/40 py-10">
              {search || category
                ? 'No products match your filters.'
                : 'No products yet. Add your first product!'}
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
          <span key={`ellipsis-${i}`} className="px-2 text-brand-ink/40">
            …
          </span>
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