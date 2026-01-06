import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants';

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  },

  async getUserData(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
    } catch {
      return null;
    }
  },

  async setUserData(data: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, data);
  },

  async removeUserData(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA),
    ]);
  },
};
