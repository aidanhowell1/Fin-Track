import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

export const withAuth = (
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void | NextApiResponse>
) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      
      if (!secret) {
        console.error('JWT_SECRET is not defined');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      try {
        const decoded = jwt.verify(token, secret) as any;
        // Handle both id and userId in token payload
        const userId = decoded.id || decoded.userId;
        
        if (!userId) {
          console.error('Invalid token payload:', decoded);
          return res.status(401).json({ error: 'Invalid token payload' });
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true }
        });

        if (!user) {
          console.error('User not found for id:', userId);
          return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        return handler(req, res);
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError);
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};
