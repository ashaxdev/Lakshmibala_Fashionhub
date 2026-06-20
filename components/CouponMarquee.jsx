'use client';

import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';

export default function CouponMarquee() {
  const [coupons, setCoupons] = useState([]);

  useEffect(() => {
    fetch('/api/coupons?active=true')
      .then((r) => r.json())
      .then((d) => setCoupons(d.coupons || []))
      .catch(() => {});
  }, []);

  if (!coupons.length) return null;

  // Duplicate for seamless loop
  const items = [...coupons, ...coupons];

  return (
    <div className="bg-brand-magenta text-white py-2 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-2 mx-8 text-xs font-semibold">
            <Tag size={11} className="shrink-0" />
            Use <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold tracking-wider">{c.code}</span>
            — {c.type === 'percent' ? `${c.value}% OFF` : `₹${c.value} OFF`}
            {c.minOrderValue > 0 && <span className="text-white/70"> on orders above ₹{c.minOrderValue}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}