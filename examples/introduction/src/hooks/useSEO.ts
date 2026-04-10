import { useEffect } from "react";

export interface SEOOptions {
  title: string;
  description: string;
}

const BASE_URL = "https://react-virtual-engine.vercel.app";
const OG_IMAGE = `${BASE_URL}/og-image.png`;

const setMeta = (selector: string, attr: string, value: string) => {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    const [attrName, attrVal] = selector.match(/\[(.+?)="(.+?)"\]/)!.slice(1);
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

export const useSEO = ({ title, description }: SEOOptions) => {
  useEffect(() => {
    const fullTitle = `${title} | React Virtual Engine`;
    const pageUrl = `${BASE_URL}${window.location.pathname}`;

    // Primary
    document.title = fullTitle;
    setMeta('meta[name="description"]', "content", description);

    // Open Graph
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", pageUrl);
    setMeta('meta[property="og:image"]', "content", OG_IMAGE);

    // Twitter Card
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:url"]', "content", pageUrl);
    setMeta('meta[name="twitter:image"]', "content", OG_IMAGE);
  }, [title, description]);
};
