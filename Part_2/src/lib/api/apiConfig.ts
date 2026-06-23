/**
 * API Configuration
 */
export const API_CONFIG = {
    // Base URL for API endpoints
    // BASE_URL: "http://krysto.viareel.com",
    BASE_URL: import.meta.env.VITE_BACKEND_BASE_URI,
    VERITAS_URI: import.meta.env.VITE_VERITAS_URI,
    //BASE_URL: 'https://c35d-14-142-182-251.ngrok-free.app', // ngrok url

    // Request timeout in milliseconds
    TIMEOUT: 1000000
}
