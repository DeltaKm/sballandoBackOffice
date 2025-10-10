import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyPassword, generateAccessToken, generateRefreshToken } from "~/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  console.log(' Login API called - JWT_SECRET exists:', !!process.env.JWT_SECRET);
  console.log(' Login API called - JWT_REFRESH_SECRET exists:', !!process.env.JWT_REFRESH_SECRET);
  
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        message: "Email e password sono obbligatori" 
      }, { status: 400 });
    }
   
    const user = await prisma.users.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        surname: true,
        role: true,
        token: true,
        created_at: true,
        picture: true,
        nickname: true,
      }
    });

    if (!user) {
      return NextResponse.json({ 
        message: "Credenziali non valide" 
      }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({ 
        message: "Account non configurato correttamente" 
      }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json({ 
        message: "Credenziali non valide" 
      }, { status: 401 });
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { password: _, ...userWithoutPassword } = user;
    
    const response = NextResponse.json({
      user: userWithoutPassword,
      accessToken, 
    });

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, 
      path: '/',
    });

    return response;

  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ 
      message: "Errore server" 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}