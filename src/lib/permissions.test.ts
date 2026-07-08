import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import {
  Permissions,
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/permissions';

describe('Permissions constants', () => {
  it('contains all expected module permission keys', () => {
    expect(Permissions.VIEW_DASHBOARD).toBe('view_dashboard');
    expect(Permissions.MANAGE_PRODUCTS).toBe('manage_products');
    expect(Permissions.PROCESS_POS).toBe('process_pos');
    expect(Permissions.MANAGE_ACCOUNTING).toBe('manage_accounting');
    expect(Permissions.VIEW_REPORTS).toBe('view_reports');
    expect(Permissions.MANAGE_SUPPLIERS).toBe('manage_suppliers');
  });

  it('has unique values for all permission keys', () => {
    const values = Object.values(Permissions);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('PERMISSION_DEFINITIONS', () => {
  it('has an entry for every Permissions value', () => {
    const permissionValues = new Set(Object.values(Permissions));
    const definedKeys = new Set(PERMISSION_DEFINITIONS.map((d) => d.key));
    for (const val of permissionValues) {
      expect(definedKeys.has(val)).toBe(true);
    }
  });

  it('every definition has required fields', () => {
    for (const def of PERMISSION_DEFINITIONS) {
      expect(def.key).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.category).toBeTruthy();
    }
  });

  it('has valid categories', () => {
    const validCategories = [
      'dashboard', 'products', 'inventory', 'invoices', 'pos',
      'crm', 'bookings', 'work_orders', 'accounting', 'admin',
      'general', 'reports', 'suppliers',
    ];
    for (const def of PERMISSION_DEFINITIONS) {
      expect(validCategories).toContain(def.category);
    }
  });
});

describe('DEFAULT_ROLE_PERMISSIONS', () => {
  it('admin has all permissions', () => {
    const allKeys = PERMISSION_DEFINITIONS.map((p) => p.key);
    expect(DEFAULT_ROLE_PERMISSIONS.admin).toEqual(allKeys);
  });

  it('admin has more permissions than staff', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.admin.length).toBeGreaterThan(
      DEFAULT_ROLE_PERMISSIONS.staff.length
    );
  });

  it('staff has more permissions than viewer', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.staff.length).toBeGreaterThan(
      DEFAULT_ROLE_PERMISSIONS.viewer.length
    );
  });

  it('viewer only has view-level permissions', () => {
    for (const perm of DEFAULT_ROLE_PERMISSIONS.viewer) {
      expect(perm.startsWith('view_')).toBe(true);
    }
  });

  it('staff includes all viewer permissions', () => {
    const staffSet = new Set(DEFAULT_ROLE_PERMISSIONS.staff);
    for (const perm of DEFAULT_ROLE_PERMISSIONS.viewer) {
      expect(staffSet.has(perm)).toBe(true);
    }
  });

  it('staff includes manage permissions for operational modules', () => {
    const staffPerms = new Set(DEFAULT_ROLE_PERMISSIONS.staff);
    expect(staffPerms.has(Permissions.MANAGE_PRODUCTS)).toBe(true);
    expect(staffPerms.has(Permissions.MANAGE_INVENTORY)).toBe(true);
    expect(staffPerms.has(Permissions.MANAGE_INVOICES)).toBe(true);
    expect(staffPerms.has(Permissions.PROCESS_POS)).toBe(true);
  });

  it('viewer does not have manage permissions', () => {
    for (const perm of DEFAULT_ROLE_PERMISSIONS.viewer) {
      expect(perm).not.toContain('manage_');
    }
  });

  it('has entries for all three roles', () => {
    expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty('admin');
    expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty('staff');
    expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty('viewer');
  });
});
