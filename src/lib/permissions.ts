import { prisma } from '@/lib/prisma';
import type { UserRole } from './auth';

/**
 * Granular permission keys for enterprise RBAC.
 * Keep this in sync with the `Permission` table seeded by prisma/seed.ts.
 */
export const Permissions = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',

  // Products & Inventory
  VIEW_PRODUCTS: 'view_products',
  MANAGE_PRODUCTS: 'manage_products',
  VIEW_INVENTORY: 'view_inventory',
  MANAGE_INVENTORY: 'manage_inventory',
  IMPORT_PRODUCTS: 'import_products',

  // POS & Invoices
  VIEW_INVOICES: 'view_invoices',
  MANAGE_INVOICES: 'manage_invoices',
  PROCESS_POS: 'process_pos',
  VIEW_POS_HISTORY: 'view_pos_history',

  // Customers & Vehicles
  VIEW_CUSTOMERS: 'view_customers',
  MANAGE_CUSTOMERS: 'manage_customers',
  VIEW_VEHICLES: 'view_vehicles',
  MANAGE_VEHICLES: 'manage_vehicles',

  // Bookings & Work Orders
  VIEW_BOOKINGS: 'view_bookings',
  MANAGE_BOOKINGS: 'manage_bookings',
  VIEW_WORK_ORDERS: 'view_work_orders',
  MANAGE_WORK_ORDERS: 'manage_work_orders',

  // Accounting
  VIEW_ACCOUNTING: 'view_accounting',
  MANAGE_ACCOUNTING: 'manage_accounting',
  MANAGE_ACCOUNTING_PERIODS: 'manage_accounting_periods',

  // Users & Settings
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_WHATSAPP: 'manage_whatsapp',
  UPLOAD_FILES: 'upload_files',

  // Reports
  VIEW_REPORTS: 'view_reports',

  // Suppliers (future feature)
  VIEW_SUPPLIERS: 'view_suppliers',
  MANAGE_SUPPLIERS: 'manage_suppliers',
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

export interface PermissionDefinition {
  key: PermissionKey;
  name: string;
  description: string;
  category: string;
}

/**
 * Human-readable definitions for seeding the Permission table.
 */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { key: Permissions.VIEW_DASHBOARD, name: 'View Dashboard', description: 'Access the admin dashboard', category: 'dashboard' },
  { key: Permissions.VIEW_PRODUCTS, name: 'View Products', description: 'View product catalog', category: 'products' },
  { key: Permissions.MANAGE_PRODUCTS, name: 'Manage Products', description: 'Create, update, and delete products', category: 'products' },
  { key: Permissions.VIEW_INVENTORY, name: 'View Inventory', description: 'View stock levels and movements', category: 'inventory' },
  { key: Permissions.MANAGE_INVENTORY, name: 'Manage Inventory', description: 'Adjust stock and perform inventory counts', category: 'inventory' },
  { key: Permissions.IMPORT_PRODUCTS, name: 'Import Products', description: 'Import products via Excel', category: 'products' },
  { key: Permissions.VIEW_INVOICES, name: 'View Invoices', description: 'View invoices and sales history', category: 'invoices' },
  { key: Permissions.MANAGE_INVOICES, name: 'Manage Invoices', description: 'Create, update, and cancel invoices', category: 'invoices' },
  { key: Permissions.PROCESS_POS, name: 'Process POS', description: 'Use the point-of-sale interface', category: 'pos' },
  { key: Permissions.VIEW_POS_HISTORY, name: 'View POS History', description: 'View POS transaction history', category: 'pos' },
  { key: Permissions.VIEW_CUSTOMERS, name: 'View Customers', description: 'View customer records', category: 'crm' },
  { key: Permissions.MANAGE_CUSTOMERS, name: 'Manage Customers', description: 'Create, update, and delete customers', category: 'crm' },
  { key: Permissions.VIEW_VEHICLES, name: 'View Vehicles', description: 'View vehicle records', category: 'crm' },
  { key: Permissions.MANAGE_VEHICLES, name: 'Manage Vehicles', description: 'Create, update, and delete vehicles', category: 'crm' },
  { key: Permissions.VIEW_BOOKINGS, name: 'View Bookings', description: 'View service bookings', category: 'bookings' },
  { key: Permissions.MANAGE_BOOKINGS, name: 'Manage Bookings', description: 'Create, update, and delete bookings', category: 'bookings' },
  { key: Permissions.VIEW_WORK_ORDERS, name: 'View Work Orders', description: 'View work orders', category: 'work_orders' },
  { key: Permissions.MANAGE_WORK_ORDERS, name: 'Manage Work Orders', description: 'Create, update, and delete work orders', category: 'work_orders' },
  { key: Permissions.VIEW_ACCOUNTING, name: 'View Accounting', description: 'View accounting summaries and transactions', category: 'accounting' },
  { key: Permissions.MANAGE_ACCOUNTING, name: 'Manage Accounting', description: 'Record manual transactions', category: 'accounting' },
  { key: Permissions.MANAGE_ACCOUNTING_PERIODS, name: 'Manage Accounting Periods', description: 'Open, close, and lock accounting periods', category: 'accounting' },
  { key: Permissions.MANAGE_USERS, name: 'Manage Users', description: 'Create and manage system users', category: 'admin' },
  { key: Permissions.MANAGE_SETTINGS, name: 'Manage Settings', description: 'Modify application settings', category: 'admin' },
  { key: Permissions.MANAGE_WHATSAPP, name: 'Manage WhatsApp', description: 'Configure WhatsApp templates and reminders', category: 'admin' },
  { key: Permissions.UPLOAD_FILES, name: 'Upload Files', description: 'Upload images and documents', category: 'general' },
  { key: Permissions.VIEW_REPORTS, name: 'View Reports', description: 'Access business reports', category: 'reports' },
  { key: Permissions.VIEW_SUPPLIERS, name: 'View Suppliers', description: 'View supplier records', category: 'suppliers' },
  { key: Permissions.MANAGE_SUPPLIERS, name: 'Manage Suppliers', description: 'Create, update, and delete suppliers', category: 'suppliers' },
];

/**
 * Default role-to-permission mapping.
 * Used during seeding and as a fallback if the database is unreachable.
 */
/**
 * Loads the effective permission keys for a role from the database.
 * Falls back to DEFAULT_ROLE_PERMISSIONS if the DB is unreachable.
 */
export async function getRolePermissions(role: UserRole): Promise<Set<string>> {
  try {
    const permissions = await prisma.permission.findMany({
      where: { isDeleted: false },
      select: { id: true, key: true },
    });

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role, isDeleted: false },
      select: { permissionId: true },
    });

    if (rolePermissions.length === 0) {
      return new Set(DEFAULT_ROLE_PERMISSIONS[role]);
    }

    const grantedPermissionIds = new Set(rolePermissions.map((rp) => rp.permissionId));
    const grantedKeys = permissions
      .filter((p) => grantedPermissionIds.has(p.id))
      .map((p) => p.key);

    return new Set(grantedKeys);
  } catch {
    return new Set(DEFAULT_ROLE_PERMISSIONS[role]);
  }
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: PERMISSION_DEFINITIONS.map((p) => p.key),
  staff: [
    Permissions.VIEW_DASHBOARD,
    Permissions.VIEW_PRODUCTS,
    Permissions.MANAGE_PRODUCTS,
    Permissions.VIEW_INVENTORY,
    Permissions.MANAGE_INVENTORY,
    Permissions.IMPORT_PRODUCTS,
    Permissions.VIEW_INVOICES,
    Permissions.MANAGE_INVOICES,
    Permissions.PROCESS_POS,
    Permissions.VIEW_POS_HISTORY,
    Permissions.VIEW_CUSTOMERS,
    Permissions.MANAGE_CUSTOMERS,
    Permissions.VIEW_VEHICLES,
    Permissions.MANAGE_VEHICLES,
    Permissions.VIEW_BOOKINGS,
    Permissions.MANAGE_BOOKINGS,
    Permissions.VIEW_WORK_ORDERS,
    Permissions.MANAGE_WORK_ORDERS,
    Permissions.VIEW_ACCOUNTING,
    Permissions.MANAGE_ACCOUNTING,
    Permissions.UPLOAD_FILES,
    Permissions.VIEW_REPORTS,
    Permissions.VIEW_SUPPLIERS,
    Permissions.MANAGE_SUPPLIERS,
  ],
  viewer: [
    Permissions.VIEW_DASHBOARD,
    Permissions.VIEW_PRODUCTS,
    Permissions.VIEW_INVENTORY,
    Permissions.VIEW_INVOICES,
    Permissions.VIEW_POS_HISTORY,
    Permissions.VIEW_CUSTOMERS,
    Permissions.VIEW_VEHICLES,
    Permissions.VIEW_BOOKINGS,
    Permissions.VIEW_WORK_ORDERS,
    Permissions.VIEW_ACCOUNTING,
    Permissions.VIEW_REPORTS,
    Permissions.VIEW_SUPPLIERS,
  ],
};
