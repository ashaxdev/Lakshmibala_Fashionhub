'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Instagram, ShoppingBag } from 'lucide-react';

export default function ReelsSection({ reels }) {
  if (!reels?.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="text-center mb-5">
        <p className="text-xs font-bold text-brand-magenta uppercase tracking-widest mb-1">Watch & Shop</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-ink">Shop by Reels</h2>
        
         <a href="https://instagram.com/Lakshmibala_Clothing_Store"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-brand-magenta font-semibold hover:underline mt-1"
        >
          <Instagram size={15} /> Follow us
        </a>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {reels.map((reel) => (
          <div key={reel._id} className="relative min-w-[145px] sm:min-w-[175px] aspect-[9/16] rounded-2xl overflow-hidden shrink-0 group shadow-md">
            <Image
              src={reel.thumbnail || '/placeholder.png'}
              alt={reel.title || 'Reel'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
            
             <a  href={reel.instagramLink || '#'}
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play size={16} className="fill-brand-magenta text-brand-magenta ml-0.5" />
              </div>
            </a>
            <div className="absolute bottom-0 inset-x-0 p-2.5">
              {reel.product?.name && (
                <p className="text-white text-[11px] font-medium line-clamp-1 mb-1.5">{reel.product.name}</p>
              )}
              {reel.product?.slug && (
                <Link
                  href={`/product/${reel.product.slug}`}
                  className="flex items-center justify-center gap-1 w-full bg-white text-brand-magenta text-[11px] font-bold py-1.5 rounded-lg hover:bg-brand-magenta hover:text-white transition-colors"
                >
                  <ShoppingBag size={11} /> Shop
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}