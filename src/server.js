require('dotenv').config();
const app = require('./app');
const { prisma } = require('./utils/prisma');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('\n🛑 Server shutting down...');
  process.exit(0);
});

startServer();
