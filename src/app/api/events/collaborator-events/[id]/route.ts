import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user_token } = await request.json();
    const eventId = params.id;

    // Validazione
    if (!user_token || !eventId) {
      return NextResponse.json(
        { error: "Token utente ed ID evento sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🔍 Richiesta dettaglio evento collaboratore:', { 
      eventId,
      user_token: user_token.substring(0, 8) + '...' 
    });

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: {
        id: true,
        role: true,
        email: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    console.log('👤 Utente che fa la richiesta:', user.email);

    // Verifica che l'utente sia effettivamente collaboratore di questo evento
    const collaboration = await prisma.collaborators.findFirst({
      where: {
        event_id: parseInt(eventId),
        user_id: user.id
      },
      select: {
        id: true,
        guest_enabled: true,
        vidimate_enabled_product: true,
        vidimate_enabled_entry: true,
        role: true
      }
    });

    if (!collaboration && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Non sei autorizzato a visualizzare questo evento" },
        { status: 403 }
      );
    }

    console.log('✅ Collaborazione trovata:', collaboration?.id);

    // Recupera i dettagli dell'evento
    const event = await prisma.events.findUnique({
      where: { id: parseInt(eventId) },
      include: {
        location_: {
          select: {
            id: true,
            name: true,
            address: true,
            logo: true
          }
        },
        event_music_genres: {
          include: {
            music_genre: {
              select: {
                id: true,
                label: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento non trovato" },
        { status: 404 }
      );
    }

    console.log('📅 Evento trovato:', event.title);

    // Recupera i prodotti assegnati al collaboratore
    const assignedProducts = await prisma.products.findMany({
      where: {
        event_id: parseInt(eventId),
        user_id: user.id
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log('🛍️ Prodotti assegnati:', assignedProducts.length);

    // Recupera gli ingressi assegnati al collaboratore
    const assignedEntryTypes = await prisma.entry_types.findMany({
      where: {
        event_id: parseInt(eventId),
        user_id: user.id
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log('🎫 Ingressi assegnati:', assignedEntryTypes.length);

    // Recupera gli utenti invitati (se ha permessi di gestione ospiti)
    let invitedUsers: never[] = [];
    if (collaboration?.guest_enabled || user.role === 'SUPERADMIN') {
      // TODO: Implementare tabella inviti quando sarà disponibile
      // Per ora restituiamo array vuoto
      invitedUsers = [];
    }

    // Calcola statistiche del collaboratore
    const productStats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN paid = 'paid' THEN 1 END) as sold_count,
        COUNT(CASE WHEN burned = 1 THEN 1 END) as validated_count,
        SUM(CASE WHEN paid = 'paid' THEN price ELSE 0 END) as revenue
      FROM products 
      WHERE event_id = ${parseInt(eventId)} 
      AND user_id = ${user.id}
    ` as Array<{
      sold_count: bigint;
      validated_count: bigint;
      revenue: number;
    }>;

    const entryStats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN paid = 'paid' THEN 1 END) as sold_count,
        COUNT(CASE WHEN burned = 1 THEN 1 END) as validated_count,
        SUM(CASE WHEN paid = 'paid' THEN price ELSE 0 END) as revenue
      FROM entry_types 
      WHERE event_id = ${parseInt(eventId)} 
      AND old_user_id = ${user.id}
    ` as Array<{
      sold_count: bigint;
      validated_count: bigint;
      revenue: number;
    }>;

    const productStatsData = productStats[0] || { sold_count: 0n, validated_count: 0n, revenue: 0 };
    const entryStatsData = entryStats[0] || { sold_count: 0n, validated_count: 0n, revenue: 0 };

    // Aggiungi statistiche ai prodotti e ingressi
    const productsWithStats = await Promise.all(
      assignedProducts.map(async (product) => {
        const stats = await prisma.$queryRaw`
          SELECT 
            COUNT(CASE WHEN paid = 'paid' THEN 1 END) as sold_count,
            COUNT(CASE WHEN burned = 1 THEN 1 END) as validated_count
          FROM products 
          WHERE id = ${product.id}
        ` as Array<{ sold_count: bigint; validated_count: bigint }>;

        const productStats = stats[0] || { sold_count: 0n, validated_count: 0n };

        return {
          ...product,
          sold_count: Number(productStats.sold_count),
          validated_count: Number(productStats.validated_count)
        };
      })
    );

    const entriesWithStats = await Promise.all(
      assignedEntryTypes.map(async (entry) => {
        const stats = await prisma.$queryRaw`
          SELECT 
            COUNT(CASE WHEN paid = 'paid' AND old_user_id = ${user.id} THEN 1 END) as sold_count,
            COUNT(CASE WHEN burned = 1 AND old_user_id = ${user.id} THEN 1 END) as validated_count
          FROM entry_types 
          WHERE label = ${entry.label} AND event_id = ${parseInt(eventId)}
        ` as Array<{ sold_count: bigint; validated_count: bigint }>;

        const entryStatsData = stats[0] || { sold_count: 0n, validated_count: 0n };

        return {
          ...entry,
          sold_count: Number(entryStatsData.sold_count),
          validated_count: Number(entryStatsData.validated_count)
        };
      })
    );

    const response = {
      ...event,
      collaborator: {
        id: collaboration?.id || 0,
        permissions: {
          guest_enabled: collaboration?.guest_enabled || false,
          vidimate_enabled_product: collaboration?.vidimate_enabled_product || false,
          vidimate_enabled_entry: collaboration?.vidimate_enabled_entry || false
        },
        role: collaboration?.role || 'Collaboratore',
        label: collaboration?.role || 'Collaboratore'
      },
      assigned_products: productsWithStats,
      assigned_entry_types: entriesWithStats,
      invited_users: invitedUsers,
      statistics: {
        total_revenue: Number(productStatsData.revenue) + Number(entryStatsData.revenue),
        products_revenue: Number(productStatsData.revenue),
        entries_revenue: Number(entryStatsData.revenue),
        products_sold: Number(productStatsData.sold_count),
        entries_sold: Number(entryStatsData.sold_count),
        entries_validated: Number(entryStatsData.validated_count),
        products_validated: Number(productStatsData.validated_count)
      }
    };

    console.log('📊 Statistiche calcolate:', {
      totalRevenue: response.statistics.total_revenue,
      productsCount: response.assigned_products.length,
      entriesCount: response.assigned_entry_types.length,
      invitedCount: response.invited_users.length
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error("❌ Errore nel recupero dettaglio evento collaboratore:", error);
    
    return NextResponse.json(
      { 
        error: "Errore interno del server: " + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
