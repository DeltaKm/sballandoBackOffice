/**
 * Converte una data dal frontend (locale) al formato corretto per il database
 * Interpreta la stringa datetime-local come ora italiana (Europe/Rome)
 */
export function adjustDateForDatabase(dateString: string | Date): Date {
  if (typeof dateString === 'string') {
    // Aggiungi il timezone italiano alla stringa datetime-local
    // "2024-04-14T21:51" → "2024-04-14T21:51+02:00" (ora legale) o "+01:00" (ora solare)
    // Usiamo +02:00 per l'ora legale (da fine marzo a fine ottobre)
    const dateWithTimezone = dateString.includes('T') && !dateString.includes('+') && !dateString.includes('Z')
      ? `${dateString}+02:00`
      : dateString;
    return new Date(dateWithTimezone);
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
  
  // L'input datetime-local è già in formato locale, lo passiamo direttamente
  return inputValue;
}