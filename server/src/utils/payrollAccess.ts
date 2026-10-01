import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import { UnauthorizedError, ForbiddenError } from './errors.js';

/** Department names like "Accounts", "Account", "Accounts & Finance" count as Accounts. */
export function isAccountsDepartment(department: string | null | undefined): boolean {
    return Boolean(department && /\baccounts?\b/i.test(department));
}

/**
 * Whether a user may upload payroll sheets: always for HR; otherwise only an active user
 * HR has explicitly granted access to, who is (still) in the Accounts department. The
 * department is re-checked on every call, so moving someone out of Accounts revokes access.
 */
export async function canUserImportPayroll(userId: number, role: string): Promise<boolean> {
    if (role === 'HR') return true;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true, canImportPayroll: true, employee: { select: { department: true, isActive: true } } },
    });

    return Boolean(user && hasPayrollImportAccess(user));
}

/** Same rule as canUserImportPayroll, for callers that already loaded the user (no extra query). */
export function hasPayrollImportAccess(user: {
    role: string;
    isActive: boolean;
    canImportPayroll: boolean;
    employee: { department: string | null; isActive: boolean } | null;
}): boolean {
    if (user.role === 'HR') return true;
    return Boolean(
        user.isActive &&
        user.canImportPayroll &&
        user.employee?.isActive &&
        isAccountsDepartment(user.employee.department)
    );
}

/** Route guard for the payroll import endpoints (HR + delegated Accounts staff). */
export async function authorizePayrollImport(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.user) throw new UnauthorizedError('Authentication required');
        if (!(await canUserImportPayroll(req.user.userId, req.user.role))) {
            throw new ForbiddenError('You do not have permission to upload payroll data');
        }
        next();
    } catch (error) {
        next(error);
    }
}
