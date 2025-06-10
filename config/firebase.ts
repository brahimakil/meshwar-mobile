import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDDFulaaIA-AF7IaLzDsNqFL9Q6Tq4Hyfw",
  authDomain: "meshwar-ac389.firebaseapp.com",
  projectId: "meshwar-ac389",
  storageBucket: "meshwar-ac389.firebasestorage.app",
  messagingSenderId: "685691562595",
  appId: "1:685691562595:web:7f0d60853743ec68f8a656",
  measurementId: "G-KD8XL19TPE"
};

// Initialize Firebase only if it hasn't been initialized already
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
export default app; 