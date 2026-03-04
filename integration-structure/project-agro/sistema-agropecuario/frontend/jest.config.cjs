module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // Run this before the test environment is set up to ensure globals exist early
  setupFiles: ['<rootDir>/src/jestSetupGlobals.js'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/','<rootDir>/tests/colheitas.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }]
  },
};
