// ============================================
// CleanDayCRM - Authentication Configuration
// ============================================

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            companyId: true,
            avatar: true,
            theme: true,
            isActive: true,
            isVerified: true,
            passwordHash: true,
          },
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          throw new Error('Your account has been deactivated. Please contact support.');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        // Update last login time
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          avatar: user.avatar,
          theme: user.theme || 'system',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.avatar = (user as any).avatar;
        token.theme = (user as any).theme;
      }

      // Handle session updates (e.g., theme change)
      if (trigger === 'update' && session) {
        if (session.theme) token.theme = session.theme;
        if (session.firstName) token.firstName = session.firstName;
        if (session.lastName) token.lastName = session.lastName;
        if (session.avatar) token.avatar = session.avatar;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.firstName = token.firstName as string | null;
        session.user.lastName = token.lastName as string | null;
        session.user.role = token.role as 'OWNER' | 'ADMIN' | 'CLEANER' | 'CLIENT';
        session.user.companyId = token.companyId as string;
        session.user.avatar = token.avatar as string | null;
        session.user.theme = token.theme as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Log successful sign in for audit
      console.log(`User signed in: ${user.email}`);
    },
    async signOut({ token }) {
      // Log sign out for audit
      console.log(`User signed out: ${token?.email}`);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

/**
 * Generate a unique referral code for a client
 */
export function generateReferralCode(firstName: string): string {
  const prefix = firstName.toUpperCase().substring(0, 4).padEnd(4, 'X');
  const suffix = generateToken(6).toUpperCase();
  return `${prefix}-${suffix}`;
}

/**
 * Generate a unique booking number
 */
export function generateBookingNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateToken(4).toUpperCase();
  return `BK-${timestamp}-${random}`;
}

/**
 * Generate a unique invoice number
 */
export function generateInvoiceNumber(companySlug: string): string {
  const prefix = companySlug.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `INV-${prefix}-${timestamp}`;
}

/**
 * Generate a unique gift card code
 */
export function generateGiftCardCode(): string {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(generateToken(4).toUpperCase());
  }
  return segments.join('-');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if user has required role
 */
export function hasRole(
  userRole: string,
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user can access a resource based on role hierarchy
 */
export function canAccess(
  userRole: string,
  minimumRole: 'OWNER' | 'ADMIN' | 'CLEANER' | 'CLIENT'
): boolean {
  const roleHierarchy = {
    OWNER: 4,
    ADMIN: 3,
    CLEANER: 2,
    CLIENT: 1,
  };

  return (roleHierarchy[userRole as keyof typeof roleHierarchy] || 0) >= roleHierarchy[minimumRole];
}
