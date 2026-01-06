import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { Job } from '@/types';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await api.getJobs();

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setJobs(response.data);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const todayJobs = jobs.filter((job) => {
    const jobDate = new Date(job.scheduledDate).toDateString();
    const today = new Date().toDateString();
    return jobDate === today;
  });

  const upcomingJobs = jobs.filter((job) => {
    const jobDate = new Date(job.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return jobDate > today;
  });

  return {
    jobs,
    todayJobs,
    upcomingJobs,
    isLoading,
    error,
    refresh: fetchJobs,
  };
}

export function useJob(id: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await api.getJob(id);

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setJob(response.data);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const onMyWay = async () => {
    const response = await api.onMyWay(id);
    if (response.data) {
      setJob(response.data);
      return { success: true };
    }
    return { success: false, error: response.error };
  };

  const clockIn = async () => {
    const response = await api.clockIn(id);
    if (response.data) {
      setJob(response.data);
      return { success: true };
    }
    return { success: false, error: response.error };
  };

  const clockOut = async () => {
    const response = await api.clockOut(id);
    if (response.data) {
      setJob(response.data);
      return { success: true };
    }
    return { success: false, error: response.error };
  };

  return {
    job,
    isLoading,
    error,
    refresh: fetchJob,
    onMyWay,
    clockIn,
    clockOut,
  };
}
