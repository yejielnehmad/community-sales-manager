
import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { ClipboardList, Loader2, Search, X, Ban } from "lucide-react";
import { OrdersList } from "@/components/orders/OrdersList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { useOrders } from "@/contexts/OrdersContext";

const OrdersContent = () => {
  const { state, actions } = useOrders();
  const { isLoading, isRefreshing, error, searchTerm } = state;
  const { fetchOrders, setSearchTerm } = actions;

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 mb-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          Pedidos
        </h1>
        
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por cliente o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8 rounded-full"
              aria-label="Buscar"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {searchTerm && (
              <button 
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Botón de actualizar eliminado */}
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground text-sm">Cargando pedidos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg">
            <Ban className="h-8 w-8 text-destructive mb-2" />
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => fetchOrders(true)}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <OrdersList />
        )}
      </div>
    </div>
  );
};

const Orders = () => {
  return (
    <AppLayout>
      <OrdersProvider>
        <OrdersContent />
      </OrdersProvider>
    </AppLayout>
  );
};

export default Orders;
