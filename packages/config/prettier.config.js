module.exports = {
  // Line Length
  printWidth: 100,
  
  // Tabs
  tabWidth: 2,
  useTabs: false,
  
  // Semicolons
  semi: true,
  
  // Quotes
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  
  // Trailing Commas
  trailingComma: 'es5',
  
  // Brackets
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow Functions
  arrowParens: 'always',
  
  // Range
  rangeStart: 0,
  rangeEnd: Infinity,
  
  // Misc
  requirePragma: false,
  insertPragma: false,
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  
  // End of Line
  endOfLine: 'lf',
  
  // Embedded Language Formatting
  embeddedLanguageFormatting: 'auto',
  
  // Single Attribute Per Line
  singleAttributePerLine: false,
  
  // Overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
      },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
      },
    },
  ],
};