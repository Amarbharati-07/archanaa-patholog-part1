import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Mail, ArrowRight, FlaskConical, Lock, Eye, EyeOff, KeyRound, RefreshCw, AlertCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginError {
  message: string;
  errorCode?: string;
  requiresVerification?: boolean;
  email?: string;
}

export default function Login() {
  const [, navigate] = useLocation();
  const { loginPatient } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"login" | "verify">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loginError, setLoginError] = useState<LoginError | null>(null);

  const verifyMutation = useMutation({
    mutationFn: async (data: { email: string; otp: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-email", data);
      return res.json();
    },
    onSuccess: (data) => {
      loginPatient(data.patient, data.token);
      toast({
        title: "Email Verified",
        description: "Welcome to Archana Pathology Lab!",
      });
      const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard";
      localStorage.removeItem("redirectAfterLogin");
      navigate(redirectUrl);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "OTP Sent",
        description: "A verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (!formData.email || !formData.password) {
      setLoginError({
        message: "Please enter your email and password.",
        errorCode: "MISSING_FIELDS"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const errorData: LoginError = {
          message: data.message || "Login failed",
          errorCode: data.errorCode,
          requiresVerification: data.requiresVerification,
          email: data.email
        };

        if (data.requiresVerification) {
          setStep("verify");
          resendMutation.mutate(formData.email);
          setLoginError({
            message: "Your account is not active. Please verify your email.",
            errorCode: "EMAIL_NOT_VERIFIED"
          });
        } else {
          setLoginError(errorData);
        }
        setIsSubmitting(false);
        return;
      }
      
      loginPatient(data.patient, data.token);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      const redirectUrl = localStorage.getItem("redirectAfterLogin") || "/dashboard";
      localStorage.removeItem("redirectAfterLogin");
      navigate(redirectUrl);
    } catch (error: any) {
      setLoginError({
        message: "Something went wrong. Please try again later.",
        errorCode: "NETWORK_ERROR"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    verifyMutation.mutate({
      email: formData.email,
      otp,
    });
  };

  const handleResend = () => {
    resendMutation.mutate(formData.email);
  };

  const getErrorIcon = (errorCode?: string) => {
    switch (errorCode) {
      case "EMAIL_NOT_FOUND":
        return <UserPlus className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getErrorAction = (errorCode?: string) => {
    switch (errorCode) {
      case "EMAIL_NOT_FOUND":
        return (
          <Link href="/register">
            <Button variant="outline" size="sm" className="mt-2" data-testid="button-signup-from-error">
              Sign Up Now
            </Button>
          </Link>
        );
      case "PASSWORD_NOT_SET":
        return (
          <Link href="/forgot-password">
            <Button variant="outline" size="sm" className="mt-2" data-testid="button-reset-password-from-error">
              Reset Password
            </Button>
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          <span className="font-semibold">Archana Pathology</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {step === "login" ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Patient Login</CardTitle>
              <CardDescription>
                Enter your email and password to login
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {loginError && (
                  <Alert variant="destructive" data-testid="alert-login-error">
                    <div className="flex items-start gap-2">
                      {getErrorIcon(loginError.errorCode)}
                      <div className="flex-1">
                        <AlertDescription className="text-sm">
                          {loginError.message}
                        </AlertDescription>
                        {getErrorAction(loginError.errorCode)}
                      </div>
                    </div>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (loginError) setLoginError(null);
                      }}
                      className={`pl-10 ${loginError?.errorCode === "EMAIL_NOT_FOUND" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (loginError) setLoginError(null);
                      }}
                      className={`pl-10 pr-10 ${loginError?.errorCode === "WRONG_PASSWORD" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="text-right">
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isSubmitting}
                  data-testid="button-login"
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  New to Archana Pathology?{" "}
                  <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                    Register here
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Verify Your Email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to <span className="font-medium">{formData.email}</span>
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleVerify}>
              <CardContent className="space-y-6">
                {loginError && (
                  <Alert variant="destructive" data-testid="alert-verification-info">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {loginError.message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive the code?{" "}
                  <Button
                    type="button"
                    variant="ghost"
                    className="p-0 h-auto text-primary hover:bg-transparent hover:underline"
                    onClick={handleResend}
                    disabled={resendMutation.isPending}
                    data-testid="button-resend-otp"
                  >
                    {resendMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      "Resend OTP"
                    )}
                  </Button>
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={verifyMutation.isPending || otp.length !== 6}
                  data-testid="button-verify-otp"
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify Email"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("login");
                    setOtp("");
                    setLoginError(null);
                  }}
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}
