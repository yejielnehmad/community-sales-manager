
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
import ProductDetails from "./pages/ProductDetails";
import { ThemeProvider } from "@/components/theme-provider";

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="app-theme">
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
            <Route path="/product-details/:productId" element={<ProductDetails />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SidebarProvider>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
