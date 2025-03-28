
/**
 * Utilidades para depuración y registro de actividad
 * v1.0.3
 */

// Configurar si los logs están habilitados (para poder desactivarlos en producción)
const DEBUG_ENABLED = true;

// Configuración para categorías de log específicas
const CATEGORY_CONFIG = {
  'API': true,           // Logs relacionados con APIs
  'GEMINI-API': true,    // Logs específicos de Google Gemini API
  'Analysis': true,      // Logs de análisis de mensajes
  'Database': true,      // Logs de operaciones de base de datos
  'State': true,         // Logs de gestión de estado
  'Performance': true,   // Logs de rendimiento
  'UI': false            // Logs de UI (desactivados por defecto para reducir ruido)
};

/**
 * Comprueba si una categoría específica está habilitada para logging
 */
const isCategoryEnabled = (category: string): boolean => {
  if (category in CATEGORY_CONFIG) {
    return CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
  }
  return true; // Por defecto, todas las categorías están habilitadas
};

/**
 * Registra un mensaje de depuración en la consola
 */
export const logDebug = (area: string, message: string, data?: any) => {
  if (!DEBUG_ENABLED || !isCategoryEnabled(area)) return;
  
  console.log(`[${area}] ${message}`, data ? data : '');
};

/**
 * Registra una acción del usuario
 */
export const logUserAction = (action: string, details?: any) => {
  if (!DEBUG_ENABLED) return;
  
  console.log(`🔷 ACCIÓN: ${action}`, details ? details : '');
};

/**
 * Registra un error
 */
export const logError = (area: string, error: any, data?: any) => {
  if (!DEBUG_ENABLED) return;
  
  console.error(`❌ ERROR [${area}]: ${error?.message || error}`, error, data ? data : '');
};

/**
 * Registra un evento importante como operaciones de guardar, actualizar, etc.
 */
export const logOperation = (operation: string, result: 'success' | 'error', data?: any) => {
  if (!DEBUG_ENABLED) return;
  
  const icon = result === 'success' ? '✅' : '❌';
  console.log(`${icon} OPERACIÓN ${operation}: ${result.toUpperCase()}`, data ? data : '');
};

/**
 * Registra información sobre validación de formularios
 */
export const logValidation = (formName: string, isValid: boolean, errors?: any) => {
  if (!DEBUG_ENABLED) return;
  
  const icon = isValid ? '✓' : '✗';
  console.log(`${icon} VALIDACIÓN [${formName}]: ${isValid ? 'Válido' : 'Inválido'}`, errors ? errors : '');
};

/**
 * Formatea errores para mostrarlos al usuario
 */
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  
  if (error?.message) return error.message;
  
  if (error?.error) return formatErrorMessage(error.error);
  
  return 'Ha ocurrido un error inesperado';
};

/**
 * Registra eventos de rendimiento
 */
export const logPerformance = (operation: string, timeElapsed: number): void => {
  if (!DEBUG_ENABLED || !isCategoryEnabled('Performance')) return;
  
  console.log(`⏱️ RENDIMIENTO [${operation}]: ${timeElapsed.toFixed(2)}ms`);
};

/**
 * Registra eventos de generación de tarjetas o mensajes
 */
export const logCardGeneration = (cardId: string, status: 'started' | 'completed' | 'error', details?: any): void => {
  if (!DEBUG_ENABLED) return;
  
  const timestamp = new Date().toISOString();
  const icons = {
    started: '🔄',
    completed: '✅', 
    error: '❌'
  };
  
  const processingTime = details?.processingTime ? `(${details.processingTime.toFixed(2)}s)` : '';
  
  console.log(`${icons[status]} GENERACIÓN TARJETA [${timestamp}] ID:${cardId} - ${status.toUpperCase()} ${processingTime}`, details ? details : '');
};

/**
 * Registra eventos de almacenamiento y recuperación de estado
 */
export const logStateOperation = (operation: 'save' | 'load', storageKey: string, success: boolean, details?: any): void => {
  if (!DEBUG_ENABLED || !isCategoryEnabled('State')) return;
  
  const icon = success ? '💾' : '⚠️';
  console.log(`${icon} ESTADO [${operation.toUpperCase()}] ${storageKey}: ${success ? 'ÉXITO' : 'FALLIDO'}`, details ? details : '');
};

/**
 * Utilidad para medir el tiempo de ejecución de una función
 * @param fn Función a medir
 * @param operationName Nombre de la operación para el registro
 * @returns El resultado de la función
 */
export const measurePerformance = async <T>(fn: () => Promise<T>, operationName: string): Promise<T> => {
  const startTime = performance.now();
  try {
    const result = await fn();
    const endTime = performance.now();
    logPerformance(operationName, endTime - startTime);
    return result;
  } catch (error) {
    const endTime = performance.now();
    logPerformance(`${operationName} (ERROR)`, endTime - startTime);
    throw error;
  }
};

/**
 * Registra el inicio y fin de una operación
 */
export const logOperationStart = (operation: string, details?: any): number => {
  if (!DEBUG_ENABLED) return 0;
  
  const startTime = performance.now();
  console.log(`▶️ INICIO [${operation}]`, details ? details : '');
  return startTime;
};

export const logOperationEnd = (operation: string, startTime: number, details?: any): void => {
  if (!DEBUG_ENABLED) return;
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  console.log(`⏹️ FIN [${operation}] - ${duration.toFixed(2)}ms`, details ? details : '');
};
