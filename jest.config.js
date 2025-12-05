module.exports = {
  // Entorno de ejecución
  testEnvironment: 'node',

  // Patrón de archivos de test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Cobertura de código
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // Excluir el punto de entrada principal
    '!src/docs/**',
    '!**/node_modules/**'
  ],

  // Directorio de salida para reportes de cobertura
  coverageDirectory: 'coverage',

  // Umbrales de cobertura (opcional)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Timeout para tests (útil para tests de integración con DB)
  testTimeout: 10000,

  // Configuración de verbose para ver detalles de los tests
  verbose: true,

  // Limpiar mocks automáticamente entre tests
  clearMocks: true,

  // Restablecer mocks entre tests
  resetMocks: true,

  // Restaurar mocks entre tests
  restoreMocks: true
};
