import {
  BaseModule,
  type ModuleMenuItem,
  type ModulePermissionDefinition,
  type FeatureContext,
} from '../../src/module-system/types';

export interface StubModuleOptions {
  id: string;
  name: string;
  version?: string;
  description: string;
  author?: string;
  permissions?: ModulePermissionDefinition[];
  menuItems?: ModuleMenuItem[];
}

export function createStubModule(options: StubModuleOptions) {
  return class extends BaseModule {
    readonly id = options.id;
    readonly name = options.name;
    readonly version = options.version ?? '0.1.0';
    readonly description = options.description;
    readonly author = options.author ?? 'FestManager';

    registerPermissions(_context: FeatureContext): ModulePermissionDefinition[] {
      return options.permissions ?? [];
    }

    registerMenus(_context: FeatureContext): ModuleMenuItem[] {
      return options.menuItems ?? [];
    }
  };
}
