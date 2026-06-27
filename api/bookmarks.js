const { sql } = require('@vercel/postgres');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

// Middleware-like function to verify token
function authenticate(request) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = async function handler(request, response) {
  let user;
  try {
    user = authenticate(request);
  } catch (error) {
    return response.status(401).json({ error: error.message });
  }

  if (request.method === 'GET') {
    // Fetch all bookmarks for the user
    try {
      const { rows } = await sql`
        SELECT anime_id, status, updated_at 
        FROM bookmarks 
        WHERE user_id = ${user.userId}
      `;
      return response.status(200).json({ bookmarks: rows });
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return response.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  } 
  
  else if (request.method === 'POST') {
    // Update or insert a bookmark
    const { anime_id, status } = request.body;

    if (!anime_id) {
      return response.status(400).json({ error: 'anime_id is required' });
    }

    try {
      if (!status) {
        // If status is empty/falsy, it means remove the bookmark
        await sql`
          DELETE FROM bookmarks 
          WHERE user_id = ${user.userId} AND anime_id = ${anime_id}
        `;
        return response.status(200).json({ message: 'Bookmark removed' });
      } else {
        // Upsert bookmark
        await sql`
          INSERT INTO bookmarks (user_id, anime_id, status)
          VALUES (${user.userId}, ${anime_id}, ${status})
          ON CONFLICT (user_id, anime_id) 
          DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
        `;
        return response.status(200).json({ message: 'Bookmark updated' });
      }
    } catch (error) {
      console.error('Error updating bookmark:', error);
      return response.status(500).json({ error: 'Failed to update bookmark' });
    }
  }
  
  else {
    return response.status(405).json({ error: 'Method not allowed' });
  }
};
