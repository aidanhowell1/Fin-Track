import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, secret) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const generateToken = (user: { id: string; email: string }) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  // Using consistent payload structure with 'id' instead of 'userId'
  return jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  try {
    return jwt.verify(token, secret) as { id: string; email: string };
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid token');
  }
};