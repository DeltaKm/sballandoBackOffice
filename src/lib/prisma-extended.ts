import { PrismaClient } from '@prisma/client';
import { adjustDateForDatabase, adjustDateForFrontend } from './timezone';

class ExtendedPrismaClient extends PrismaClient {
  constructor() {
    super();
    
    // Middleware per aggiustare le date automaticamente
    this.$use(async (params, next) => {
      // Per operazioni di scrittura (create, update)
      if ((params.action === 'create' || params.action === 'update') && 
          params.model === 'events') {
        
        if (params.args.data?.datetime_start) {
          params.args.data.datetime_start = adjustDateForDatabase(params.args.data.datetime_start);
        }
        
        if (params.args.data?.datetime_end) {
          params.args.data.datetime_end = adjustDateForDatabase(params.args.data.datetime_end);
        }
      }
      
      const result = await next(params);
      
      // Per operazioni di lettura - aggiusta le date in uscita
      if ((params.action === 'findUnique' || params.action === 'findMany' || 
           params.action === 'findFirst') && params.model === 'events') {
        
        if (Array.isArray(result)) {
          return result.map(item => adjustEventDatesForOutput(item));
        } else if (result) {
          return adjustEventDatesForOutput(result);
        }
      }
      
      return result;
    });
  }
  $use(arg0: (params: any, next: any) => Promise<any>) {
    throw new Error('Method not implemented.');
  }
}

function adjustEventDatesForOutput(event: any) {
  if (!event) return event;
  
  return {
    ...event,
    datetime_start: event.datetime_start ? adjustDateForFrontend(event.datetime_start) : null,
    datetime_end: event.datetime_end ? adjustDateForFrontend(event.datetime_end) : null,
  };
}

export const prisma = new ExtendedPrismaClient();