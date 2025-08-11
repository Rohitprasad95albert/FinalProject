// frontend/notificationSystem.js
class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isInitialized = false;
    this.notificationPermission = 'default';
    this.init();
  }

  async init() {
    try {
      // Check if browser supports notifications
      if ('Notification' in window) {
        this.notificationPermission = Notification.permission;
        
        // Request permission if not granted
        if (this.notificationPermission === 'default') {
          this.notificationPermission = await Notification.requestPermission();
        }
      }

      // Load existing notifications
      await this.loadNotifications();
      
      // Also get the unread count separately to ensure badge is updated
      await this.getUnreadCount();
      this.updateNotificationBadge();
      
      // Set up periodic refresh
      setInterval(() => this.loadNotifications(), 30000); // Refresh every 30 seconds
      
      this.isInitialized = true;
      console.log('Notification system initialized');
    } catch (error) {
      console.error('Error initializing notification system:', error);
    }
  }

  async loadNotifications() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, skipping notification load');
      return;
    }

    try {
      console.log('Loading notifications...');
      const response = await fetch(`${BASE_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Notification response status:', response.status);
      
      if (response.ok) {
        this.notifications = await response.json();
        console.log('Loaded notifications:', this.notifications);
        this.updateUnreadCount();
        this.updateNotificationBadge();
        this.updateNotificationDropdown();
      } else {
        console.error('Failed to load notifications:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async getUnreadCount() {
    const token = localStorage.getItem('token');
    if (!token) return 0;

    try {
      const response = await fetch(`${BASE_URL}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.unreadCount = data.count;
        return data.count;
      }
    } catch (error) {
      console.error('Error getting unread count:', error);
    }
    return 0;
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }

  updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  updateNotificationDropdown() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) {
      console.log('Notification list element not found');
      return;
    }

    console.log('Updating notification dropdown with', this.notifications.length, 'notifications');

    if (this.notifications.length === 0) {
      notificationList.innerHTML = `
        <div class="p-4 text-center text-gray-500">
          <i class="bi bi-bell text-2xl mb-2"></i>
          <p>No notifications yet</p>
        </div>
      `;
    } else {
      notificationList.innerHTML = this.notifications.slice(0, 10).map(notification => `
        <div class="p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${notification.isRead ? '' : 'bg-blue-50'}" 
             onclick="notificationSystem.handleNotificationClick('${notification._id}', '${notification.actionUrl || ''}')">
          <div class="flex items-start space-x-3">
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-semibold text-gray-900">${notification.title}</h4>
                ${!notification.isRead ? '<div class="w-2 h-2 bg-blue-500 rounded-full"></div>' : ''}
              </div>
              <p class="text-sm text-gray-600 mb-2">${notification.message}</p>
              <p class="text-xs text-gray-400">${this.formatTime(notification.createdAt)}</p>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  async markAsRead(notificationId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state
        const notification = this.notifications.find(n => n._id === notificationId);
        if (notification) {
          notification.isRead = true;
          this.updateUnreadCount();
          this.updateNotificationBadge();
          this.updateNotificationDropdown();
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state
        this.notifications.forEach(n => n.isRead = true);
        this.updateUnreadCount();
        this.updateNotificationBadge();
        this.updateNotificationDropdown();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  showBrowserNotification(title, message, options = {}) {
    if (this.notificationPermission !== 'granted') return;

    const notification = new Notification(title, {
      body: message,
      icon: '/favicon.ico', // You can replace with your app icon
      badge: '/favicon.ico',
      tag: 'eventsphere-notification',
      ...options
    });

    // Handle notification click
    notification.onclick = function() {
      window.focus();
      if (options.actionUrl) {
        window.location.href = options.actionUrl;
      }
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }

  showInAppNotification(title, message, type = 'info', duration = 5000) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <div class="toast-header">
        <strong>${title}</strong>
        <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
      </div>
      <div class="toast-body">${message}</div>
    `;

    // Add to toast container
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, duration);
  }

  createNotificationDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'notification-dropdown';
    dropdown.innerHTML = `
      <div class="notification-header">
        <h6>Notifications</h6>
        <button class="btn btn-sm btn-outline-primary" onclick="notificationSystem.markAllAsRead()">
          Mark all read
        </button>
      </div>
      <div class="notification-list">
        ${this.notifications.length === 0 ? 
          '<div class="no-notifications">No notifications</div>' :
          this.notifications.slice(0, 10).map(notification => `
            <div class="notification-item ${notification.isRead ? 'read' : 'unread'}" 
                 onclick="notificationSystem.handleNotificationClick('${notification._id}', '${notification.actionUrl || ''}')">
              <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${this.formatTime(notification.createdAt)}</div>
              </div>
              ${!notification.isRead ? '<div class="notification-dot"></div>' : ''}
            </div>
          `).join('')
        }
      </div>
      ${this.notifications.length > 10 ? 
        '<div class="notification-footer"><a href="#" onclick="notificationSystem.showAllNotifications()">View all notifications</a></div>' : 
        ''
      }
    `;
    return dropdown;
  }

  handleNotificationClick(notificationId, actionUrl) {
    // Mark as read
    this.markAsRead(notificationId);
    
    // Navigate if action URL provided
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  async createReminder(eventId, reminderMinutes) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/api/notifications/reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventId, reminderTime: reminderMinutes })
      });

      if (response.ok) {
        this.showInAppNotification(
          'Reminder Set! ⏰',
          `You'll be notified ${reminderMinutes} minutes before the event starts.`,
          'success'
        );
      } else {
        const error = await response.json();
        this.showInAppNotification('Error', error.error, 'error');
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      this.showInAppNotification('Error', 'Failed to set reminder', 'error');
    }
  }

  // Method to show all notifications in a modal
  showAllNotifications() {
    // This could open a modal with all notifications
    // For now, we'll just show an alert
    alert('All notifications feature coming soon!');
  }
}

// Global instance
let notificationSystem;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  notificationSystem = new NotificationSystem();
  window.notificationSystem = notificationSystem;
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
} else {
  // DOM is already loaded, initialize immediately
  notificationSystem = new NotificationSystem();
  window.notificationSystem = notificationSystem;
}
