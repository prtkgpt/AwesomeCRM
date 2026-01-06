import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from './auth';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
}

/**
 * Get authenticated user from either NextAuth session or Bearer token
 * This supports both web (session) and mobile (JWT) authentication
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // First try NextAuth session (for web requests)
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
      role: (session.user as any).role || '',
      companyId: (session.user as any).companyId || '',
    };
  }

  // Try Bearer token (for mobile requests)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev';
      const decoded = jwt.verify(token, secret) as AuthUser;
      return {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        companyId: decoded.companyId,
      };
    } catch (error) {
      console.error('Invalid Bearer token:', error);
      return null;
    }
  }

  return null;
}
