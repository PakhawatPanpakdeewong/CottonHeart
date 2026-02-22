import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load .docker.env file if it exists (for npm run dev)
// When using docker-compose, environment variables are automatically loaded
if (process.env.NODE_ENV !== 'production') {
  const envPath = resolve(process.cwd(), '.docker.env');
  if (existsSync(envPath)) {
    try {
      config({ path: envPath });
      console.log('Loaded .docker.env file');
    } catch (error) {
      console.error('Error loading .docker.env:', error);
    }
  } else {
    console.log('Note: .docker.env not found, using environment variables or defaults');
  }
}

// Database configuration from environment variables
// These will be loaded from .docker.env when using docker-compose
// For npm run dev, dotenv will load .docker.env automatically
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'cottonheart_dev',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,
};

// Log database config (without password for security)
console.log('Database config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  ssl: dbConfig.ssl ? 'enabled' : 'disabled'
});

// Create a connection pool
const pool = new Pool(dbConfig);

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

