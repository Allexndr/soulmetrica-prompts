'use client';

export function ThemeBoot() {
  // Default: light. Only apply dark if user explicitly saved it.
  const code = `(function(){try{var t=localStorage.getItem('veluna-theme');document.documentElement.setAttribute('data-theme',(t==='dark'||t==='light')?t:'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
