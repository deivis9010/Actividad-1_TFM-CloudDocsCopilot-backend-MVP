const { request, app } = require('../setup');
const path = require('path');
const fs = require('fs');

describe('Document Endpoints', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Usuario Test',
        email: 'doc-test@example.com',
        password: 'password123'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'doc-test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
  });

  describe('POST /api/documents/upload', () => {
    it('debería subir un documento', async () => {
      // Crear un archivo temporal para el test
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'Contenido de prueba');

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('originalname');

      // Limpiar archivo temporal
      fs.unlinkSync(testFilePath);
    });

    it('debería fallar sin archivo', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/documents', () => {
    it('debería listar los documentos del usuario', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('debería fallar sin autenticación', async () => {
      await request(app)
        .get('/api/documents')
        .expect(401);
    });
  });

  describe('POST /api/documents/:id/share', () => {
    it('debería compartir un documento con otros usuarios', async () => {
      // Crear otro usuario
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Usuario 2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const user2Login = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user2@example.com',
          password: 'password123'
        });

      const user2Id = user2Login.body.user.id;

      // Subir documento
      const testFilePath = path.join(__dirname, 'share-test.txt');
      fs.writeFileSync(testFilePath, 'Para compartir');

      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      const docId = uploadResponse.body.id;

      // Compartir documento
      const response = await request(app)
        .post(`/api/documents/${docId}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userIds: [user2Id] })
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Limpiar
      fs.unlinkSync(testFilePath);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('debería eliminar un documento', async () => {
      // Subir documento
      const testFilePath = path.join(__dirname, 'delete-test.txt');
      fs.writeFileSync(testFilePath, 'Para eliminar');

      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      const docId = uploadResponse.body.id;

      // Eliminar documento
      await request(app)
        .delete(`/api/documents/${docId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Limpiar
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });
});
