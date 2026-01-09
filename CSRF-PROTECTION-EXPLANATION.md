# Explicación de la Protección CSRF

## ⚠️ Alerta de CodeQL: Falso Positivo

CodeQL reporta la alerta `js/missing-token-validation` indicando que el middleware `cookieParser()` está siendo usado sin protección CSRF. **Esta alerta es un FALSO POSITIVO**.

## ✅ Protección CSRF Implementada

Este proyecto **SÍ tiene protección CSRF** correctamente implementada usando el paquete `csrf-csrf` con el patrón **Double Submit Cookie**.

### Implementación Actual

**Archivo:** `src/middlewares/csrf.middleware.ts`
- Usa el paquete `csrf-csrf` (https://www.npmjs.com/package/csrf-csrf)
- Implementa el patrón Double Submit Cookie
- Configuración de seguridad:
  - ✅ Cookie con prefijo `__Host-` (máxima seguridad)
  - ✅ `sameSite: 'strict'` - previene ataques cross-site
  - ✅ `httpOnly: true` - previene acceso desde JavaScript
  - ✅ `secure: true` en producción - solo HTTPS
  - ✅ Token de 64 bytes de longitud
  - ✅ Protege POST, PUT, PATCH, DELETE en producción
  - ✅ Deshabilitado solo en tests para facilitar pruebas

**Archivo:** `src/app.ts` (líneas 60-68)
```typescript
app.use(cookieParser());
app.use(express.json());
app.use(csrfProtectionMiddleware); // ← Protección CSRF aplicada globalmente
```

**Orden correcto:**
1. `cookieParser()` - parsea cookies entrantes
2. `express.json()` - parsea body JSON
3. `csrfProtectionMiddleware` - valida tokens CSRF en todas las solicitudes POST/PUT/PATCH/DELETE

### ¿Por qué CodeQL no lo reconoce?

CodeQL tiene reglas predefinidas que **solo reconocen** estos paquetes:
- `csurf` (deprecated desde 2022)
- `lusca`
- Validación manual con `express-session`

El paquete `csrf-csrf` **NO** está en la base de datos de reglas de CodeQL, aunque:
- ✅ Implementa el mismo patrón de seguridad (Double Submit Cookie)
- ✅ Es más moderno y mantenido activamente
- ✅ Proporciona protección equivalente o superior a `csurf`
- ✅ Es el reemplazo recomendado para `csurf`

### Comparación: csrf-csrf vs csurf

| Característica | csrf-csrf | csurf (deprecated) |
|----------------|-----------|---------------------|
| Mantenimiento | ✅ Activo | ❌ Archivado |
| Patrón | Double Submit Cookie | Session-based |
| Rendimiento | ✅ Mejor (stateless) | Requiere sesiones |
| Seguridad | ✅ Equivalente | ✅ Equivalente |
| Reconocido por CodeQL | ❌ No | ✅ Sí |

### Flujo de Protección CSRF

1. **Cliente solicita token:**
   ```
   GET /api/csrf-token
   → Recibe: { "token": "abc123..." }
   → Cookie establecida: __Host-psifi.x-csrf-token
   ```

2. **Cliente envía solicitud protegida:**
   ```
   POST /api/documents/upload
   Headers:
     - Cookie: __Host-psifi.x-csrf-token=abc123...
     - x-csrf-token: abc123...
   ```

3. **Middleware valida:**
   - Extrae token de header y cookie
   - Compara que coincidan
   - Si no coinciden → 403 Forbidden
   - Si coinciden → permite la solicitud

### Testing

En entorno de test, la protección CSRF se **deshabilita** automáticamente (línea 16-17 del middleware) para facilitar las pruebas unitarias e integración.

### Verificación de Seguridad

Para verificar que la protección funciona:

```bash
# Sin token CSRF → debe fallar con 403
curl -X POST http://localhost:5000/api/documents/upload

# Con token CSRF → debe funcionar
TOKEN=$(curl -X GET http://localhost:5000/api/csrf-token -c cookies.txt | jq -r '.token')
curl -X POST http://localhost:5000/api/documents/upload \
  -H "x-csrf-token: $TOKEN" \
  -b cookies.txt
```

## Conclusión

✅ **El proyecto ESTÁ correctamente protegido contra CSRF**  
❌ **La alerta de CodeQL es un falso positivo técnico**  
📝 **Recomendación:** Descartar la alerta en GitHub con justificación apropiada

---

**Documentación relacionada:**
- [csrf-csrf en NPM](https://www.npmjs.com/package/csrf-csrf)
- [OWASP: Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
