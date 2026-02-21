'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, MessageSquare } from 'lucide-react';
import { ContactFormModal } from './ContactFormModal';

interface SwitchPageCTAProps {
  variant?: 'hero' | 'final';
}

export function SwitchPageCTA({ variant = 'hero' }: SwitchPageCTAProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === 'final') {
    return (
      <>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/signup"
            className="bg-white text-green-700 px-8 py-4 rounded-xl text-lg font-bold hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="h-5 w-5" />
            Start Your Free Trial Now
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-700 text-white border-2 border-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-green-800 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-5 w-5" />
            Talk to Our Team
          </button>
        </div>

        <ContactFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          source="SWITCH_PAGE_CTA"
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/signup"
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
        >
          <Zap className="h-5 w-5" />
          Start Free 14-Day Trial
        </Link>
        <Link
          href="/compare"
          className="bg-white border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
        >
          See Full Comparison
        </Link>
      </div>

      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        source="SWITCH_PAGE_HERO"
      />
    </>
  );
}
