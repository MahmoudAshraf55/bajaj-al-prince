import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole, type UserRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { getRolePermissions } from '@/lib/permissions';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';

const rolePermissionSchema = z.object({
  role: z.enum(['admin', 'staff', 'viewer']),
  permissionKey: z.string().min(1),
  granted: z.boolean(),
});

export async function GET(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, 'admin');
  if (!rateLimit.allowed) return withSecurityHeaders(rateLimit.response!);

  try {
    return await withRole(req, ['admin'], async () => {

      const { searchParams } = new URL(req.url);
      const role = searchParams.get('role') as UserRole | null;

      if (!role || !['admin', 'staff', 'viewer'].includes(role)) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Missing or invalid role' }, { status: 400 }));
      }

      const [permissions, rolePermissions] = await Promise.all([
        prisma.permission.findMany({ where: { isDeleted: false }, orderBy: { name: 'asc' } }),
        getRolePermissions(role),
      ]);

      const data = permissions.map((p) => ({
        ...p,
        granted: rolePermissions.has(p.key),
      }));

      return withSecurityHeaders(NextResponse.json({ success: true, data }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, 'admin');
  if (!rateLimit.allowed) return withSecurityHeaders(rateLimit.response!);

  try {
    return await withRole(req, ['admin'], async () => {
      const body = await req.json();
      const { role, permissionKey, granted } = rolePermissionSchema.parse(body);

      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
      const permission = await prisma.permission.findUnique({
        where: { tenantId_key: { tenantId, key: permissionKey } },
      });

      if (!permission || permission.isDeleted) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Permission not found' }, { status: 404 }));
      }

      const existing = await prisma.rolePermission.findUnique({
        where: {
          role_permissionId: {
            role,
            permissionId: permission.id,
          },
        },
      });

      if (granted) {
        if (existing) {
          if (existing.isDeleted) {
            await prisma.rolePermission.update({
              where: { id: existing.id },
              data: { isDeleted: false, deletedAt: null },
            });
          }
        } else {
          await prisma.rolePermission.create({
            data: { role, permissionId: permission.id },
          });
        }
      } else if (existing && !existing.isDeleted) {
        await prisma.rolePermission.update({
          where: { id: existing.id },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }

      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
