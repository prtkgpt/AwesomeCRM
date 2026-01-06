import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_URL } from '@/constants';
import { storage } from './storage';
import { Job, CleanerProfile, ApiResponse } from '@/types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          storage.clearAll();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const response = await this.client.post('/api/auth/mobile-login', { email, password });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Login failed' };
    }
  }

  // Jobs
  async getJobs(): Promise<ApiResponse<Job[]>> {
    try {
      const response = await this.client.get('/api/cleaner/jobs');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to fetch jobs' };
    }
  }

  async getJob(id: string): Promise<ApiResponse<Job>> {
    try {
      const response = await this.client.get(`/api/cleaner/jobs/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to fetch job' };
    }
  }

  async onMyWay(jobId: string): Promise<ApiResponse<Job>> {
    try {
      const response = await this.client.post(`/api/cleaner/jobs/${jobId}/on-my-way`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to send notification' };
    }
  }

  async clockIn(jobId: string): Promise<ApiResponse<Job>> {
    try {
      const response = await this.client.post(`/api/cleaner/jobs/${jobId}/clock-in`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to clock in' };
    }
  }

  async clockOut(jobId: string): Promise<ApiResponse<Job>> {
    try {
      const response = await this.client.post(`/api/cleaner/jobs/${jobId}/clock-out`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to clock out' };
    }
  }

  // Profile
  async getProfile(): Promise<ApiResponse<CleanerProfile>> {
    try {
      const response = await this.client.get('/api/cleaner/profile');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to fetch profile' };
    }
  }

  async updateProfile(data: Partial<CleanerProfile>): Promise<ApiResponse<CleanerProfile>> {
    try {
      const response = await this.client.put('/api/cleaner/profile', data);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || 'Failed to update profile' };
    }
  }
}

export const api = new ApiService();
