/**
 * Converte una data dal frontend (locale) al formato corretto per il database
 * Non applica offset manuale - JavaScript gestisce automaticamente il fuso orario locale
 */
export function adjustDateForDatabase(dateString: string | Date): Date {
  return new Date(dateString);
}

/**
 * Converte una data dal database al formato corretto per il frontend
 * Non applica offset manuale - JavaScript gestisce automaticamente il fuso orario locale
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