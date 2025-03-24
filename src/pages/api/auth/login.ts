import { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.error('Login error: Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log(`Attempting login for email: ${email}`);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        currency: true,
        theme: true,
      },
    });

    if (!user) {
      console.error(`Login error: User not found for email ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Hash password with JWT_SECRET as salt
    const hashedPassword = createHash('sha256')
      .update(password + process.env.JWT_SECRET)
      .digest('hex');

    console.log('Password verification attempt');

    if (hashedPassword !== user.password) {
      console.error(`Login error: Invalid password for user ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    // Return user data and token
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
      currency: user.currency,
      theme: user.theme,
    };

    console.log(`Login successful for user ${email}`);
    return res.status(200).json({
      user: userData,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}