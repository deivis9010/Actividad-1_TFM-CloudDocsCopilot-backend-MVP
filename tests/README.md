# Tests

Este directorio contiene los tests del proyecto CloudDocs Backend.

## Estructura

```
tests/
├── integration/     # Tests de integración (endpoints)
│   ├── auth.test.js
│   ├── documents.test.js
│   └── folders.test.js
├── unit/           # Tests unitarios (servicios, utilidades)
│   └── jwt.service.test.js
├── setup.js        # Configuración global de tests
└── README.md
```

## Tipos de Tests

### Tests de Integración (`integration/`)
Prueban los endpoints completos de la API, incluyendo:
- Autenticación (registro y login)
- Gestión de documentos (subida, listado, compartir, eliminar)
- Gestión de carpetas (crear, listar, renombrar, eliminar)

### Tests Unitarios (`unit/`)
Prueban funciones y servicios individuales, como:
- JWT Service (generación y verificación de tokens)

## Ejecución

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests con cobertura
```bash
npm run test:coverage
```

### Ejecutar tests en modo watch
```bash
npm run test:watch
```

### Ejecutar solo tests de integración
```bash
npm test -- tests/integration
```

### Ejecutar solo tests unitarios
```bash
npm test -- tests/unit
```

## Configuración

### Base de datos de prueba
Los tests de integración usan una base de datos separada definida en:
- Variable de entorno: `TEST_MONGO_URI`
- Por defecto: `mongodb://127.0.0.1:27017/clouddocs-test`

**Importante:** Asegúrate de que MongoDB esté corriendo antes de ejecutar los tests de integración.

### Variables de entorno
Puedes crear un archivo `.env.test` con las configuraciones específicas para tests:
```
TEST_MONGO_URI=mongodb://127.0.0.1:27017/clouddocs-test
JWT_SECRET=test-secret-key
JWT_EXPIRES_IN=1h
```

## Escribir Nuevos Tests

### Test de Integración
```javascript
const { request, app } = require('../setup');

describe('Mi Endpoint', () => {
  let authToken;

  beforeEach(async () => {
    // Setup: registrar usuario y obtener token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass123' });
    
    authToken = loginResponse.body.token;
  });

  it('debería hacer algo', async () => {
    const response = await request(app)
      .get('/api/mi-endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### Test Unitario
```javascript
const miServicio = require('../../src/services/mi-servicio');

describe('Mi Servicio', () => {
  it('debería procesar datos correctamente', () => {
    const resultado = miServicio.procesarDatos({ input: 'test' });
    expect(resultado).toBe('esperado');
  });
});
```

## Cobertura de Código

La configuración de Jest está establecida para generar reportes de cobertura. Los umbrales mínimos son:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Puedes ver el reporte detallado en `coverage/lcov-report/index.html` después de ejecutar `npm run test:coverage`.

## Notas Importantes

1. **Limpieza de datos:** Cada test de integración limpia la base de datos después de ejecutarse para mantener independencia entre tests.

2. **Archivos temporales:** Los tests de documentos crean archivos temporales que se limpian automáticamente.

3. **Timeout:** Los tests tienen un timeout de 10 segundos configurado en `jest.config.js` para permitir operaciones de base de datos.

4. **Mocks:** Los mocks se limpian automáticamente entre tests gracias a la configuración de Jest.
