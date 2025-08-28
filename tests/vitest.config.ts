/**
 * Vitest Configuration for Unit and Integration Tests
 * Configured specifically for Tatame platform testing
 */

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Global test APIs
    globals: true,
    
    // Setup files - remove for now to avoid import issues
    // setupFiles: ['./tests/helpers/setup.ts'],
    
    // Test patterns
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/security/**/*.test.ts'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/e2e/**',
      '**/*.spec.ts'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './tests/coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '*.config.ts',
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
    
    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Parallel execution
    threads: true,
    maxThreads: 2,
    minThreads: 1,
    
    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },
  
  // Define environment for node resolution
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});