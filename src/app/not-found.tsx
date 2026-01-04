import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white">404</h2>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          Page Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          The page you're looking for doesn't exist.
        </p>
        <Link href="/dashboard">
          <Button>
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
