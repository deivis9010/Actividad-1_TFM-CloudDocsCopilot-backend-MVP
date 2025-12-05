require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./docs/openapi.json');
const authRoutes = require('./routes/auth.routes.js');
const documentRoutes = require('./routes/document.routes.js');
const folderRoutes = require('./routes/folder.routes.js');
const userRoutes = require('./routes/user.routes.js');
const HttpError = require('./models/error.model');
const errorHandler = require('./middlewares/error.middleware.js');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/users', userRoutes);

// Documentación Swagger/OpenAPI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: true }));
app.get('/api/docs.json', (_req, res) => res.json(openapiSpec));

// Ruta raíz de la API
app.get('/api', (req, res) => {
  res.json({ message: 'API running' });
});

// Captura 404 (después de todas las rutas definidas y antes del manejador de errores)
app.use((req, _res, next) => {
  next(new HttpError(404, 'Route not found'));
});

// Manejador global de errores
app.use(errorHandler);

module.exports = app;
