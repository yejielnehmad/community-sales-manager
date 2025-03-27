
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Estado global compartido para la insignia de IA
const AIStatusBadge = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Verificar el estado inicial desde localStorage
    const checkInitialState = () => {
      const savedState = localStorage.getItem('magicOrder_analysisState');
      if (savedState) {
        const { isAnalyzing: savedIsAnalyzing } = JSON.parse(savedState);
        setIsAnalyzing(savedIsAnalyzing);
      }
    };

    // Escuchar cambios en el estado de análisis
    const handleAnalysisStateChange = (event: CustomEvent) => {
      setIsAnalyzing(event.detail.isAnalyzing);
    };

    // Verificar estado inicial
    checkInitialState();

    // Agregar listener para eventos de cambio de estado
    window.addEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);

    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('analysisStateChange', handleAnalysisStateChange as EventListener);
    };
  }, []);

  return (
    <div className={cn(
      "flex items-center justify-center rounded-full w-8 h-8 transition-colors duration-300",
      isAnalyzing 
        ? "bg-blue-500 animate-pulse" 
        : "bg-green-500"
    )}>
      <Sparkles className="h-4 w-4 text-white" />
    </div>
  );
};

export { AIStatusBadge };
