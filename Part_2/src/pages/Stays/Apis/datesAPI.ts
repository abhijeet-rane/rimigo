import apiClient from '@/lib/api/apiClient';
import { API_CONFIG } from '@/lib/api/apiConfig';

export const getAvailableDates = async (cityId: string) => {
  // TODO: Implement API call
  const response = await apiClient.get(`${API_CONFIG.BASE_URL}/api/dates/available?cityId=${cityId}`);
  return response.data;
};

export const getPricesByDateRange = async (cityId: string, startDate: string, endDate: string) => {
  // TODO: Implement API call
  const response = await apiClient.get(
    `${API_CONFIG.BASE_URL}/api/dates/prices?cityId=${cityId}&startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
};

