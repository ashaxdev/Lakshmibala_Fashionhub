'use client';

import { useState } from 'react';
import ProductCard from './ProductCard';

const TABS = [
  { key: 'best', label: '⭐ Bestsellers' },
  { key: 'top',  label: '🔥 Top Sellers' },
  { key: 'new',  label: '✨ New Arrivals' },
];

export default function ProductTabs({ bestSellers, topSellers, activeSellers }) {
  const [active, setActive] = useState('best');

  const map = { best: bestSellers, top: topSellers, new: activeSellers };
  const products = map[active] || [];

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                active === t.key
                  ? 'bg-brand-magenta text-white border-brand-magenta shadow-md shadow-brand-magenta/25'
                  : 'bg-white text-brand-ink/60 border-brand-ink/10 hover:border-brand-magenta/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}