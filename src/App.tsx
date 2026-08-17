import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/hooks/useStore";
import Index from "./pages/Index.tsx";
import Produtos from "./pages/Produtos.tsx";
import Movimentacoes from "./pages/Movimentacoes.tsx";
import LocaisEstoque from "./pages/LocaisEstoque.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <StoreProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/movimentacoes" element={<Movimentacoes />} />
          <Route path="/locais-estoque" element={<LocaisEstoque />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
