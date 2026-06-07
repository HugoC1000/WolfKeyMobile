import api from './config';

/**
 * Service for managing volunteer hours, milestones, and resources
 */
export const volunteerService = {
  /**
   * Get current user's volunteer hours
   */
  getVolunteerHours: async () => {
    try {
      const response = await api.get('volunteer/hours/');
      return response.data;
    } catch (error) {
      console.error('Error fetching volunteer hours:', error);
      throw error;
    }
  },

  /**
   * Get volunteer pin milestones with progress
   */
  getVolunteerMilestones: async () => {
    try {
      const response = await api.get('volunteer/milestones/');
      return response.data;
    } catch (error) {
      console.error('Error fetching volunteer milestones:', error);
      throw error;
    }
  },

  /**
   * Get volunteer resources
   */
  getVolunteerResources: async () => {
    try {
      const response = await api.get('volunteer/resources/');
      return response.data;
    } catch (error) {
      console.error('Error fetching volunteer resources:', error);
      throw error;
    }
  },
};

export default volunteerService;
