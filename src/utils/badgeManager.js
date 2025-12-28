import { setBadgeCount, clearBadge } from './notifications';
import { getUnreadCount } from '../api/notificationService';

class BadgeManager {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Set();
    this.currentCount = 0;
  }

  // Subscribe to badge count changes
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately call with current count
    callback(this.currentCount);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of count change
  notifyListeners(count) {
    this.currentCount = count;
    this.listeners.forEach(callback => {
      try {
        callback(count);
      } catch (error) {
        console.error('Error in badge listener:', error);
      }
    });
  }

  async initialize() {
    try {
      await this.syncWithServer();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing badge manager:', error);
    }
  }

  async syncWithServer() {
    try {
      const unreadCount = await getUnreadCount();
      await setBadgeCount(unreadCount);
      this.notifyListeners(unreadCount);
      return unreadCount;
    } catch (error) {
      console.error('Error syncing badge with server:', error);
      return 0;
    }
  }

  async updateBadge() {
    try {
      await this.syncWithServer();
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  }

  async clearBadge() {
    try {
      await clearBadge();
      this.notifyListeners(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  async onAppForeground() {
    if (this.isInitialized) {
      await this.syncWithServer();
    }
  }
}

export const badgeManager = new BadgeManager();
export default badgeManager;
