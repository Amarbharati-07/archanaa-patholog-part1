import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { CartProvider } from "@/lib/cart-context";
import { useEffect } from "react";

import Home from "@/pages/home";
import Tests from "@/pages/tests";
import Book from "@/pages/book";
import Packages from "@/pages/packages";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminPatients from "@/pages/admin/patients";
import AdminCreateReport from "@/pages/admin/create-report";
import AdminReports from "@/pages/admin/reports";
import AdminTests from "@/pages/admin/tests";
import AdminBookings from "@/pages/admin/bookings";
import AdminAdvertisements from "@/pages/admin/advertisements";
import AdminReviews from "@/pages/admin/reviews";
import AdminHealthPackages from "@/pages/admin/health-packages";
import AdminLabSettings from "@/pages/admin/lab-settings";
import AdminBookingReports from "@/pages/admin/booking-reports";
import AdminPatientDetail from "@/pages/admin/patient-detail";
import AdminWalkinCollections from "@/pages/admin/walkin-collections";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tests" component={Tests} />
      <Route path="/book" component={Book} />
      <Route path="/packages" component={Packages} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/patients" component={AdminPatients} />
      <Route path="/admin/patients/:id" component={AdminPatientDetail} />
      <Route path="/admin/create-report" component={AdminCreateReport} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/tests" component={AdminTests} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/admin/advertisements" component={AdminAdvertisements} />
      <Route path="/admin/reviews" component={AdminReviews} />
      <Route path="/admin/health-packages" component={AdminHealthPackages} />
      <Route path="/admin/lab-settings" component={AdminLabSettings} />
      <Route path="/admin/booking-reports" component={AdminBookingReports} />
      <Route path="/admin/walkin-collections" component={AdminWalkinCollections} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Disable service worker to prevent caching issues in production
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister().catch((err) => {
            console.warn('Failed to unregister service worker:', err);
          });
        });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
