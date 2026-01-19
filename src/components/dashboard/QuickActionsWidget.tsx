'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Calendar,
  FileText,
  Users,
  BarChart3,
  Receipt,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'new-job',
    label: 'New Job',
    href: '/jobs/new',
    icon: <Plus className="h-5 w-5" />,
    color: 'from-blue-500 to-blue-600',
    description: 'Schedule a cleaning',
  },
  {
    id: 'new-client',
    label: 'New Client',
    href: '/clients/new',
    icon: <Users className="h-5 w-5" />,
    color: 'from-green-500 to-green-600',
    description: 'Add new customer',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    icon: <Calendar className="h-5 w-5" />,
    color: 'from-purple-500 to-purple-600',
    description: 'View schedule',
  },
  {
    id: 'estimate',
    label: 'Estimate',
    href: '/estimates/new',
    icon: <FileText className="h-5 w-5" />,
    color: 'from-orange-500 to-orange-600',
    description: 'Create quote',
  },
  {
    id: 'invoice',
    label: 'Invoice',
    href: '/invoices/new',
    icon: <Receipt className="h-5 w-5" />,
    color: 'from-emerald-500 to-emerald-600',
    description: 'Send invoice',
  },
  {
    id: 'team',
    label: 'Team',
    href: '/team',
    icon: <Users className="h-5 w-5" />,
    color: 'from-pink-500 to-pink-600',
    description: 'Manage cleaners',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'from-cyan-500 to-cyan-600',
    description: 'View analytics',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
    color: 'from-gray-500 to-gray-600',
    description: 'Company config',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
};

export function QuickActionsWidget() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Quick Actions
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            One-tap access to common tasks
          </p>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 sm:grid-cols-8 gap-3"
      >
        {quickActions.map((action) => (
          <motion.div key={action.id} variants={itemVariants}>
            <Link href={action.href}>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
              >
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-md group-hover:shadow-lg transition-shadow`}
                >
                  <span className="text-white">{action.icon}</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {action.label}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:block">
                    {action.description}
                  </p>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </Card>
  );
}
