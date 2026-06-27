const { sql } = require('@vercel/postgres');

module.exports = async function handler(request, response) {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create bookmarks table
    // anime_id is stored as VARCHAR because it might be a string from the Jikan API or similar
    await sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        anime_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, anime_id)
      );
    `;

    return response.status(200).json({ message: 'Database tables created successfully!' });
  } catch (error) {
    console.error('Error creating tables:', error);
    return response.status(500).json({ error: error.message });
  }
};
