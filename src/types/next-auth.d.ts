import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'OWNER' | 'ADMIN' | 'CLEANER' | 'CUSTOMER';
      companyId: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'OWNER' | 'ADMIN' | 'CLEANER' | 'CUSTOMER';
    companyId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'OWNER' | 'ADMIN' | 'CLEANER' | 'CUSTOMER';
    companyId: string;
  }
}
