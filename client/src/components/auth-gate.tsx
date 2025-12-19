import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

interface AuthGateProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function AuthGate({ children, redirectTo = "/login" }: AuthGateProps) {
  const { patient, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !patient) {
      localStorage.setItem("redirectAfterLogin", location);
      navigate(redirectTo);
    }
  }, [isLoading, patient, location, navigate, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return <>{children}</>;
}

export function useRequireAuth() {
  const { patient, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  const requireAuth = (callback: () => void) => {
    if (!patient) {
      localStorage.setItem("redirectAfterLogin", location);
      navigate("/login");
      return false;
    }
    callback();
    return true;
  };

  return { isAuthenticated: !!patient, isLoading, requireAuth };
}
