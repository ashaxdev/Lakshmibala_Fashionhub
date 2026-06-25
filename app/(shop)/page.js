export const dynamic = 'force-dynamic';
import { dbConnect } from '@/lib/mongodb';
import Banner from '@/models/Banner';
import Product from '@/models/Product';
import Review from '@/models/Review';
import Reel from '@/models/Reel';
import Combo from '@/models/Combo';
import Category from '@/models/Category';
import BannerCarousel from '@/components/BannerCarousel';
import ProductTabs from '@/components/ProductCarousel';
import ReviewSection from '@/components/ReviewSection';
import ReelsSection from '@/components/ReelsSection';

import Link from 'next/link';
import Image from 'next/image';
import { formatINR } from '@/lib/utils';
import { Zap, ArrowRight, Tag } from 'lucide-react';

async function getData() {
  await dbConnect();
  const [banners, bestSellers, topSellers, activeSellers, reviews, reels, combos, categories] = await Promise.all([
    Banner.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
    Product.find({ isActive: true, isBestSeller: true }).limit(12).lean(),
    Product.find({ isActive: true, isTopSeller: true }).limit(12).lean(),
    Product.find({ isActive: true, isActiveSeller: true }).sort({ createdAt: -1 }).limit(12).lean(),
    Review.find({ isApproved: true, isFeatured: true }).populate('product', 'name').limit(10).lean(),
    Reel.find({ isActive: true }).sort({ sortOrder: 1 }).populate('product', 'name slug').limit(10).lean(),
    Combo.find({ isActive: true }).limit(6).lean(),
    Category.find({ isActive: true }).limit(10).lean(),
  ]);
  return { banners, bestSellers, topSellers, activeSellers, reviews, reels, combos, categories };
}

export default async function HomePage() {
  const { banners, bestSellers, topSellers, activeSellers, reviews, reels, combos, categories } = await getData();
  const plainCombos = JSON.parse(JSON.stringify(combos));
  const plainCategories = JSON.parse(JSON.stringify(categories));

  return (
    <div className="overflow-x-hidden">

      {/* Coupon marquee */}
      

      {/* Banner */}
      <BannerCarousel banners={JSON.parse(JSON.stringify(banners))} />

      {/* Shop by Category */}
{plainCategories?.length > 0 && (
  <section className="max-w-7xl mx-auto px-4 pt-8 pb-2">
    <h2 className="font-display text-xl font-bold text-brand-ink mb-4 text-center">Shop by Category</h2>
    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 justify-center flex-wrap sm:flex-nowrap">
      {plainCategories.map((c) => (
        <Link key={c._id} href={`/category/${c.slug}`} className="flex flex-col items-center gap-2 shrink-0 group">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-brand-cream border-2 border-transparent group-hover:border-brand-magenta transition-all shadow-sm">
            {c.image
              ? <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              : <div className="w-full h-full bg-brand-cream" />
            }
          </div>
          <span className="text-[11px] font-medium text-brand-ink/60 group-hover:text-brand-magenta transition-colors text-center max-w-[72px] leading-tight">{c.name}</span>
        </Link>
      ))}
    </div>
  </section>
)}

      {/* Product tabs — Bestsellers / Top Sellers / New Arrivals */}
      <ProductTabs
        bestSellers={JSON.parse(JSON.stringify(bestSellers))}
        topSellers={JSON.parse(JSON.stringify(topSellers))}
        activeSellers={JSON.parse(JSON.stringify(activeSellers))}
      />

      {/* Combo Offers */}
{plainCombos?.length > 0 && (
  <section className="py-10 bg-gradient-to-br from-brand-magenta/5 via-white to-brand-pink/5">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={14} className="text-brand-magenta fill-brand-magenta" />
          <span className="text-xs font-bold text-brand-magenta uppercase tracking-widest">Save More</span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-ink">Combo Offers</h2>
        <p className="text-brand-ink/50 text-sm mt-0.5">Buy together, save together</p>
        <Link href="/combos" className="hidden sm:flex items-center gap-1 text-sm text-brand-magenta font-semibold hover:gap-2 transition-all mt-2">
          View all <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
        {plainCombos.map((c, idx) => {
          const savings = c.originalPrice > c.comboPrice ? c.originalPrice - c.comboPrice : 0;
          const pct = c.originalPrice > 0 ? Math.round((savings / c.originalPrice) * 100) : 0;
          const isFeatured = idx === 0;

          return (
            <Link
              key={c._id}
              href={`/combo/${c.slug}`}
              className={`group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isFeatured ? 'sm:col-span-1 row-span-1' : ''}`}
            >
              {/* Image */}
              <div className={`relative w-full overflow-hidden bg-brand-cream ${isFeatured ? 'aspect-[4/5]' : 'aspect-square'}`}>
                {c.image && (
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                {pct > 0 && (
                  <div className="absolute top-2 left-2 bg-brand-magenta text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Tag size={9} /> {pct}% OFF
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>

              {/* Info */}
              <div className="p-3 bg-white">
                <p className="text-sm font-semibold text-brand-ink line-clamp-1">{c.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-brand-magenta font-bold text-sm">{formatINR(c.comboPrice)}</span>
                  {savings > 0 && (
                    <span className="text-[11px] text-brand-ink/40 line-through">{formatINR(c.originalPrice)}</span>
                  )}
                </div>
                {savings > 0 && (
                  <p className="text-[11px] text-green-600 font-semibold mt-0.5">Save {formatINR(savings)}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 text-center sm:hidden">
        <Link href="/combo" className="text-sm text-brand-magenta font-semibold">View all combos →</Link>
      </div>
    </div>
  </section>
)}

      {/* Reviews */}
      <ReviewSection reviews={JSON.parse(JSON.stringify(reviews))} />

      {/* Reels */}
      <ReelsSection reels={JSON.parse(JSON.stringify(reels))} />

      {/* Brand strip */}
      {/* <section className="bg-gradient-to-br from-brand-magenta to-brand-pink py-10 mt-4">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
            Sivakasi's own clothing store, now online
          </h2>
          <p className="text-white/80 text-sm">
            Women's kurtis, salwar sets, nighties and innerwear — handpicked and shipped across India.
          </p>
          <Link href="/category/salwar-set" className="inline-block mt-5 bg-white text-brand-magenta font-bold px-6 py-2.5 rounded-full text-sm hover:bg-white/90 transition-colors">
            Shop Now
          </Link>
        </div>
      </section> */}

    </div>
  );
}