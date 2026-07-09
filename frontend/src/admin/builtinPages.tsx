import type { ReactNode } from 'react';
import { UsersPage } from '@/pages/admin/UsersPage';
import { EventsPage } from '@/pages/admin/EventsPage';
import { FoodItemsPage } from '@/pages/admin/FoodItemsPage';
import { FeatureModulesPage } from '@/pages/admin/FeatureModulesPage';
import { GenericReportPage } from '@/pages/admin/GenericReportPage';
import { GenericDeveloperPage } from '@/pages/admin/GenericDeveloperPage';
import { LegalAdminPage } from '@/pages/admin/LegalAdminPage';

type BuiltinPageComponent = () => ReactNode;

import { PaymentAdminPage } from '@/pages/admin/payment/PaymentAdminPage';

export const BUILTIN_PAGE_COMPONENTS: Record<string, BuiltinPageComponent> = {
  'core.users': () => <UsersPage />,
  'core.events': () => <EventsPage />,
  'core.food-items': () => <FoodItemsPage />,
  'core.modules': () => <FeatureModulesPage />,
};

export const REPORT_PAGE_COMPONENTS: Record<string, BuiltinPageComponent> = {
  'payment.admin': () => <PaymentAdminPage />,
  'legal.admin': () => <LegalAdminPage />,
};

export const DEVELOPER_PAGE_COMPONENTS: Record<string, BuiltinPageComponent> = {};

export function renderBuiltinPage(componentId?: string): ReactNode {
  if (!componentId) return null;
  const Page = BUILTIN_PAGE_COMPONENTS[componentId];
  return Page ? <Page /> : null;
}

export function renderReportPage(componentId?: string, meta?: { label?: string; description?: string }): ReactNode {
  if (!componentId) return null;
  const Page = REPORT_PAGE_COMPONENTS[componentId];
  if (Page) return <Page />;
  return <GenericReportPage label={meta?.label} description={meta?.description} />;
}

export function renderDeveloperPage(componentId?: string, meta?: { label?: string; description?: string }): ReactNode {
  if (!componentId) return null;
  const Page = DEVELOPER_PAGE_COMPONENTS[componentId];
  if (Page) return <Page />;
  return <GenericDeveloperPage label={meta?.label} description={meta?.description} componentId={componentId} />;
}
