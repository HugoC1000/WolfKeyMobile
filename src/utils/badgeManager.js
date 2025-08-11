import { setBadgeCount, clearBadge } from './notifications';
import { getUnreadCount } from '../api/notificationService';

class BadgeManager {
  constructor() {
    this.isInitialized = false;
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
