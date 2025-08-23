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

  getCeremonialUniform: async (date) => {
    try {
      const isoDate = formatDateToISO(date);
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


  getProcessedSchedule: async (userId, date) => {
    try {
      const isoDate = formatDateToISO(date);

      const params = {
        t: new Date().getTime()
      };
      if (isoDate && isoDate !== formatDateToISO(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))) {
        params.date = isoDate;
      }

      const response = await api.get(`process-schedule/${userId}/`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        params: params
      });

      return response.data.schedule;
    } catch (error) {
      console.error('Error fetching processed schedule:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      throw error;
    }
  },

  autoCompleteCoursesWithPassword: async (wolfnetPassword, schoolEmail) => {
    try {
      const response = await api.post('auto-complete-courses-registration/', {
        wolfnet_password: wolfnetPassword,
        school_email: schoolEmail
      });
      return response.data;
    } catch (error) {
      console.error('Error auto-completing courses with password:', error);
      throw error;
    }
  }
};
