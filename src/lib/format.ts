
/**
 * Utilidades para formateo de valores
 * Versión 1.0.4
 */

/**
 * Formatea un número con separador de miles (punto)
 */
export function formatNumber(value: number | string): string {
  if (value === null || value === undefined) return '';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '';
  
  // Formatear con separador de miles usando puntos
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un precio con separador de miles (punto)
 */
export function formatPrice(value: number | string): string {
  if (value === null || value === undefined) return '$0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '$0';
  
  // Redondear a entero y formatear con separador de miles
  return '$' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Convierte un string con formato de número (con puntos) a número
 */
export function unformatNumber(value: string): number {
  if (!value) return 0;
  
  // Eliminar puntos y convertir a número
  const numericString = value.replace(/\./g, '');
  const num = parseFloat(numericString);
  
  return isNaN(num) ? 0 : num;
}
