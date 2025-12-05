require('dotenv').config();
const app = require('./app');
const { connectMongo } = require('./configurations/database-config/mongoDB.js');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectMongo();
    app.listen(PORT, () => console.log(`Backend server listening on port ${PORT}`));
  } catch (err) {
    console.error('Startup failed. Exiting process.');
    process.exit(1);
  }
}

start();
