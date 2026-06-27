const { OAuth2Client } = require('google-auth-library');
const { sql } = require('@vercel/postgres');
const jwt = require('jsonwebtoken');

// You should set this in your Vercel Environment Variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

const client = new OAuth2Client(CLIENT_ID);

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { credential } = request.body;

  if (!credential) {
    return response.status(400).json({ error: 'Missing credential' });
  }

  try {
    // Verify the Google JWT token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists in database
    let userResult = await sql`SELECT id FROM users WHERE google_id = ${googleId}`;
    let userId;

    if (userResult.rowCount === 0) {
      // Create new user
      const insertResult = await sql`
        INSERT INTO users (google_id, email, name, picture)
        VALUES (${googleId}, ${email}, ${name}, ${picture})
        RETURNING id;
      `;
      userId = insertResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // Generate our own JWT session token
    const sessionToken = jwt.sign(
      { userId, email, name, picture },
      JWT_SECRET,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    return response.status(200).json({ 
      token: sessionToken,
      user: { id: userId, email, name, picture }
    });
  } catch (error) {
    console.error('Authentication Error:', error);
    return response.status(401).json({ error: 'Authentication failed' });
  }
};
