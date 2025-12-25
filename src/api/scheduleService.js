import api from './config';

function formatDateToISO(dateString) {
  const currentYear = new Date().getFullYear();
  const fullDateStr = `${dateString} ${currentYear}`;
  const parsedDate = new Date(fullDateStr);
  return parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

export const scheduleService = {
  //UNUSED. movde to process_schedule
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

  getCeremonialUniform: async (isoDate) => {
    try {
      const response = await api.get(`schedules/uniform/${encodeURIComponent(isoDate)}/`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Add timestamp to prevent caching
        params: {
          t: new Date().getTime()
        }
      });
      return response.data.ceremonial_uniform_required;
    } catch (error) {
      console.error('Error checking ceremonial uniform:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      throw error;
    }
  },


  getProcessedSchedule: async (userId, isoDate) => {
    try {
      // Get today's date in local timezone for comparison
      const today = new Date();
      const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const params = {
        t: new Date().getTime()
      };
      if (isoDate && isoDate !== todayISO) {
        params.date = isoDate;
      }

      const response = await api.get(`process-schedule/${userId}/`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        params: params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching processed schedule:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      throw error;
    }
  }
};
