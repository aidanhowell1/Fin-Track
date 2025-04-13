import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { compare, hash } from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.error('Password API: No token provided');
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Decoded token:', decoded); // remove or limit logging in production
    } catch (error) {
      console.error('Password API: Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!decoded || !decoded.userId) {
      console.error('Password API: Invalid token payload:', decoded);
      return res.status(401).json({ error: 'Invalid token structure' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Password validation via regex (must meet security requirements)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      const errors: string[] = [];
      if (newPassword.length < 8) errors.push('be at least 8 characters long');
      if (!/(?=.*[a-z])/.test(newPassword)) errors.push('include a lowercase letter');
      if (!/(?=.*[A-Z])/.test(newPassword)) errors.push('include an uppercase letter');
      if (!/(?=.*\d)/.test(newPassword)) errors.push('include a number');
      if (!/(?=.*[@$!%*?&])/.test(newPassword)) errors.push('include a special character (@$!%*?&)');
      
      return res.status(400).json({
        error: `Password must ${errors.join(', ')}`,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { password: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify the provided current password matches the stored password
    const isValidPassword = await compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
