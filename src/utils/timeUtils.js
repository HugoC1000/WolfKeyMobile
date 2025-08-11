/**
 * Format a date string into a human-readable relative time
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted time string like "2h ago", "Just now", etc.
 */
export const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
  
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
 * Format a date string into a relative time format with more detail
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted relative time string like "2 minutes ago", "Just now", etc.
 */
export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
  }
  if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (diffInMinutes < 10080) {
    const days = Math.floor(diffInMinutes / 1440);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (diffInMinutes < 43200) {
    const weeks = Math.floor(diffInMinutes / 10080);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  
  // For anything older than a month, show the actual date
  return date.toLocaleDateString();
};
