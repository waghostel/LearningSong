import { useState, useEffect } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInAnonymously, isDevelopmentMode } from '@/lib/firebase';

const USER_ID_KEY = 'learningsong_user_id';
const DEV_USER_ID = 'dev-user-local';

interface UseAuthReturn {
  userId: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook for Firebase anonymous authentication
 * - Automatically signs in anonymously on mount
 * - Stores user ID in localStorage for persistence
 * - Handles auth state changes
 * - In development mode (without Firebase), uses a mock user ID
 */
export const useAuth = (): UseAuthReturn => {
  const [userId, setUserId] = useState<string | null>(() => {
    // Initialize state from localStorage or use dev user in development mode
    if (isDevelopmentMode || !auth) {
      return DEV_USER_ID;
    }
    return localStorage.getItem(USER_ID_KEY);
  });
  const [loading, setLoading] = useState<boolean>(() => {
    // Not loading in development mode since we already have the user
    return !(isDevelopmentMode || !auth);
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Development mode: use mock authentication
    if (isDevelopmentMode || !auth) {
      console.warn('🔧 Using mock authentication for development');
      localStorage.setItem(USER_ID_KEY, DEV_USER_ID);
      return;
    }

    // Production mode: use Firebase authentication
    // Listen to auth state changes
    // At this point, auth is guaranteed to be non-null due to the check above
    const unsubscribe = onAuthStateChanged(
      auth!,
      async (user: User | null) => {
        try {
          if (user) {
            // User is signed in
            const uid = user.uid;
            setUserId(uid);
            localStorage.setItem(USER_ID_KEY, uid);
            setLoading(false);
          } else {
            // No user is signed in, sign in anonymously
            const result = await signInAnonymously(auth!);
            const uid = result.user.uid;
            setUserId(uid);
            localStorage.setItem(USER_ID_KEY, uid);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error during authentication:', err);
          setError(err as Error);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Auth state change error:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { userId, loading, error };
};
