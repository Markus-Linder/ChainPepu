import { useEffect } from "react";

/** Sets document title and meta description per page (no extra dependency). */
export function useSeo(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    let m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = description;
  }, [title, description]);
}
