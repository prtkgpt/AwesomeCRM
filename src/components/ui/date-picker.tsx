'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  setHours,
  setMinutes,
} from 'date-fns';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
  showTime?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  disabled = false,
  className,
  showTime = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleDateSelect = (date: Date) => {
    if (isDisabled(date)) return;
    let newDate = date;
    if (value && showTime) {
      newDate = setHours(setMinutes(date, value.getMinutes()), value.getHours());
    }
    onChange(newDate);
    if (!showTime) setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left border rounded-md',
          'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600',
          'hover:border-gray-400 focus:ring-2 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !value && 'text-gray-400'
        )}
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="flex-1 truncate">
          {value ? format(value, showTime ? 'MMM d, yyyy h:mm a' : 'MMM d, yyyy') : placeholder}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <button type="button" onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium">{format(viewDate, 'MMMM yyyy')}</span>
            <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 p-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 p-2 pt-0">
            {days.map((day) => {
              const isSelected = value && isSameDay(day, value);
              const isCurrentMonth = isSameMonth(day, viewDate);
              const isDayDisabled = isDisabled(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={isDayDisabled}
                  className={cn(
                    'w-8 h-8 text-sm rounded-full transition-colors',
                    !isCurrentMonth && 'text-gray-300 dark:text-gray-600',
                    isCurrentMonth && !isSelected && 'hover:bg-gray-100 dark:hover:bg-gray-800',
                    isToday(day) && !isSelected && 'border border-blue-500',
                    isSelected && 'bg-blue-600 text-white hover:bg-blue-700',
                    isDayDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          {showTime && value && (
            <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
              <Clock className="w-4 h-4 text-gray-500" />
              <select value={value.getHours()} onChange={(e) => onChange(setHours(value, parseInt(e.target.value)))} className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm">
                {Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{i.toString().padStart(2, '0')}</option>))}
              </select>
              <span>:</span>
              <select value={value.getMinutes()} onChange={(e) => onChange(setMinutes(value, parseInt(e.target.value)))} className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm">
                {[0, 15, 30, 45].map((m) => (<option key={m} value={m}>{m.toString().padStart(2, '0')}</option>))}
              </select>
            </div>
          )}
          <div className="flex justify-between p-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={() => { onChange(null); setIsOpen(false); }} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
            <button type="button" onClick={() => handleDateSelect(new Date())} className="text-sm text-blue-600 hover:text-blue-700">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
