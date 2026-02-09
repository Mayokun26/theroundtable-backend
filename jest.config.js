/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/lambda-minimal.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/src/data/'],
  coverageThreshold: {
    global: {
      statements: 65,
      branches: 50,
      functions: 75,
      lines: 65,
    },
  },
};
