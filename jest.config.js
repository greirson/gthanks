const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Simplified Jest config for MVP - Ship Fast, Test Critical
const customJestConfig = {
  displayName: 'gthanks',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/e2e/',
    '.*\\.e2e\\.test\\.(js|jsx|ts|tsx)$',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // MVP: Simple coverage collection without thresholds
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/e2e/**',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();

  // Override transformIgnorePatterns to handle ESM modules
  nextJestConfig.transformIgnorePatterns = [
    '/node_modules/(?!((.pnpm/.*/)?)(lucide-react|jose|openid-client|next-auth|preact-render-to-string|preact|@panva|uuid|oauth4webapi|oidc-token-hash|@babel/runtime))',
  ];

  return nextJestConfig;
};
