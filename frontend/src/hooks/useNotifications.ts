import { useState, useCallback } from 'react';

/**
 * Custom hook for managing browser notifications
 * Handles permission requests and sending notifications
 * Requirements: FR-5
 */
export const useNotifications = () => {
  // Initialize with current permission state if available
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  /**
   * Request notification permission from the user
   * @returns Promise<boolean> - true if permission granted, false otherwise
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  /**
   * Send a browser notification
   * @param title - Notification title
   * @param options - Optional notification options
   */
  const sendNotification = useCallback((
    title: string,
    options?: NotificationOptions
  ) => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        ...options,
      });

      // Add click handler to focus the tab
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [permission]);

  return {
    permission,
    requestPermission,
    sendNotification,
  };
};
