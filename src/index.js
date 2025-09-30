import express from 'express';
import { connectMongo } from './configurations/database-config/mongo.js';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import folderRoutes from './routes/folder.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/folders', folderRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'API running' });
});

const PORT = process.env.PORT || 4000;
async function start() {
  try {
    await connectMongo();
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  } catch (err) {
    console.error('Startup failed. Exiting process.');
    process.exit(1);
  }
}

start();

