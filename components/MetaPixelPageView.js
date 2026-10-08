'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MetaPixelPageView() {
  const pathname = usePathname();

  useEffect(() => {
    let tries = 0;
    const fire = () => {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'PageView');
      } else if (tries < 20) {
        tries += 1;
        setTimeout(fire, 250);
      }
    };
    fire();
  }, [pathname]);

  return null;
}