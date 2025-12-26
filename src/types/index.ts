import { Booking, Client, Address, Message, MessageTemplate, User } from '@prisma/client';

// Extended types with relations
export type ClientWithAddresses = Client & {
  addresses: Address[];
};

export type ClientWithRelations = Client & {
  addresses: Address[];
  bookings: Booking[];
};

export type BookingWithRelations = Booking & {
  client: Client;
  address: Address;
};

export type BookingWithMessages = Booking & {
  client: Client;
  address: Address;
  messages: Message[];
};

// Calendar types
export type CalendarView = 'day' | 'week';

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  booking: BookingWithRelations;
};

export type TimeSlot = {
  time: string;
  hour: number;
  bookings: BookingWithRelations[];
};

// Report types
export type ReportPeriod = 'week' | 'month' | 'year';

export type ReportData = {
  revenue: number;
  completedJobs: number;
  unpaidAmount: number;
  upcomingJobs: number;
  period: ReportPeriod;
};

// API Response types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Booking conflict type
export type BookingConflict = {
  bookingId: string;
  overlaps: string[]; // Array of overlapping booking IDs
};

// Message template variables
export type MessageVariables = {
  clientName: string;
  date: string;
  time: string;
  price: string;
  address: string;
  businessName?: string;
};

// NextAuth extension
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
  }
}
