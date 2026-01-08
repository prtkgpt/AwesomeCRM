export function PageFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      label: 'Support',
      href: 'mailto:support@cleandaycrm.com',
    },
    {
      label: 'New Updates',
      href: 'https://www.cleandaycrm.com/product-release',
      external: true,
    },
    {
      label: 'Terms of Service',
      href: '/terms',
    },
    {
      label: 'Privacy Policy',
      href: '/privacy',
    },
  ];

  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4 px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
        {footerLinks.map((link, index) => (
          <span key={link.label} className="flex items-center gap-x-6">
            <a
              href={link.href}
              {...(link.external && {
                target: '_blank',
                rel: 'noopener noreferrer',
              })}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {link.label}
            </a>
            {index < footerLinks.length - 1 && (
              <span className="text-gray-300 dark:text-gray-600">|</span>
            )}
          </span>
        ))}
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <a
          href="https://www.prateekgupta.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Copyright © {currentYear} CleanDay CRM
        </a>
      </div>
    </footer>
  );
}
