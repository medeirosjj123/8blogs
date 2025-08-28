/**
 * @tatame/config - Shared configuration for Tatame platform
 * 
 * This package exports common configurations for:
 * - ESLint
 * - Prettier
 * - TypeScript
 */

module.exports = {
  eslint: require('./eslint.config'),
  prettier: require('./prettier.config'),
  // tsconfig is JSON and should be extended directly in tsconfig.json files
};