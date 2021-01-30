module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/test/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/test/helpers'],
  coveragePathIgnorePatterns: ['<rootDir>/src/test/helpers']
};
