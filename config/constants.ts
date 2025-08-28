// Centralized configuration for consistent port and URL management
export const CONFIG = {
  // API Configuration
  API: {
    PORT: process.env.PORT || 3001,
    HOST: process.env.API_HOST || 'localhost',
    get URL() {
      return process.env.API_URL || `http://${this.HOST}:${this.PORT}`;
    }
  },
  
  // Frontend Configuration
  FRONTEND: {
    PORT: process.env.VITE_PORT || 5173,
    HOST: process.env.VITE_HOST || 'localhost',
    get URL() {
      return process.env.FRONTEND_URL || `http://${this.HOST}:${this.PORT}`;
    }
  },
  
  // CORS Configuration
  CORS: {
    get ORIGINS() {
      const origins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ];
      
      // Add custom origins from environment
      if (process.env.CORS_ORIGINS) {
        origins.push(...process.env.CORS_ORIGINS.split(','));
      }
      
      return origins;
    },
    CREDENTIALS: true,
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }
} as const;

export default CONFIG;