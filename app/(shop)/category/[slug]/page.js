'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Filters from '@/components/Filters';

const PAGE_SIZE = 12;

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [size, setSize] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const catRes = await fetch(`/api/categories/${slug}`);
    const catData = await catRes.json();
    setCategory(catData.category);

    const params = new URLSearchParams({
      category: slug,
      sort,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (size) params.set('size', size);

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    setProducts(data.products || []);

    // Support either { total, limit } or a direct { pages } from the API
    if (typeof data.pages === 'number') {
      setTotalPages(Math.max(1, data.pages));
    } else if (typeof data.total === 'number') {
      setTotalPages(Math.max(1, Math.ceil(data.total / PAGE_SIZE)));
    } else {
      setTotalPages(1);
    }

    setLoading(false);
  }, [slug, size, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 whenever filters change (but not on page changes themselves)
  useEffect(() => {
    setPage(1);
  }, [slug, size, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-magenta">
        {category?.name || 'Products'}
      </h1>
      {category?.description && (
        <p className="text-brand-ink/60 text-sm mt-1">{category.description}</p>
      )}

      <Filters
        sizes={category?.sizes}
        activeSize={size}
        onSizeChange={setSize}
        sort={sort}
        onSortChange={setSort}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl2 bg-brand-cream animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-brand-ink/50">
          <p>No products found in this category yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
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
    <nav
      className="flex items-center justify-center gap-1 mt-8"
      aria-label="Pagination"
    >
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
              p === page
                ? 'bg-brand-magenta text-white'
                : 'text-brand-ink/70 hover:bg-brand-cream'
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

// Builds a compact page list like: 1 ... 4 5 [6] 7 8 ... 12
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