import { useEffect } from 'react';

interface SellrMetaOptions {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

function setMetaTag(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSellrMeta({ title, description, image, url }: SellrMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;

    const fullTitle = `${title} | Sellr`;
    const ogImage = image ?? 'https://rekkrd.com/sellr-og.png';
    const ogUrl = url ?? window.location.href;

    document.title = fullTitle;

    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:url', ogUrl);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, image, url]);
}
