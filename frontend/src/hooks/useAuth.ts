import { useState, useEffect } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInAnonymously } from '@/lib/firebase';

const USER_ID_KEY = 'learningsong_user_id';

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
 */
export const useAuth = (): UseAuthReturn => {
  const [userId, setUserId] = useState<string | null>(() => {
    // Initialize state from localStorage
    return localStorage.getItem(USER_ID_KEY);
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
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
            const result = await signInAnonymously(auth);
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
