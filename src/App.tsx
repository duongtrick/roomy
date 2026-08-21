import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";

import { HomePage } from "@/pages/HomePage";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MapPage } from "@/pages/MapPage";
import { RoomDetailPage } from "@/pages/RoomDetailPage";
import { BookingsPage } from "@/pages/BookingsPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/room/:id" element={<RoomDetailPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <BottomNav />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
