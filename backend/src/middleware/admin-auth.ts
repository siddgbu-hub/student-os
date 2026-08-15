import { Context, Next } from 'hono';
import { AdminRepository } from '../db/admin.repository.js';
import type { Env } from '../index.js';

export interface AdminContextVariables {
  accountId: string;
  sessionId: string;
  deviceId: string;
  adminRole?: string;
  adminPermissions?: string[];
}

/**
 * Middleware that enforces server-side database-backed RBAC permission checks.
 * Must run AFTER createAuthMiddleware.
 */
export function requireAdminPermission(permission: string) {
  return async function (
    c: Context<{
      Bindings: Env;
      Variables: AdminContextVariables;
    }>,
    next: Next
  ) {
    const accountId = c.get('accountId');

    if (!accountId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required before admin permission evaluation.',
          },
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const repo = new AdminRepository(c.env.DB);
    const adminRole = await repo.getAdminRole(accountId);

    if (!adminRole) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin privileges required for this action.',
          },
          timestamp: new Date().toISOString(),
        },
        403
      );
    }

    const hasWildcard = adminRole.permissions.includes('*');
    const hasExplicitPermission = adminRole.permissions.includes(permission);

    if (!hasWildcard && !hasExplicitPermission) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Required permission not granted: ${permission}`,
          },
          timestamp: new Date().toISOString(),
        },
        403
      );
    }

    // Attach role and permissions to Hono request context
    c.set('adminRole', adminRole.role);
    c.set('adminPermissions', adminRole.permissions);

    await next();
  };
}
