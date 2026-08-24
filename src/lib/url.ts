/**
 * Prefix a site-relative path with the configured base.
 * Every internal href and asset src must go through this, otherwise
 * links break under the /GIRB/ subpath on GitHub Pages.
 */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}/${path}`.replace(/\/{2,}/g, '/');
}
