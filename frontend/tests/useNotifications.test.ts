import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';

describe('useNotifications', () => {
  let mockNotification: jest.Mock;
  let originalNotification: typeof Notification | undefined;

  beforeEach(() => {
    // Save original Notification
    originalNotification = (global as any).Notification;

    // Mock Notification constructor
    mockNotification = jest.fn().mockImplementation((title, options) => ({
      title,
      ...options,
      close: jest.fn(),
      onclick: null,
    }));

    // Set up Notification mock
    (global as any).Notification = mockNotification;
    (global as any).Notification.permission = 'default';
    (global as any).Notification.requestPermission = jest.fn();
  });

  afterEach(() => {
    // Restore original Notification
    if (originalNotification) {
      (global as any).Notification = originalNotification;
    } else {
      delete (global as any).Notification;
    }
  });

  it('should initialize with default permission state', () => {
    (global as any).Notification.permission = 'default';
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permission).toBe('default');
  });

  it('should initialize with granted permission state', () => {
    (global as any).Notification.permission = 'granted';
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permission).toBe('granted');
  });

  it('should request notification permission', async () => {
    (global as any).Notification.requestPermission = jest
      .fn()
      .mockResolvedValue('granted');

    const { result } = renderHook(() => useNotifications());

    let permissionGranted: boolean = false;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });

    expect(permissionGranted).toBe(true);
    expect(result.current.permission).toBe('granted');
    expect((global as any).Notification.requestPermission).toHaveBeenCalled();
  });

  it('should handle denied permission', async () => {
    (global as any).Notification.requestPermission = jest
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
    (global as any).Notification.permission = 'granted';
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
    (global as any).Notification.permission = 'denied';
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.sendNotification('Test Title');
    });

    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('should add click handler to focus window', () => {
    (global as any).Notification.permission = 'granted';
    const mockFocus = jest.fn();
    global.window.focus = mockFocus;

    const { result } = renderHook(() => useNotifications());

    let notification: any;
    act(() => {
      result.current.sendNotification('Test Title');
      notification = mockNotification.mock.results[0].value;
    });

    // Simulate click
    act(() => {
      notification.onclick();
    });

    expect(mockFocus).toHaveBeenCalled();
    expect(notification.close).toHaveBeenCalled();
  });

  it('should handle missing Notification API', async () => {
    delete (global as any).Notification;
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
