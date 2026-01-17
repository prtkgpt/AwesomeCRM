import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status badge with dot
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'error';
  label?: string;
  className?: string;
}

const statusConfig = {
  active: { color: 'bg-green-500', text: 'Active', variant: 'success' as const },
  inactive: { color: 'bg-gray-400', text: 'Inactive', variant: 'default' as const },
  pending: { color: 'bg-yellow-500', text: 'Pending', variant: 'warning' as const },
  completed: { color: 'bg-blue-500', text: 'Completed', variant: 'info' as const },
  cancelled: { color: 'bg-red-500', text: 'Cancelled', variant: 'error' as const },
  error: { color: 'bg-red-500', text: 'Error', variant: 'error' as const },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn('gap-1.5', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.color)} />
      {label || config.text}
    </Badge>
  );
}
