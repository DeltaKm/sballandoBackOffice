/**
 * Converte una data dal frontend (locale) al formato corretto per il database
 * Interpreta la stringa datetime-local come ora italiana (Europe/Rome)
 */
export function adjustDateForDatabase(dateString: string | Date): Date {
  if (typeof dateString === 'string') {
    // Se arriva da input datetime-local (senza timezone), interpretalo come Europe/Rome
    if (dateString.includes('T') && !dateString.includes('+') && !dateString.includes('Z')) {
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (!match) {
        return new Date(dateString);
      }

      const [, y, m, d, h, min] = match;
      const year = Number(y);
      const month = Number(m);
      const day = Number(d);
      const hour = Number(h);
      const minute = Number(min);

      const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
      const initialOffsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), 'Europe/Rome');
      let correctedUtc = utcGuess - initialOffsetMinutes * 60_000;

      const finalOffsetMinutes = getTimeZoneOffsetMinutes(new Date(correctedUtc), 'Europe/Rome');
      if (finalOffsetMinutes !== initialOffsetMinutes) {
        correctedUtc = utcGuess - finalOffsetMinutes * 60_000;
      }

      return new Date(correctedUtc);
    }

    return new Date(dateString);
  }
  return new Date(dateString);
}

/**
 * Converte una data dal database al formato corretto per il frontend
 * La data nel DB è già corretta, la restituiamo così com'è
 */
export function adjustDateForFrontend(date: Date): Date {
  return new Date(date);
}

/**
 * Middleware per aggiustare automaticamente le date in un oggetto
 */
export function adjustDatesInObject<T extends Record<string, any>>(
  obj: T, 
  dateFields: (keyof T)[], 
  direction: 'toDatabase' | 'toFrontend'
): T {
  const adjusted = { ...obj };
  
  dateFields.forEach(field => {
    if (adjusted[field]) {
      if (direction === 'toDatabase') {
        adjusted[field] = adjustDateForDatabase(adjusted[field]) as T[keyof T];
      } else {
        adjusted[field] = adjustDateForFrontend(adjusted[field]) as T[keyof T];
      }
    }
  });
  
  return adjusted;
}

/**
 * Hook per aggiustare automaticamente le date negli eventi
 */
export function adjustEventDates<T extends { datetime_start?: any; datetime_end?: any }>(
  eventData: T, 
  direction: 'toDatabase' | 'toFrontend'
): T {
  return adjustDatesInObject(eventData, ['datetime_start', 'datetime_end'], direction);
}

/**
 * Converte una data dal database al formato datetime-local per input HTML
 * JavaScript gestisce automaticamente il timezone locale del browser
 */
export function dateToLocalInput(dateString: string | Date): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // JavaScript converte automaticamente al fuso orario locale
  const adjustedDate = adjustDateForFrontend(date);
  
  // Formato per input datetime-local: YYYY-MM-DDTHH:mm
  const year = adjustedDate.getFullYear();
  const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
  const day = String(adjustedDate.getDate()).padStart(2, '0');
  const hours = String(adjustedDate.getHours()).padStart(2, '0');
  const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converte una stringa dall'input datetime-local al formato Date per l'invio al server
 */
export function localInputToDate(inputValue: string): string {
  if (!inputValue) return '';
  return inputValue;
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return (asUTC - date.getTime()) / 60_000;
}