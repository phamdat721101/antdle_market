
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MarketsList from "./pages/MarketsList";
import MarketDetail from "./pages/MarketDetail";
import MyPositions from "./pages/MyPositions";
import { useEffect } from "react";
import { toast } from "sonner";

const queryClient = new QueryClient();

const App = () => {
  // Show a warning for demo purposes
  useEffect(() => {
    // Only show once per session
    const hasShownWarning = sessionStorage.getItem('demo-warning-shown');
    
    if (!hasShownWarning) {
      setTimeout(() => {
        toast.warning(
          "Demo Environment",
          {
            description: "This is a simulated environment. No real blockchain transactions are performed.",
            duration: 8000,
          }
        );
        sessionStorage.setItem('demo-warning-shown', 'true');
      }, 2000);
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/markets" element={<MarketsList />} />
            <Route path="/markets/:id" element={<MarketDetail />} />
            <Route path="/my-positions" element={<MyPositions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
