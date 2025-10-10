
// try to fix ve4rcel build
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';

const ACCESS_TOKEN_EXPIRY = '15m'; 
const REFRESH_TOKEN_EXPIRY = '7d'; 

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

function ensureJWTSecrets() {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be defined in environment variables');
  }
}

export function generateAccessToken(payload: JWTPayload): string {
  ensureJWTSecrets();
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}


export function generateRefreshToken(payload: JWTPayload): string {
  ensureJWTSecrets();
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}


export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    ensureJWTSecrets();
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}


export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    ensureJWTSecrets();
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}


export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    const normalizedHash = hashedPassword.replace(/^\$2y\$/, '$2a$');
    
    return await bcrypt.compare(plainPassword, normalizedHash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}


export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 12; 
  return await bcrypt.hash(plainPassword, saltRounds);
}


export function extractTokenFromRequest(request: Request): string | null {
 
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies.access_token) {
      return cookies.access_token;
    }
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
