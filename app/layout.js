import './globals.css';
import Script from 'next/script';
import { Playfair_Display, Poppins } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/components/CartContext';
import { WishlistProvider } from '@/components/WhishlistContext';
import BottomNav from '@/components/BottomNav';
import MetaPixelPageView from '@/components/MetaPixelPageView';
import { dbConnect } from '@/lib/mongodb';
import Settings from '@/models/Settings';

const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700', '800'] });
const body = Poppins({ subsets: ['latin'], variable: '--font-body', weight: ['300', '400', '500', '600', '700'] });

export async function generateMetadata() {
  let settings = null;
  try {
    await dbConnect();
    settings = await Settings.findOne({ key: 'global' });
  } catch {
    settings = null;
  }
  const title = settings?.seoTitle || 'Lakshmibala Clothing Store - Women Kurtis, Innerwear & More';
  const description =
    settings?.seoDescription ||
    'Shop trendy women kurtis, rayon umbrella kurtis, side open kurtis, nighties, 2 piece sets and innerwear online from Lakshmibala Clothing Store, Sivakasi, Tamil Nadu.';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lakshmibala.in';
  return {
    title: { default: title, template: '%s | Lakshmibala Clothing Store' },
    description,
    metadataBase: new URL(siteUrl),
    keywords: ['women kurtis online', 'umbrella kurti', 'side open kurti', 'nighties online', 'innerwear online', 'Sivakasi clothing store'],
    openGraph: { title, description, siteName: 'Lakshmibala Clothing Store', type: 'website' },
    icons: { icon: '/favicon.ico' }
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-body antialiased bg-brand-cream`}>
        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '2154891555383303');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=2154891555383303&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}

        <MetaPixelPageView />

        <CartProvider>
          <WishlistProvider>
            {children}

            {/* spacer so page content isn't hidden behind the fixed mobile nav */}
            <div className="md:hidden h-16" />

            <BottomNav />
          </WishlistProvider>
        </CartProvider>

        <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'var(--font-body)' } }} />
      </body>
    </html>
  );
}