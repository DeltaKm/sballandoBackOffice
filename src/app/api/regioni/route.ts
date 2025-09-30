import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Definisci i tipi per una migliore type safety
interface Comune {
  nome: string;
  cap: string;
}

interface Provincia {
  nome: string;
  sigla: string;
  comuni: Comune[];
}

interface Regione {
  nome: string;
  province: Map<string, Provincia>;
}

export async function GET() {
  try {
    // Recupera tutti i comuni dalla tabella comunis
    const comunis = await prisma.comunis.findMany({
      orderBy: [
        { regione: 'asc' },
        { provincia: 'asc' },
        { comune: 'asc' }
      ]
    });

    // Raggruppa per regione con typing appropriato
    const regioniMap = new Map<string, Regione>();
    
    comunis.forEach(comune => {
      const regioneNome = comune.regione;
      const provinciaNome = comune.provincia;
      const provinciaSigla = comune.provincia_sigla;
      
      // Se la regione non esiste, creala
      if (!regioniMap.has(regioneNome!)) {
        regioniMap.set(regioneNome!, {
          nome: regioneNome!,
          province: new Map<string, Provincia>()
        });
      }

      const regione = regioniMap.get(regioneNome!)!;

      // Se la provincia non esiste nella regione, creala
      if (!regione.province.has(provinciaNome!)) {
        regione.province.set(provinciaNome!, {
          nome: provinciaNome!,
          sigla: provinciaSigla!,
          comuni: []
        });
      }
      
      const provincia = regione.province.get(provinciaNome!)!;
      
      // Aggiungi il comune alla provincia
      provincia.comuni.push({
        nome: comune.comune!,
        cap: comune.cap!
      });
    });

    // Converti le Map in array per la risposta JSON con typing corretto
    const regioniFormatted = Array.from(regioniMap.entries()).map(([regioneNome, regione]) => ({
      nome: regioneNome,
      province: Array.from(regione.province.entries()).map(([provinciaNome, provincia]: [string, Provincia]) => ({
        nome: provinciaNome,
        sigla: provincia.sigla,
        comuni: provincia.comuni
      }))
    }));

    return NextResponse.json({
      success: true,
      data: regioniFormatted,
      count: regioniFormatted.length,
      totalComuni: comunis.length
    }, { status: 200 });

  } catch (error) {
    console.error("Errore nel recupero regioni dal database:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Errore nel recupero delle regioni dal database" 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST per ottenere dati filtrati
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      regione = null, 
      provincia = null, 
      provincia_sigla = null,
      only_regioni = false,
      only_province = false 
    } = body;

    let whereClause: any = {};
    
    if (regione) {
      whereClause.regione = regione;
    }
    
    if (provincia) {
      whereClause.provincia = provincia;
    }
    
    if (provincia_sigla) {
      whereClause.provincia_sigla = provincia_sigla;
    }

    const comunis = await prisma.comunis.findMany({
      where: whereClause,
      orderBy: [
        { regione: 'asc' },
        { provincia: 'asc' },
        { comune: 'asc' }
      ]
    });

    // Se richiede solo le regioni
    if (only_regioni) {
      const regioni = [...new Set(comunis.map(c => c.regione))].sort();
      return NextResponse.json({
        success: true,
        data: regioni.map(nome => ({ nome })),
        count: regioni.length
      });
    }

    // Se richiede solo le province
    if (only_province) {
      const provinceSet = new Set<string>();
      comunis.forEach(c => {
        provinceSet.add(JSON.stringify({
          nome: c.provincia,
          sigla: c.provincia_sigla,
          regione: c.regione
        }));
      });
      
      const province = Array.from(provinceSet).map(p => JSON.parse(p)).sort((a, b) => a.nome.localeCompare(b.nome));
      
      return NextResponse.json({
        success: true,
        data: province,
        count: province.length
      });
    }

    // Altrimenti raggruppa normalmente con typing appropriato
    const regioniMap = new Map<string, Regione>();
    
    comunis.forEach(comune => {
      const regioneNome = comune.regione;
      const provinciaNome = comune.provincia;
      const provinciaSigla = comune.provincia_sigla;
      
      if (!regioniMap.has(regioneNome!)) {
        regioniMap.set(regioneNome!, {
          nome: regioneNome!,
          province: new Map<string, Provincia>()
        });
      }
      
      const regione = regioniMap.get(regioneNome!)!;
      
      if (!regione.province.has(provinciaNome!)) {
        regione.province.set(provinciaNome!, {
          nome: provinciaNome!,
          sigla: provinciaSigla!,
          comuni: []
        });
      }
      
      const provincia = regione.province.get(provinciaNome!)!;
      
      provincia.comuni.push({
        nome: comune.comune!,
        cap: comune.cap!
      });
    });

    const regioniFormatted = Array.from(regioniMap.entries()).map(([regioneNome, regione]) => ({
      nome: regioneNome,
      province: Array.from(regione.province.entries()).map(([provinciaNome, provincia]: [string, Provincia]) => ({
        nome: provinciaNome,
        sigla: provincia.sigla,
        comuni: provincia.comuni
      }))
    }));

    return NextResponse.json({
      success: true,
      data: regioniFormatted,
      count: regioniFormatted.length,
      totalComuni: comunis.length
    }, { status: 200 });

  } catch (error) {
    console.error("Errore nel recupero dati:", error);
    return NextResponse.json(
      { success: false, error: "Errore nel recupero dei dati" }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}