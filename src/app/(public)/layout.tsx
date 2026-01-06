import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feedback - AwesomeCRM',
  description: 'Rate your cleaning service and provide feedback',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
