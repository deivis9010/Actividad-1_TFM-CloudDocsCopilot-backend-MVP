# Guía Rápida - Ejecutar Tests

## Pasos para ejecutar los tests

### 1. Asegúrate de que MongoDB esté corriendo

```powershell
# Verificar si MongoDB está corriendo
Get-Process mongod
```

Si no está corriendo, inícialo según tu configuración.

### 2. Configurar variables de entorno para tests (opcional)

Crea un archivo `.env.test` (puedes copiar `.env.test.example`):

```powershell
Copy-Item .env.test.example .env.test
```

### 3. Ejecutar los tests

```powershell
# Ejecutar todos los tests
npm test

# Ver con más detalle
npm test -- --verbose

# Ejecutar solo un archivo específico
npm test -- tests/integration/auth.test.js

# Generar reporte de cobertura
npm run test:coverage
```

## Tests disponibles

### Tests de Integración (API Endpoints)

- **auth.test.js**: Registro y login de usuarios
- **folders.test.js**: Gestión de carpetas (crear, listar, renombrar, eliminar)
- **documents.test.js**: Gestión de documentos (subir, listar, compartir, eliminar)

### Tests Unitarios

- **jwt.service.test.js**: Generación y verificación de tokens JWT

## Resultados esperados

Al ejecutar `npm test`, deberías ver algo como:

```
PASS  tests/unit/jwt.service.test.js
PASS  tests/integration/auth.test.js
PASS  tests/integration/folders.test.js
PASS  tests/integration/documents.test.js

Test Suites: 4 passed, 4 total
Tests:       XX passed, XX total
```

## Solución de problemas

### Error: "Cannot connect to MongoDB"
- Asegúrate de que MongoDB esté corriendo
- Verifica que `TEST_MONGO_URI` en `.env.test` sea correcto

### Tests timeout
- Los tests están configurados con timeout de 10 segundos
- Si siguen fallando, verifica la conexión a la base de datos

### "Port already in use"
- Los tests no inician un servidor real, usan Supertest internamente
- No debería haber conflicto de puertos

## Siguiente paso: Escribir más tests

Consulta `tests/README.md` para ver ejemplos de cómo escribir nuevos tests.
