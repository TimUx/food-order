import type { ModuleMenuItem } from './types';

class ModuleRegistryImpl {
  private menuItems: ModuleMenuItem[] = [];

  setMenuItems(items: ModuleMenuItem[]): void {
    this.menuItems = items.sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
  }

  getMenuItems(): ModuleMenuItem[] {
    return this.menuItems;
  }
}

export const moduleRegistry = new ModuleRegistryImpl();
