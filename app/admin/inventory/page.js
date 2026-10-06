'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

// Works whether `category` is a populated object or a plain id string
function getCategoryId(p) {
  const c = p.category;
  return (c && typeof c === 'object' ? c._id : c) || '';
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [edits, setEdits] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  // Initial load only (shows "Loading..." once)
  useEffect(() => {
    (async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/products?limit=200'),
          fetch('/api/categories').catch(() => null)
        ]);
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);

        if (catRes && catRes.ok) {
          const catData = await catRes.json();
          setCategories(Array.isArray(catData) ? catData : catData.categories || []);
        }
      } catch {
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function editKey(productId, variantId, size) {
    return `${productId}-${variantId}-${size}`;
  }

  function setStock(productId, variantId, size, value) {
    setEdits((e) => ({ ...e, [editKey(productId, variantId, size)]: value }));
  }

  // Category dropdown options: use /api/categories, or fall back to
  // categories found on the products themselves
  const categoryOptions = useMemo(() => {
    if (categories.length) return categories.map((c) => ({ id: c._id, name: c.name }));
    const map = new Map();
    products.forEach((p) => {
      if (p.category && typeof p.category === 'object' && p.category._id) {
        map.set(p.category._id, p.category.name);
      }
    });
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, products]);

  // Flatten products -> variants -> sizes, then apply category + search filters
  const rows = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return products
      .filter((p) => !category || getCategoryId(p) === category)
      .flatMap((p) =>
        (p.variants || []).flatMap((v) =>
          (v.sizes || []).map((s) => ({ p, v, s, key: editKey(p._id, v._id, s.size) }))
        )
      )
      .filter(({ p, v, s }) => {
        if (!terms.length) return true;
        const haystack = `${p.name} ${v.color} ${s.size} ${s.sku || ''}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });
  }, [products, search, category]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages); // clamp if rows shrink
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(startIdx, startIdx + pageSize);
  const hasFilters = search.trim() !== '' || category !== '';

  function clearFilters() {
    setSearch('');
    setCategory('');
    setPage(1);
  }

  async function saveRow(product, variant, sizeObj) {
    const key = editKey(product._id, variant._id, sizeObj.size);
    const newStock = edits[key];
    if (newStock === undefined) return;

    const stockNum = Number(newStock);
    if (newStock === '' || !Number.isInteger(stockNum) || stockNum < 0) {
      toast.error('Enter a valid stock number (0 or more)');
      return;
    }

    const updatedVariants = product.variants.map((v) =>
      v._id === variant._id
        ? { ...v, sizes: v.sizes.map((s) => (s.size === sizeObj.size ? { ...s, stock: stockNum } : s)) }
        : v
    );

    setSavingKey(key);
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: updatedVariants })
      });

      if (res.ok) {
        // Update local state in place: no reload, no scroll jump
        setProducts((prev) =>
          prev.map((p) => (p._id === product._id ? { ...p, variants: updatedVariants } : p))
        );
        setEdits((e) => {
          const { [key]: _removed, ...rest } = e;
          return rest;
        });
        toast.success('Stock updated');
      } else {
        toast.error('Failed to update stock');
      }
    } catch {
      toast.error('Failed to update stock');
    } finally {
      setSavingKey(null);
    }
  }

  // Compact page number list: 1 ... 4 5 6 ... 20
  function pageNumbers() {
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) out.push('...' + n);
      out.push(n);
    });
    return out;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-magenta mb-5">Inventory</h1>

      {loading ? (
        <p className="text-brand-ink/50">Loading...</p>
      ) : (
        <>
          {/* Search + category filter */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search product, color, size or SKU"
                className="w-full border rounded-lg pl-9 pr-8 py-2 text-sm"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-ink/40 hover:text-brand-ink"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {categoryOptions.length > 0 && (
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 text-sm"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            {hasFilters && (
              <button onClick={clearFilters} className="text-sm text-brand-magenta px-2 py-2">
                Clear filters
              </button>
            )}
          </div>

          <div className="card-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-brand-ink/10 text-brand-ink/50">
                    <th className="p-3">Product</th>
                    <th className="p-3">Color</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-brand-ink/50">
                        {hasFilters ? 'No inventory matches your filters' : 'No inventory found'}
                      </td>
                    </tr>
                  )}
                  {pageRows.map(({ p, v, s, key }) => {
                    const value = edits[key] !== undefined ? edits[key] : s.stock;
                    const isDirty = edits[key] !== undefined && Number(edits[key]) !== s.stock;
                    return (
                      <tr key={key} className="border-b border-brand-ink/5">
                        <td className="p-3">{p.name}</td>
                        <td className="p-3">{v.color}</td>
                        <td className="p-3">{s.size}</td>
                        <td className="p-3 text-xs text-brand-ink/50">{s.sku || '—'}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            className={`w-20 border rounded-lg px-2 py-1 text-sm ${
                              Number(value) <= 5 ? 'border-brand-magenta text-brand-magenta' : ''
                            }`}
                            value={value}
                            onChange={(e) => setStock(p._id, v._id, s.size, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRow(p, v, s)}
                          />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => saveRow(p, v, s)}
                            disabled={!isDirty || savingKey === key}
                            className="text-brand-magenta disabled:opacity-30"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-brand-ink/10 text-sm">
              <div className="flex items-center gap-2 text-brand-ink/60">
                <span>Rows per page</span>
                <select
                  className="border rounded-lg px-2 py-1"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span>
                  {rows.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)} of {rows.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                {pageNumbers().map((n) =>
                  typeof n === 'string' ? (
                    <span key={n} className="px-1 text-brand-ink/40">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`min-w-[32px] px-2 py-1 rounded-lg border ${
                        n === currentPage ? 'bg-brand-magenta text-white border-brand-magenta' : ''
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}