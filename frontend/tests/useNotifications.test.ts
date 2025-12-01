import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';

interface MockNotificationInstance {
  title: string;
  close: jest.Mock;
  onclick: (() => void) | null;
  [key: string]: unknown;
}

interface MockNotificationConstructor {
  new (title: string, options?: NotificationOptions): MockNotificationInstance;
  permission: NotificationPermission;
  requestPermission: jest.Mock;
}

describe('useNotifications', () => {
  let mockNotification: jest.Mock;
  let originalNotification: typeof Notification | undefined;

  beforeEach(() => {
    // Save original Notification
    originalNotification = (global as Record<string, unknown>).Notification as typeof Notification | undefined;

    // Mock Notification constructor
    mockNotification = jest.fn().mockImplementation((title: string, options?: NotificationOptions) => ({
      title,
      ...options,
      close: jest.fn(),
      onclick: null,
    }));

    // Set up Notification mock
    (global as Record<string, unknown>).Notification = mockNotification as unknown as MockNotificationConstructor;
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).permission = 'default';
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).requestPermission = jest.fn();
  });

  afterEach(() => {
    // Restore original Notification
    if (originalNotification) {
      (global as Record<string, unknown>).Notification = originalNotification;
    } else {
      delete (global as Record<string, unknown>).Notification;
    }
  });

  it('should initialize with default permission state', () => {
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).permission = 'default';
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permission).toBe('default');
  });

  it('should initialize with granted permission state', () => {
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).permission = 'granted';
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permission).toBe('granted');
  });

  it('should request notification permission', async () => {
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).requestPermission = jest
      .fn()
      .mockResolvedValue('granted');

    const { result } = renderHook(() => useNotifications());

    let permissionGranted: boolean = false;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });

    expect(permissionGranted).toBe(true);
    expect(result.current.permission).toBe('granted');
    expect(((global as Record<string, unknown>).Notification as MockNotificationConstructor).requestPermission).toHaveBeenCalled();
  });

  it('should handle denied permission', async () => {
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).requestPermission = jest
      .fn()
      .mockResolvedValue('denied');

    const { result } = renderHook(() => useNotifications());

    let permissionGranted: boolean = true;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });

    expect(permissionGranted).toBe(false);
    expect(result.current.permission).toBe('denied');
  });

  it('should send notification when permission is granted', () => {
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).permission = 'granted';
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.sendNotification('Test Title', {
        body: 'Test Body',
      });
    });

    expect(mockNotification).toHaveBeenCalledWith('Test Title', {
      icon: '/vite.svg',
      badge: '/vite.svg',
      body: 'Test Body',
    });
  });

  it('should not send notification when permission is denied', () => {
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).permission = 'denied';
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.sendNotification('Test Title');
    });

    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('should add click handler to focus window', () => {
    ((global as Record<string, unknown>).Notification as MockNotificationConstructor).permission = 'granted';
    const mockFocus = jest.fn();
    global.window.focus = mockFocus;

    const { result } = renderHook(() => useNotifications());

    let notification: MockNotificationInstance;
    act(() => {
      result.current.sendNotification('Test Title');
      notification = mockNotification.mock.results[0].value as MockNotificationInstance;
    });

    // Simulate click
    act(() => {
      notification.onclick?.();
    });

    expect(mockFocus).toHaveBeenCalled();
    expect(notification.close).toHaveBeenCalled();
  });

  it('should handle missing Notification API', async () => {
    delete (global as Record<string, unknown>).Notification;
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permission).toBe('default');

    let permissionGranted: boolean = true;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });

    expect(permissionGranted).toBe(false);

    act(() => {
      result.current.sendNotification('Test');
    });

    // Should not throw error
    expect(mockNotification).not.toHaveBeenCalled();
  });
});
