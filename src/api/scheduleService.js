import api from './config';

function formatDateToISO(dateString) {
  const currentYear = new Date().getFullYear();
  const fullDateStr = `${dateString} ${currentYear}`;
  const parsedDate = new Date(fullDateStr);
  return parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

export const scheduleService = {
  getDailySchedule: async (date) => {
    try {
      const isoDate = formatDateToISO(date);

      const response = await api.get(`schedules/daily/${isoDate}/`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Add timestamp to prevent caching
        params: {
          t: new Date().getTime()
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching schedule:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      throw error;
    }
  },

  getCeremonialUniform: async (date) => {
    try {
      const isoDate = formatDateToISO(date);
      const response = await api.get(`schedules/uniform/${encodeURIComponent(isoDate)}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      return response.data.required;
    } catch (error) {
      console.error('Error checking ceremonial uniform:', error);
      throw error;
    }
  }
};
