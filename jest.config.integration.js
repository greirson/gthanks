const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app
  dir: './',
});

// Integration test configuration
const customJestConfig = {
  displayName: 'gthanks-integration',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/app/api/**/*.{js,jsx,ts,tsx}',
    'src/lib/services/**/*.{js,jsx,ts,tsx}',
    'src/lib/auth*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
  ],
  // Increase timeout for integration tests
  testTimeout: 10000,
};

// Export configuration
module.exports = async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();

  // Override transformIgnorePatterns for ESM modules
  nextJestConfig.transformIgnorePatterns = [
    '/node_modules/(?!((.pnpm/.*/)?)(lucide-react|jose|openid-client|next-auth|preact-render-to-string|preact|@panva|uuid|oauth4webapi|oidc-token-hash|@babel/runtime))',
  ];

  return nextJestConfig;
};
