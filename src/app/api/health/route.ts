import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Endpoint di debug per verificare le variabili d'ambiente
  const envCheck = {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Configurato' : '❌ Mancante',
    SMTP_HOST: process.env.SMTP_HOST || '❌ Mancante',
    SMTP_PORT: process.env.SMTP_PORT || '❌ Mancante',
    SMTP_SECURE: process.env.SMTP_SECURE || '❌ Mancante',
    SMTP_USER: process.env.SMTP_USER ? '✅ Configurato' : '❌ Mancante',
    SMTP_PASS: process.env.SMTP_PASS ? '✅ Configurato (nascosta)' : '❌ Mancante',
    SMTP_FROM: process.env.SMTP_FROM || '❌ Mancante',
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || '❌ Mancante',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '❌ Mancante',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ Configurato' : '❌ Mancante',
  };

  return NextResponse.json({
    message: 'Health Check - Environment Variables',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    variables: envCheck,
  });
}
