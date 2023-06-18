module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  testPathIgnorePatterns: [],
  coveragePathIgnorePatterns: ['<rootDir>/src/test/helpers']
};
