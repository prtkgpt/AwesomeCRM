export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const COLORS = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
};

export const JOB_STATUS_COLORS = {
  SCHEDULED: COLORS.primary,
  COMPLETED: COLORS.success,
  CANCELLED: COLORS.gray[400],
  NO_SHOW: COLORS.danger,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
};
