import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateAccessToken } from '~/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ 
        error: 'Refresh token mancante' 
      }, { status: 401 });
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return NextResponse.json({ 
        error: 'Refresh token non valido o scaduto' 
      }, { status: 401 });
    }

    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

   
    const response = NextResponse.json({
      accessToken: newAccessToken,
    });

   
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, 
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ 
      error: 'Errore durante il refresh del token' 
    }, { status: 500 });
  }
}
