'use client';

import { useEffect } from 'react';

/**
 * Mounts existing markup + classic scripts during the Next.js migration.
 * Keeps production behavior while pages are rewritten into React components.
 */
export function LegacyShell({ html, scripts = [], className }) {
  useEffect(() => {
    let cancelled = false;
    const nodes = [];

    function loadSequential(list, i) {
      if (cancelled || i >= list.length) return;
      const src = list[i];
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => loadSequential(list, i + 1);
      s.onerror = () => {
        console.error('Failed to load', src);
        loadSequential(list, i + 1);
      };
      document.body.appendChild(s);
      nodes.push(s);
    }

    const t = window.setTimeout(() => loadSequential(scripts, 0), 0);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      nodes.forEach((n) => n.parentNode?.removeChild(n));
    };
  }, [scripts.join('|')]);

  return (
    <div
      className={className}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
