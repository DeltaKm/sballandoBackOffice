import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  surname: string;
  role: string;
  is_super_admin: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  status?: number;
}

export async function authenticateUser(): Promise<AuthResult> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('user_token')?.value;
    
    if (!token) {
      return {
        success: false,
        error: 'Token mancante',
        status: 401
      };
    }

    // Cerca l'utente nel database tramite il token
    const user = await prisma.user.findFirst({
      where: {
        user_token: token
      },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        is_super_admin: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'Token non valido o utente non trovato',
        status: 401
      };
    }

    return {
      success: true,
      user: user as AuthenticatedUser
    };

  } catch (error) {
    console.error('Errore durante l\'autenticazione:', error);
    return {
      success: false,
      error: 'Errore interno del server',
      status: 500
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function authorizeEventAccess(eventId: number, user: AuthenticatedUser): Promise<boolean> {
  try {
    // Se è super admin, ha sempre accesso
    if (user.is_super_admin) {
      return true;
    }

    // Verifica se è proprietario dell'evento o collaboratore accettato
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        OR: [
          { user_id: user.id }, // Proprietario
          {
            collaborators: {
              some: {
                user_id: user.id,
                status: 'accepted' // Collaboratore accettato
              }
            }
          }
        ]
      }
    });

    return !!event;

  } catch (error) {
    console.error('Errore durante l\'autorizzazione:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}