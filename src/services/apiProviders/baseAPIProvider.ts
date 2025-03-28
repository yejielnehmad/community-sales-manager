
/**
 * Clase base para proveedores de API
 * v1.0.1
 */
import { logDebug, logError } from "@/lib/debug-utils";

export class BaseAPIError extends Error {
  status?: number;
  statusText?: string;
  apiResponse?: any;
  rawJsonResponse?: string;
  phase1Response?: string;
  phase2Response?: string;
  phase3Response?: string;
  tipo?: string;
  networkError?: any;
  
  constructor(message: string, details?: { 
    status?: number, 
    statusText?: string, 
    apiResponse?: any,
    rawJsonResponse?: string,
    phase1Response?: string,
    phase2Response?: string,
    phase3Response?: string,
    tipo?: string,
    networkError?: any
  }) {
    super(message);
    this.name = "APIError";
    this.status = details?.status;
    this.statusText = details?.statusText;
    this.apiResponse = details?.apiResponse;
    this.rawJsonResponse = details?.rawJsonResponse;
    this.phase1Response = details?.phase1Response;
    this.phase2Response = details?.phase2Response;
    this.phase3Response = details?.phase3Response;
    this.tipo = details?.tipo;
    this.networkError = details?.networkError;
  }
}

export abstract class BaseAPIProvider {
  protected logPrefix: string;

  constructor(logPrefix: string) {
    this.logPrefix = logPrefix;
  }

  /**
   * Registra un mensaje de depuración
   */
  protected debug(message: string, data?: any): void {
    logDebug(this.logPrefix, message, data);
  }

  /**
   * Registra un error
   */
  protected logError(message: string, error?: any): void {
    logError(this.logPrefix, message, error);
  }

  /**
   * Método abstracto para enviar una petición a la API
   */
  public abstract call(prompt: string): Promise<string>;

  /**
   * Método abstracto para establecer el modelo a utilizar
   */
  public abstract setModel(model: string): void;

  /**
   * Método abstracto para obtener el modelo actual
   */
  public abstract getModel(): string;
}
