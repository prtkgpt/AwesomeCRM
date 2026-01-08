'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Users,
  Briefcase,
  FileText,
  Calculator,
  UserCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface SearchResult {
  id: string;
  type: 'client' | 'booking' | 'invoice' | 'estimate' | 'team';
  title: string;
  subtitle: string;
  description: string;
  metadata: any;
  url: string;
}

interface SearchResults {
  clients: SearchResult[];
  bookings: SearchResult[];
  invoices: SearchResult[];
  estimates: SearchResult[];
  team: SearchResult[];
}

interface GlobalSearchProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const entityConfig = {
  client: {
    icon: Users,
    label: 'Clients',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  booking: {
    icon: Briefcase,
    label: 'Jobs',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  invoice: {
    icon: FileText,
    label: 'Invoices',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  estimate: {
    icon: Calculator,
    label: 'Estimates',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
  team: {
    icon: UserCircle,
    label: 'Team',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950',
  },
};

export default function GlobalSearch({ onClose, isMobile = false }: GlobalSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    clients: [],
    bookings: [],
    invoices: [],
    estimates: [],
    team: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 5);

    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults({
          clients: [],
          bookings: [],
          invoices: [],
          estimates: [],
          team: [],
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults({
        clients: [],
        bookings: [],
        invoices: [],
        estimates: [],
        team: [],
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/search/global?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle query change with debouncing
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.length >= 2) {
      setLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setResults({
        clients: [],
        bookings: [],
        invoices: [],
        estimates: [],
        team: [],
      });
      setLoading(false);
    }
  };

  // Get all results in a flat array for keyboard navigation
  const getAllResults = () => {
    return [
      ...results.clients,
      ...results.bookings,
      ...results.invoices,
      ...results.estimates,
      ...results.team,
    ];
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allResults = getAllResults();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      handleResultClick(allResults[selectedIndex]);
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
    if (onClose) onClose();
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    performSearch(search);
  };

  const totalResults = getAllResults().length;
  const hasResults = totalResults > 0;

  // Mobile trigger button
  if (isMobile && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full p-3 text-left text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Search className="h-5 w-5" />
        <span>Search...</span>
        <kbd className="ml-auto text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">⌘K</kbd>
      </button>
    );
  }

  // Desktop trigger button
  if (!isMobile && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 w-full px-4 py-2 text-left text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search...</span>
        <div className="ml-auto flex gap-1">
          <kbd className="text-xs px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
            ⌘
          </kbd>
          <kbd className="text-xs px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
            K
          </kbd>
        </div>
      </button>
    );
  }

  // Search modal
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => {
          setIsOpen(false);
          setQuery('');
          if (onClose) onClose();
        }}
      />

      {/* Search Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
        <Card className="w-full max-w-2xl max-h-[70vh] flex flex-col shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search clients, jobs, invoices..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
            />
            {loading && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600" />
            )}
            <button
              onClick={() => {
                setIsOpen(false);
                setQuery('');
                if (onClose) onClose();
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1">
            {!query && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <Clock className="h-3 w-3" />
                  <span>Recent Searches</span>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query && !loading && !hasResults && (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No results found for "{query}"
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Try searching for clients, jobs, invoices, or team members
                </p>
              </div>
            )}

            {hasResults && (
              <div className="p-2">
                {/* Clients */}
                {results.clients.length > 0 && (
                  <SearchResultGroup
                    type="client"
                    results={results.clients}
                    selectedIndex={selectedIndex}
                    onResultClick={handleResultClick}
                    startIndex={0}
                  />
                )}

                {/* Bookings */}
                {results.bookings.length > 0 && (
                  <SearchResultGroup
                    type="booking"
                    results={results.bookings}
                    selectedIndex={selectedIndex}
                    onResultClick={handleResultClick}
                    startIndex={results.clients.length}
                  />
                )}

                {/* Invoices */}
                {results.invoices.length > 0 && (
                  <SearchResultGroup
                    type="invoice"
                    results={results.invoices}
                    selectedIndex={selectedIndex}
                    onResultClick={handleResultClick}
                    startIndex={results.clients.length + results.bookings.length}
                  />
                )}

                {/* Estimates */}
                {results.estimates.length > 0 && (
                  <SearchResultGroup
                    type="estimate"
                    results={results.estimates}
                    selectedIndex={selectedIndex}
                    onResultClick={handleResultClick}
                    startIndex={
                      results.clients.length +
                      results.bookings.length +
                      results.invoices.length
                    }
                  />
                )}

                {/* Team */}
                {results.team.length > 0 && (
                  <SearchResultGroup
                    type="team"
                    results={results.team}
                    selectedIndex={selectedIndex}
                    onResultClick={handleResultClick}
                    startIndex={
                      results.clients.length +
                      results.bookings.length +
                      results.invoices.length +
                      results.estimates.length
                    }
                  />
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasResults && (
            <div className="flex items-center justify-between px-4 py-3 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                <span>{totalResults} results</span>
              </div>
              <div className="flex gap-3">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↵</kbd> Select
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> Close
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

// Search Result Group Component
function SearchResultGroup({
  type,
  results,
  selectedIndex,
  onResultClick,
  startIndex,
}: {
  type: SearchResult['type'];
  results: SearchResult[];
  selectedIndex: number;
  onResultClick: (result: SearchResult) => void;
  startIndex: number;
}) {
  const config = entityConfig[type];
  const Icon = config.icon;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span>{config.label}</span>
        <span className="ml-auto">{results.length}</span>
      </div>
      <div className="space-y-1">
        {results.map((result, index) => {
          const globalIndex = startIndex + index;
          const isSelected = globalIndex === selectedIndex;

          return (
            <button
              key={result.id}
              onClick={() => onResultClick(result)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                isSelected
                  ? `${config.bgColor} border border-current ${config.color}`
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </div>
                  )}
                  {result.description && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {result.description}
                    </div>
                  )}
                </div>
                {result.metadata?.status && (
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                    {result.metadata.status}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
