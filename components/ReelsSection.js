'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Instagram, ShoppingBag, X, Volume2, VolumeX } from 'lucide-react';

export default function ReelsSection({ reels }) {
  const [activeReel, setActiveReel] = useState(null);
  const [muted, setMuted] = useState(true);

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
          <div
            key={reel._id}
            onClick={() => setActiveReel(reel)}
            className="relative min-w-[145px] sm:min-w-[175px] aspect-[9/16] rounded-2xl overflow-hidden shrink-0 group shadow-md cursor-pointer bg-brand-cream"
          >
            {reel.videoUrl ? (
              <video
                src={reel.videoUrl}
                poster={reel.thumbnail || undefined}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <img
                src={reel.thumbnail || '/placeholder.png'}
                alt={reel.title || 'Reel'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20 pointer-events-none" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play size={16} className="fill-brand-magenta text-brand-magenta ml-0.5" />
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-2.5">
              {reel.product?.name && (
                <p className="text-white text-[11px] font-medium line-clamp-1 mb-1.5">{reel.product.name}</p>
              )}
              {reel.product?.slug && (
                <Link
                  href={`/product/${reel.product.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1 w-full bg-white text-brand-magenta text-[11px] font-bold py-1.5 rounded-lg hover:bg-brand-magenta hover:text-white transition-colors"
                >
                  <ShoppingBag size={11} /> Shop
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Full player modal on click — larger, with sound toggle */}
      {activeReel && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveReel(null)}
        >
          <div
            className="relative w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              key={activeReel._id}
              src={activeReel.videoUrl}
              poster={activeReel.thumbnail}
              autoPlay
              loop
              muted={muted}
              playsInline
              controls={false}
              className="w-full h-full object-cover"
            />

            <button
              onClick={() => setActiveReel(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <button
              onClick={() => setMuted((m) => !m)}
              className="absolute top-3 left-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              {activeReel.product?.name && (
                <p className="text-white text-sm font-medium mb-2">{activeReel.product.name}</p>
              )}
              <div className="flex gap-2">
                {activeReel.product?.slug && (
                  <Link
                    href={`/product/${activeReel.product.slug}`}
                    className="flex-1 flex items-center justify-center gap-1 bg-white text-brand-magenta text-xs font-bold py-2 rounded-lg hover:bg-brand-magenta hover:text-white transition-colors"
                  >
                    <ShoppingBag size={12} /> Shop this
                  </Link>
                )}
                {activeReel.instagramLink && (
                  
                   <a href={activeReel.instagramLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 px-3 bg-white/10 text-white text-xs font-bold py-2 rounded-lg border border-white/30 hover:bg-white/20 transition-colors"
                  >
                    <Instagram size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}