'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function BannerCarousel({ banners }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!banners?.length) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [banners]);

  if (!banners?.length) return null;

  return (
    <section className="relative w-full h-[50vw] min-h-[220px] max-h-[580px] overflow-hidden bg-brand-cream">
      {banners.map((b, i) => (
        <div
          key={b._id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Full-cover image — no aspect ratio box, fills 100% width & height */}
          <Image
            src={b.image}
            alt={b.title || 'Banner'}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover object-center"
          />

          {/* Overlay + text */}
          {(b.title || b.subtitle || b.link) && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent flex flex-col justify-center px-6 sm:px-16">
              {b.title && (
                <h2 className="text-white font-display text-xl sm:text-4xl font-bold max-w-xs sm:max-w-md drop-shadow-md">
                  {b.title}
                </h2>
              )}
              {b.subtitle && (
                <p className="text-white/90 mt-1.5 max-w-xs sm:max-w-sm text-xs sm:text-base drop-shadow">
                  {b.subtitle}
                </p>
              )}
              {b.link && (
                <Link
                  href={b.link}
                  className="mt-4 w-fit bg-white text-brand-magenta font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-lg hover:bg-brand-magenta hover:text-white transition-colors"
                >
                  {b.buttonText || 'Shop Now'}
                </Link>
              )}
            </div>
          )}
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white p-1.5 sm:p-2 rounded-full shadow transition"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white p-1.5 sm:p-2 rounded-full shadow transition"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`rounded-full transition-all ${i === index ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}