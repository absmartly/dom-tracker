module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/index.ts'],
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
  testMatch: ['**/__tests__/**/*.+(spec|test).+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: { '^.+\\.(ts|tsx)$': 'ts-jest' }
};
