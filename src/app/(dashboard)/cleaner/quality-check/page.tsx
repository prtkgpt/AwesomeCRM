'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Camera, CheckCircle, AlertCircle, Upload, X, ChevronRight, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  required: boolean;
  requiresPhoto: boolean;
  completed: boolean;
  photoUrl?: string;
  notes?: string;
}

interface QualityCheck {
  id: string;
  bookingId: string;
  booking: {
    bookingNumber: string;
    scheduledDate: string;
    client: { firstName: string; lastName: string };
    address: string;
    serviceType: string;
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  checklist: ChecklistItem[];
  overallNotes?: string;
  photos: { id: string; url: string; caption?: string }[];
}

const defaultChecklist: Omit<ChecklistItem, 'id' | 'completed' | 'photoUrl' | 'notes'>[] = [
  { category: 'Kitchen', item: 'Countertops cleaned and sanitized', required: true, requiresPhoto: false },
  { category: 'Kitchen', item: 'Sink and faucet cleaned', required: true, requiresPhoto: false },
  { category: 'Kitchen', item: 'Appliances wiped down', required: true, requiresPhoto: false },
  { category: 'Kitchen', item: 'Floor mopped', required: true, requiresPhoto: true },
  { category: 'Bathroom', item: 'Toilet cleaned inside and out', required: true, requiresPhoto: false },
  { category: 'Bathroom', item: 'Shower/tub scrubbed', required: true, requiresPhoto: false },
  { category: 'Bathroom', item: 'Mirrors cleaned', required: true, requiresPhoto: false },
  { category: 'Bathroom', item: 'Floor mopped', required: true, requiresPhoto: true },
  { category: 'Living Areas', item: 'Dusting completed', required: true, requiresPhoto: false },
  { category: 'Living Areas', item: 'Vacuumed/mopped floors', required: true, requiresPhoto: true },
  { category: 'Living Areas', item: 'Furniture surfaces wiped', required: false, requiresPhoto: false },
  { category: 'Bedrooms', item: 'Bed made (if requested)', required: false, requiresPhoto: false },
  { category: 'Bedrooms', item: 'Floors cleaned', required: true, requiresPhoto: false },
  { category: 'Bedrooms', item: 'Surfaces dusted', required: true, requiresPhoto: false },
  { category: 'Final Check', item: 'All trash removed', required: true, requiresPhoto: false },
  { category: 'Final Check', item: 'Windows spot-checked', required: false, requiresPhoto: false },
  { category: 'Final Check', item: 'Final walkthrough completed', required: true, requiresPhoto: true },
];

export default function QualityCheckPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qualityCheck, setQualityCheck] = useState<QualityCheck | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Kitchen');
  const [overallNotes, setOverallNotes] = useState('');
  const [photos, setPhotos] = useState<{ file?: File; url: string; caption: string }[]>([]);

  useEffect(() => {
    if (bookingId) {
      fetchQualityCheck();
    } else {
      // Initialize with default checklist
      setChecklist(defaultChecklist.map((item, idx) => ({
        ...item,
        id: `item-${idx}`,
        completed: false,
      })));
      setLoading(false);
    }
  }, [bookingId]);

  const fetchQualityCheck = async () => {
    try {
      const res = await fetch(`/api/quality/checks?bookingId=${bookingId}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const check = data.data[0];
        setQualityCheck(check);
        setChecklist(check.checklist);
        setOverallNotes(check.overallNotes || '');
        setPhotos(check.photos.map((p: any) => ({ url: p.url, caption: p.caption || '' })));
      } else {
        setChecklist(defaultChecklist.map((item, idx) => ({
          ...item,
          id: `item-${idx}`,
          completed: false,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch quality check:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const updateItemNotes = (id: string, notes: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, notes } : item
    ));
  };

  const handlePhotoUpload = async (id: string, file: File) => {
    // In production, upload to cloud storage
    const url = URL.createObjectURL(file);
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, photoUrl: url } : item
    ));
  };

  const addPhoto = () => {
    setPhotos(prev => [...prev, { url: '', caption: '' }]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const requiredIncomplete = checklist.filter(item => item.required && !item.completed);
    if (requiredIncomplete.length > 0) {
      alert(`Please complete all required items (${requiredIncomplete.length} remaining)`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/quality/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          checklist,
          overallNotes,
          photos: photos.filter(p => p.url),
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/cleaner/dashboard');
      }
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setSaving(false);
    }
  };

  const categories = [...new Set(checklist.map(item => item.category))];
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const requiredCount = checklist.filter(item => item.required).length;
  const requiredCompletedCount = checklist.filter(item => item.required && item.completed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quality Checklist</h1>
        {qualityCheck?.booking && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <p className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {qualityCheck.booking.address}
            </p>
            <p className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4" />
              {new Date(qualityCheck.booking.scheduledDate).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress: {completedCount}/{totalCount} items
          </span>
          <Badge variant={requiredCompletedCount === requiredCount ? 'success' : 'warning'}>
            {requiredCompletedCount}/{requiredCount} required
          </Badge>
        </div>
        <Progress value={completedCount} max={totalCount} variant="success" />
      </div>

      {/* Checklist by Category */}
      <div className="space-y-3 mb-6">
        {categories.map(category => {
          const items = checklist.filter(item => item.category === category);
          const categoryCompleted = items.filter(item => item.completed).length;
          const isExpanded = expandedCategory === category;

          return (
            <div
              key={category}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    categoryCompleted === items.length
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}>
                    {categoryCompleted === items.length ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      `${categoryCompleted}/${items.length}`
                    )}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{category}</span>
                </div>
                <ChevronRight className={cn(
                  'w-5 h-5 text-gray-400 transition-transform',
                  isExpanded && 'rotate-90'
                )} />
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="p-4 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                            item.completed
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          )}
                        >
                          {item.completed && <CheckCircle className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm',
                            item.completed && 'text-gray-500 line-through'
                          )}>
                            {item.item}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </p>

                          {item.requiresPhoto && (
                            <div className="mt-2">
                              {item.photoUrl ? (
                                <div className="relative inline-block">
                                  <img
                                    src={item.photoUrl}
                                    alt="Checklist photo"
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                  <button
                                    onClick={() => setChecklist(prev => prev.map(i =>
                                      i.id === item.id ? { ...i, photoUrl: undefined } : i
                                    ))}
                                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
                                  <Camera className="w-4 h-4" />
                                  <span className="text-xs">Add Photo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handlePhotoUpload(item.id, file);
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          )}

                          <input
                            type="text"
                            placeholder="Add notes (optional)"
                            value={item.notes || ''}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                            className="mt-2 w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Photos */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">Additional Photos</h3>
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative">
              {photo.url ? (
                <>
                  <img src={photo.url} alt="" className="w-full h-24 object-cover rounded" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:border-blue-500">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, url, file } : p));
                      }
                    }}
                  />
                </label>
              )}
            </div>
          ))}
          <button
            onClick={addPhoto}
            className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-blue-500"
          >
            <span className="text-2xl text-gray-400">+</span>
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">Overall Notes</h3>
        <textarea
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          placeholder="Any additional notes about the cleaning..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-transparent resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || requiredCompletedCount < requiredCount}
        className={cn(
          'w-full py-3 rounded-lg font-medium text-white transition-colors',
          requiredCompletedCount === requiredCount
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-gray-400 cursor-not-allowed'
        )}
      >
        {saving ? 'Submitting...' : requiredCompletedCount === requiredCount
          ? 'Submit Quality Check'
          : `Complete ${requiredCount - requiredCompletedCount} required items`}
      </button>
    </div>
  );
}
