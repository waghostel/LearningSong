import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, signInAnonymously } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if we're in development mode with placeholder credentials
const isDevelopmentMode = 
  import.meta.env.VITE_FIREBASE_API_KEY?.includes('Placeholder') ||
  import.meta.env.VITE_FIREBASE_PROJECT_ID === 'learningsong-dev';

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (!isDevelopmentMode) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    console.warn('Running in development mode without Firebase');
  }
} else {
  console.warn('🔧 Development Mode: Firebase is disabled. Using mock authentication.');
}

// Export Firebase instances
export { app, auth, signInAnonymously, isDevelopmentMode };
