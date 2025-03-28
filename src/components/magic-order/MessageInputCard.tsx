
import { useState } from 'react';
import { MessageSquareText, Wand, Clipboard, Loader2, StopCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TextareaWithHighlight } from "@/components/TextareaWithHighlight";

interface MessageInputCardProps {
  message: string;
  onMessageChange: (message: string) => void;
  onClearMessage: () => void;
  isAnalyzing: boolean;
  progress: number;
  progressStage: string;
  onPaste: () => void;
  onAnalyze: () => void;
  onStopAnalysis: () => void;
  onToggleGenerator: () => void;
  showGenerator: boolean;
}

export const MessageInputCard = ({
  message,
  onMessageChange,
  onClearMessage,
  isAnalyzing,
  progress,
  progressStage,
  onPaste,
  onAnalyze,
  onStopAnalysis,
  onToggleGenerator,
  showGenerator,
  clients,
  products
}: MessageInputCardProps & { clients: any[]; products: any[] }) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-primary" />
          Mensaje del cliente
        </CardTitle>
        <CardDescription>
          Ingresa el mensaje del cliente para analizarlo
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Textarea para el mensaje */}
        <div className="mb-4">
          <TextareaWithHighlight
            placeholder="Pega o escribe aquí el mensaje del cliente..."
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            clients={clients}
            products={products}
            className="min-h-[150px] font-medium"
            clearable={true}
            onClear={onClearMessage}
          />
        </div>
        
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Button 
              onClick={onAnalyze}
              disabled={isAnalyzing || !message.trim()}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Wand className="h-4 w-4" />
                  Analizar mensaje
                </>
              )}
            </Button>
            
            {/* Botón para detener el análisis */}
            {isAnalyzing && (
              <Button 
                variant="outline" 
                onClick={onStopAnalysis}
                className="flex items-center gap-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                <StopCircle className="h-4 w-4" />
                Detener análisis
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={onPaste}
              disabled={isAnalyzing}
              className="flex items-center gap-1"
            >
              <Clipboard className="h-4 w-4" />
              Pegar
            </Button>
          </div>
          
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleGenerator}
              className="text-xs"
            >
              {showGenerator ? "Ocultar ejemplos" : "Ver ejemplos"}
            </Button>
          </div>
        </div>
        
        {isAnalyzing && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">
                {progressStage || "Procesando..."}
              </span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
