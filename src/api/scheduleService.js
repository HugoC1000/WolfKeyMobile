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
      const todayISO = new Date().toISOString().split('T')[0];

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
  },

  autoCompleteCoursesWithPassword: async (wolfnetPassword, schoolEmail) => {
    try {
      const response = await api.post('auto-complete-courses-registration/', {
        wolfnet_password: wolfnetPassword,
        school_email: schoolEmail
      });

      // Normalize schedule shapes so frontend always receives block_<code> keys
      const data = response.data || {};

      const mapToBlockKeys = (obj) => {
        if (!obj || typeof obj !== 'object') return {};
        const out = {};
        Object.keys(obj).forEach((k) => {
          const normalizedKey = k.startsWith('block_') ? k : `block_${k}`;
          out[normalizedKey] = obj[k];
        });
        return out;
      };

      // Build a canonical schedule map
      const canonicalSchedule = data.raw_data ? mapToBlockKeys(data.raw_data) : (data.schedule_courses ? mapToBlockKeys(data.schedule_courses) : (data.user_data?.schedule ? mapToBlockKeys(data.user_data.schedule) : {}));

      // Return a normalized object but keep raw_data for debugging
      const normalized = {
        ...data,
        // canonical schedule under multiple keys used by the app
        schedule_blocks: canonicalSchedule,
        schedule_courses: canonicalSchedule,
        user_data: {
          ...(data.user_data || {}),
          schedule: canonicalSchedule,
        },
        raw_data: data.raw_data || data.schedule_courses || data.user_data?.schedule || {},
      };

      return normalized;
    } catch (error) {
      console.error('Error auto-completing courses with password:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      throw error;
    }
  }
};
