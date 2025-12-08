import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase project configuration used by the web application.
 *
 * Values are provided by Firebase and identify the project as well
 * as enable access to Firestore and other Firebase services.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

/**
 * Root Firebase application instance initialized with the project configuration.
 */
const app = initializeApp(firebaseConfig);
/**
 * Firestore database instance bound to the initialized Firebase app.
 *
 * Used by the repository code to read and write collections.
 */
export const db = getFirestore(app);

/**
 * Firestore collection name used to persist and retrieve match documents.
 */
export const MATCHES_COLLECTION = 'matches';

/**
 * Firestore collection name used to persist and retrieve player documents.
 */
export const PLAYERS_COLLECTION = 'players';
