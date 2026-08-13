/**
 * Format a date string into compact relative time
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted time string like "2h", "3d", or "now"
 */
export const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.max(0, Math.floor((now - date) / (1000 * 60)));
  
  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
  if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 10080)}w`;
  
  return date.toLocaleDateString();
};

/**
 * Format a date string into a simple date format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

/**
 * Format a date string into compact relative time
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted relative time string like "2m", "3w", or "now"
 */
export const formatDateTime = formatTime;
