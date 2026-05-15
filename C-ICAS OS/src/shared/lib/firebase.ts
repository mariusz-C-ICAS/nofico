/**
 * Data: 2026-05-10 13:12
 * Utworzył: Agent AI
 * Zmiany: Inicjalizacja usług Firebase (Auth, Firestore) ze wsparciem domyślnego configu dla AI Studio.
 * Opis: Punkt dostępowy do usług backendowych. Zapewnia autoryzację i dostęp do dedykowanej bazy Cloud Firestore.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getPerformance } from "firebase/performance";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import firebaseConfig from '../../../firebase-applet-config.json';

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);

// SEC-05: App Check Initialization
if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6Lc5_config_placeholder'),
    isTokenAutoRefreshEnabled: true
  });
}

// Inicjalizacja Performance Monitoring (Crashlytics web equivalent)
if (typeof window !== 'undefined') {
  getPerformance(app);
}

// Inicjalizacja Autoryzacji (Google Auth)
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Inicjalizacja Bazy Danych
// CRITICAL: W ym środowisku musimy jawnie wskazać id bazy:
// Uruchamiamy wsparcie offline PWA (IndexedDB)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);

export default app;
