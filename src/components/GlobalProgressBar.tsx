
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface GlobalProgressBarProps {
  isAnalyzingGlobally: boolean;
  analysisStage: string;
}

const GlobalProgressBar = ({ isAnalyzingGlobally, analysisStage }: GlobalProgressBarProps) => {
  const [progress, setProgress] = useState(0);
  
  // Simular progreso incremental cuando está analizando
  useEffect(() => {
    if (!isAnalyzingGlobally) {
      setProgress(0);
      return;
    }
    
    // Comenzar con un progreso inicial
    setProgress(5);
    
    // Simular incrementos graduales de progreso
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        // Incrementar gradualmente, más lento a medida que se acerca al 95%
        const increment = Math.max(0.5, (95 - prevProgress) / 20);
        // Nunca superar el 95% (el 100% solo cuando termine el análisis)
        const newProgress = Math.min(95, prevProgress + increment);
        return newProgress;
      });
    }, 800);
    
    return () => clearInterval(interval);
  }, [isAnalyzingGlobally]);
  
  if (!isAnalyzingGlobally) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-blue-500/20 backdrop-blur-sm py-1 px-4">
        <div className="flex justify-between text-xs text-blue-800 font-medium mb-0.5">
          <span>{analysisStage || "Procesando mensaje..."}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress 
          value={progress} 
          className="h-1.5 w-full bg-blue-100" 
          indicatorClassName="bg-blue-500" 
        />
      </div>
    </div>
  );
};

export default GlobalProgressBar;
