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

        const email = credentials.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            companyId: true,
            isPlatformAdmin: true,
          },
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        const userWithPassword = await prisma.user.findUnique({
          where: { email },
          select: { passwordHash: true },
        });

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          userWithPassword!.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          isPlatformAdmin: user.isPlatformAdmin,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.companyId = user.companyId;
        token.isPlatformAdmin = user.isPlatformAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.isPlatformAdmin = token.isPlatformAdmin;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
