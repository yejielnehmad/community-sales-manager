
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import MagicOrder from "./pages/MagicOrder";
import NotFound from "./pages/NotFound";
import { TooltipProvider } from "@/components/ui/tooltip";
import Messages from "./pages/Messages";
import { SidebarProvider } from "@/components/ui/sidebar";
import ProductDetail from "./pages/ProductDetail";

// Versión actual de la aplicación
export const APP_VERSION = "1.3.0";

const App = () => (
  <>
    <TooltipProvider>
      <SidebarProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/magic-order" element={<MagicOrder />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SidebarProvider>
    </TooltipProvider>
  </>
);

export default App;
