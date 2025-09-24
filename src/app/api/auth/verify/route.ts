import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { user_token } = await request.json();

    if (!user_token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
    }

    const user = await prisma.users.findFirst({
      where: { user_token }, // Usa user_token invece di token
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        is_super_admin: true,
        user_token: true, // Includi il token nella risposta
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Errore verifica token:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}