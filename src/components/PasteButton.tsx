
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clipboard, ClipboardPaste } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PasteButtonProps {
  onPaste: (text: string) => void;
}

export const PasteButton = ({ onPaste }: PasteButtonProps) => {
  const [isPasting, setIsPasting] = useState(false);
  const { toast } = useToast();

  const handlePaste = async () => {
    setIsPasting(true);
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onPaste(text);
        toast({
          title: "Texto pegado",
          description: "El contenido del portapapeles se ha cargado correctamente"
        });
      } else {
        toast({
          title: "Portapapeles vacío",
          description: "No hay texto disponible para pegar",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error al acceder al portapapeles:", error);
      toast({
        title: "Error al pegar",
        description: "No se pudo acceder al portapapeles. Puede ser necesario dar permisos.",
        variant: "destructive"
      });
    } finally {
      setIsPasting(false);
    }
  };

  return (
    <Button 
      onClick={handlePaste} 
      disabled={isPasting}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isPasting ? (
        <>
          <Clipboard className="h-4 w-4 animate-pulse" />
          Pegando...
        </>
      ) : (
        <>
          <ClipboardPaste className="h-4 w-4" />
          Pegar del portapapeles
        </>
      )}
    </Button>
  );
};
