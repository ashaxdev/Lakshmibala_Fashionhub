'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Filters from '@/components/Filters';

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [size, setSize] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const catRes = await fetch(`/api/categories/${slug}`);
    const catData = await catRes.json();
    setCategory(catData.category);

    const params = new URLSearchParams({ category: slug, sort });
    if (size) params.set('size', size);
    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, [slug, size, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-magenta">
        {category?.name || 'Products'}
      </h1>
      {category?.description && <p className="text-brand-ink/60 text-sm mt-1">{category.description}</p>}

      <Filters activeSize={size} onSizeChange={setSize} sort={sort} onSortChange={setSort} />

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
