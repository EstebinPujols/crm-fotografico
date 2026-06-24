require('dotenv').config();

/**
 * Configuración de Knex — una sola fuente de verdad.
 * En desarrollo usa Supabase PostgreSQL.
 * La migración y seed se ejecutan contra este config.
 */
module.exports = {
  development: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    },
    migrations: {
      directory: './migrations',
      extension: 'js',
    },
    seeds: {
      directory: './seeds',
      extension: 'js',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: './migrations',
      extension: 'js',
    },
    seeds: {
      directory: './seeds',
      extension: 'js',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
