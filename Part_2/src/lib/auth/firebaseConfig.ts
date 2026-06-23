
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const requiredEnvVars = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const missingVars = Object.entries(requiredEnvVars).filter(([, value]) => !value)
if (missingVars.length > 0) {
    console.warn(`[Firebase Config Warning] Missing the following environment variables: ${missingVars.map(([key]) => `VITE_${key}`).join(', ')}`)
}

// Standalone Itinerary-Skeleton build: there is no real Firebase project and
// no auth flow. When the env vars are absent, fall back to harmless placeholder
// config so `getAuth()` returns a valid (never-used) Auth object instead of
// throwing `auth/invalid-api-key` at module load — which would white-screen the
// whole app. No network auth call is ever made in this demo.
const firebaseConfig = {
    apiKey: requiredEnvVars.apiKey || 'demo-itinerary-skeleton',
    authDomain: requiredEnvVars.authDomain || 'demo.firebaseapp.com',
    projectId: requiredEnvVars.projectId || 'demo-itinerary-skeleton',
    storageBucket: requiredEnvVars.storageBucket || 'demo.appspot.com',
    messagingSenderId: requiredEnvVars.messagingSenderId || '0000000000',
    appId: requiredEnvVars.appId || '1:0000000000:web:0000000000000000000000',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

const auth = getAuth(app)
const provider = new GoogleAuthProvider()
// provider.addScope("https://www.googleapis.com/auth/contacts.readonly");

provider.setCustomParameters({
    prompt: 'select_account'
})
export { app, provider, auth }
