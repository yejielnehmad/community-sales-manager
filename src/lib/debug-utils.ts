
/**
 * Utilidades para depuración y registro de actividad
 * v1.0.2
 */

// Configurar si los logs están habilitados (para poder desactivarlos en producción)
const DEBUG_ENABLED = true;

/**
 * Registra un mensaje de depuración en la consola
 */
export const logDebug = (area: string, message: string, data?: any) => {
  if (!DEBUG_ENABLED) return;
  
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
  if (!DEBUG_ENABLED) return;
  
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
  if (!DEBUG_ENABLED) return;
  
  const icon = success ? '💾' : '⚠️';
  console.log(`${icon} ESTADO [${operation.toUpperCase()}] ${storageKey}: ${success ? 'ÉXITO' : 'FALLIDO'}`, details ? details : '');
};
