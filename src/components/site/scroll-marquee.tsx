"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A full-width row of cards that slides to the right as the page scrolls down (and back
 * as it scrolls up). The set of cards is repeated three times so the row never shows an
 * empty edge; the copies are hidden from screen readers and keyboard focus.
 *
 * The movement is tied to how far the row has travelled through the viewport and eased
 * towards that position every frame, so it glides instead of jumping with each wheel step.
 * With reduced motion the row stays still.
 */
export function ScrollMarquee({ children, dir }: { children: ReactNode; dir: "ltr" | "rtl" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const row = track.current;
    if (!el || !row) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let current = Number.NaN;
    let target = 0;
    let frame = 0;
    let visible = false;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the row enters at the bottom, 1 when it leaves at the top
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      const setWidth = row.scrollWidth / 3;
      const travel = Math.min(setWidth * 0.9, Math.max(320, window.innerWidth * 0.55));
      // start one set in, so there are cards on both sides; scrolling down moves it right
      target = -setWidth + (p - 0.5) * travel;
    };

    const tick = () => {
      frame = 0;
      current = Number.isNaN(current) ? target : current + (target - current) * 0.12;
      if (Math.abs(target - current) < 0.1) current = target;
      row.style.transform = `translate3d(${current.toFixed(2)}px,0,0)`;
      if (current !== target && visible) frame = requestAnimationFrame(tick);
    };

    const update = () => {
      measure();
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) update();
    });
    io.observe(el);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    // The row is laid out left to right in both languages (an RTL parent would pin the wide
    // track to its right edge and push it off screen); each copy keeps the page direction.
    <div ref={wrap} dir="ltr" className="relative overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <div ref={track} className="flex w-max will-change-transform" style={{ transform: "translateX(calc(-100% / 3))" }}>
        {[0, 1, 2].map((copy) => (
          <div key={copy} dir={dir} className="flex shrink-0 gap-3 pe-3 sm:gap-4 sm:pe-4" aria-hidden={copy !== 1 || undefined} inert={copy !== 1}>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
