import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import axios from 'axios';

interface CognitoPublicKey {
  alg: string;
  e: string;
  kid: string;
  kty: string;
  n: string;
  use: string;
}

interface CognitoPublicKeys {
  keys: CognitoPublicKey[];
}

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    email_verified: boolean;
    aud: string;
    iss: string;
    token_use: string;
    username: string;
  };
}

class CognitoJWTVerifier {
  private jwks: { [kid: string]: string } = {};
  private jwksUri: string;
  
  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    
    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is required');
    }
    
    this.jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  }

  private async getPublicKeys(): Promise<void> {
    try {
      const response = await axios.get<CognitoPublicKeys>(this.jwksUri);
      const keys = response.data.keys;

      keys.forEach((key) => {
        this.jwks[key.kid] = jwkToPem(key as any);
      });
    } catch (error) {
      console.error('Error fetching Cognito public keys:', error);
      throw new Error('Failed to fetch Cognito public keys');
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      // Decode token header to get kid
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string' || !decodedHeader.header.kid) {
        throw new Error('Invalid token format');
      }

      const kid = decodedHeader.header.kid;

      // Get public keys if not cached
      if (!this.jwks[kid]) {
        await this.getPublicKeys();
      }

      const publicKey = this.jwks[kid];
      if (!publicKey) {
        throw new Error('Public key not found for token');
      }

      // Verify token
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        audience: process.env.COGNITO_CLIENT_ID,
        issuer: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
      });

      return decoded;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Invalid or expired token');
    }
  }
}

// Singleton instance
const cognitoVerifier = new CognitoJWTVerifier();

/**
 * Middleware to authenticate requests using Cognito JWT tokens
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        error: 'Access denied', 
        message: 'No token provided' 
      });
      return;
    }

    // Verify the JWT token
    const decoded = await cognitoVerifier.verifyToken(token);

    // Attach user info to request
    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      email_verified: decoded.email_verified,
      aud: decoded.aud,
      iss: decoded.iss,
      token_use: decoded.token_use,
      username: decoded.username || decoded['cognito:username']
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Invalid or expired token' 
    });
  }
};

/**
 * Middleware to optionally authenticate requests (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = await cognitoVerifier.verifyToken(token);
      req.user = {
        sub: decoded.sub,
        email: decoded.email,
        email_verified: decoded.email_verified,
        aud: decoded.aud,
        iss: decoded.iss,
        token_use: decoded.token_use,
        username: decoded.username || decoded['cognito:username']
      };
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    console.warn('Optional auth failed:', error);
    next();
  }
};

/**
 * Middleware to check if user has verified email
 */
export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please sign in to continue'
    });
    return;
  }

  if (!req.user.email_verified) {
    res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email address before accessing this resource'
    });
    return;
  }

  next();
};

/**
 * Get user info from authenticated request
 */
export const getAuthenticatedUser = (req: AuthenticatedRequest) => {
  return req.user || null;
};

export type { AuthenticatedRequest };