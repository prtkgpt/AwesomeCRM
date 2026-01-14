'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ChecklistTask {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

interface ChecklistCategory {
  category: string;
  icon: string;
  tasks: ChecklistTask[];
}

type ChecklistData = ChecklistCategory[];

interface ChecklistResponse {
  id: string;
  checklistData: ChecklistData;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  startedAt: string | null;
  completedAt: string | null;
}

export default function JobChecklistPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklistData, setChecklistData] = useState<ChecklistData>([]);
  const [checklistId, setChecklistId] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [percentComplete, setPercentComplete] = useState(0);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (jobId) {
      fetchChecklist();
    }
  }, [jobId]);

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cleaner/jobs/${jobId}/checklist`);
      const result = await res.json();

      if (res.ok && result.success) {
        const data: ChecklistResponse = result.data;
        setChecklistId(data.id);
        setChecklistData(data.checklistData);
        setTotalTasks(data.totalTasks);
        setCompletedTasks(data.completedTasks);
        setPercentComplete(data.percentComplete);

        // Expand all categories by default
        const allCategories = new Set(data.checklistData.map((cat) => cat.category));
        setExpandedCategories(allCategories);
      } else {
        setError(result.error || 'Failed to load checklist');
      }
    } catch (error) {
      console.error('Failed to fetch checklist:', error);
      setError('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (categoryIndex: number, taskIndex: number) => {
    const newData = [...checklistData];
    const task = newData[categoryIndex].tasks[taskIndex];
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : undefined;

    setChecklistData(newData);
    await saveChecklist(newData);
  };

  const saveChecklist = async (data: ChecklistData = checklistData) => {
    try {
      setSaving(true);
      setSaveMessage('');

      const res = await fetch(`/api/cleaner/jobs/${jobId}/checklist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checklistData: data,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setCompletedTasks(result.data.completedTasks);
        setTotalTasks(result.data.totalTasks);
        setPercentComplete(result.data.percentComplete);
        setSaveMessage('Saved ✓');
        setTimeout(() => setSaveMessage(''), 2000);
      } else {
        setError(result.error || 'Failed to save checklist');
      }
    } catch (error) {
      console.error('Failed to save checklist:', error);
      setError('Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryProgress = (category: ChecklistCategory) => {
    const completed = category.tasks.filter((t) => t.completed).length;
    const total = category.tasks.length;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading checklist...</div>
      </div>
    );
  }

  if (error && !checklistData.length) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <div className="text-center text-red-600">{error}</div>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Job
        </Button>

        {saveMessage && (
          <span className="text-sm text-green-600 font-medium">{saveMessage}</span>
        )}
      </div>

      {/* Progress Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-800">
              Job Checklist Progress
            </h2>
            <span className="text-2xl font-bold text-blue-600">
              {percentComplete}%
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${percentComplete}%` }}
          >
            {percentComplete > 10 && (
              <span className="text-xs font-bold text-white">
                {percentComplete}%
              </span>
            )}
          </div>
        </div>

        {percentComplete === 100 && (
          <div className="mt-4 p-3 bg-green-100 border-2 border-green-300 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              🎉 All tasks completed! Great job!
            </span>
          </div>
        )}
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Checklist Categories */}
      <div className="space-y-3">
        {checklistData.map((category, categoryIndex) => {
          const isExpanded = expandedCategories.has(category.category);
          const progress = getCategoryProgress(category);

          return (
            <Card key={category.category} className="overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800">
                      {category.category}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {progress.completed}/{progress.total} completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600">
                      {progress.percent}%
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>

              {/* Category Tasks */}
              {isExpanded && (
                <div className="p-4 space-y-2">
                  {category.tasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                        task.completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <button
                        onClick={() => toggleTask(categoryIndex, taskIndex)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {task.completed ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400 hover:text-blue-500 transition-colors" />
                        )}
                      </button>

                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            task.completed
                              ? 'line-through text-gray-500'
                              : 'text-gray-800'
                          }`}
                        >
                          {task.task}
                        </p>
                        {task.completed && task.completedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            ✓ Completed{' '}
                            {new Date(task.completedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-4 flex justify-center">
        <Button
          onClick={() => router.back()}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Done with Checklist
        </Button>
      </div>
    </div>
  );
}
