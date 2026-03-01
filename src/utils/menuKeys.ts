import menuData, { MenuSection } from '../data/menuData';

/**
 * Menu key format: "SectionHeader/ItemTitle"
 * e.g. "Inventory/Products", "Sales/POS", "User Management/Users"
 *
 * Admin role always has full access (bypasses checks).
 */

interface MenuKeyInfo {
  key: string;
  title: string;
  sectionHeader: string;
  paths: string[]; // all paths under this top-level item (leaf + child paths)
}

/** Recursively collect all paths from a menu item */
function collectPaths(item: { path?: string; children?: any[] }): string[] {
  const paths: string[] = [];
  if (item.path && item.path !== '#') paths.push(item.path);
  if (item.children) {
    for (const child of item.children) {
      paths.push(...collectPaths(child));
    }
  }
  return paths;
}

/** Extract all top-level menu items with their keys and contained paths */
export function getAllMenuKeys(): MenuKeyInfo[] {
  const result: MenuKeyInfo[] = [];
  for (const section of menuData) {
    for (const item of section.items) {
      const key = `${section.header}/${item.title}`;
      const paths = collectPaths(item as any);
      result.push({
        key,
        title: item.title,
        sectionHeader: section.header,
        paths,
      });
    }
  }
  return result;
}

/** Group menu keys by section header */
export function getMenuKeysBySection(): { header: string; items: { key: string; title: string }[] }[] {
  const sections: { header: string; items: { key: string; title: string }[] }[] = [];
  for (const section of menuData) {
    const items = section.items.map((item) => ({
      key: `${section.header}/${item.title}`,
      title: item.title,
    }));
    sections.push({ header: section.header, items });
  }
  return sections;
}

/** Build a map from path → menuKey for route-level permission checks */
export function buildPathToKeyMap(): Record<string, string> {
  const map: Record<string, string> = {};
  const allKeys = getAllMenuKeys();
  for (const mk of allKeys) {
    for (const p of mk.paths) {
      map[p] = mk.key;
    }
  }
  return map;
}

/**
 * Given a set of allowed menu keys, filter menuData sections.
 * Returns a new array of sections with only allowed top-level items.
 * If allowedKeys includes "*", returns everything (Admin).
 */
export function filterMenuDataByKeys(allowedKeys: Set<string>): MenuSection[] {
  if (allowedKeys.has('*')) return menuData;

  return menuData
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const key = `${section.header}/${item.title}`;
        return allowedKeys.has(key);
      }),
    }))
    .filter((section) => section.items.length > 0);
}
