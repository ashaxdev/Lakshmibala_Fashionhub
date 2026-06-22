'use client';

import { useEffect, useRef } from 'react';

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // 4 beeps, each 400ms apart
  [0, 0.4, 0.8, 1.2].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0.8, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.25);
  });
}

export default function NewOrderListener() {
  const prevCountRef = useRef(null);

  useEffect(() => {
    async function checkOrders() {
      try {
        const res = await fetch('/api/orders?limit=1&page=1');
        if (!res.ok) return;
        const data = await res.json();

        const currentCount = data.total; // ✅ use total count, not latest ID

        if (prevCountRef.current === null) {
          // First load — store silently
          prevCountRef.current = currentCount;
          return;
        }

        const newOrders = currentCount - prevCountRef.current;

        if (newOrders > 0) {
          prevCountRef.current = currentCount;

          // Beep once per new order
          for (let i = 0; i < newOrders; i++) {
            setTimeout(() => playBeep(), i * 600);
          }
        }
      } catch (err) {
        console.error('Order poll failed:', err);
      }
    }

    checkOrders();
    const interval = setInterval(checkOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  return null;
}