import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    // Listen for auth state changes FIRST (before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        // Clear timeout since we got a valid recovery event
        if (timeoutId) clearTimeout(timeoutId);
        setIsValidSession(true);
      } else if (event === 'SIGNED_IN' && session) {
        // User might already be signed in from the recovery link
        if (timeoutId) clearTimeout(timeoutId);
        setIsValidSession(true);
      }
    });

    // Check if we already have a session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isSubscribed) return;
      
      if (session) {
        setIsValidSession(true);
      } else {
        // Give it time to process the URL hash/token
        timeoutId = setTimeout(() => {
          if (isSubscribed) {
            setIsValidSession(prev => prev === null ? false : prev);
          }
        }, 3000);
      }
    };

    checkSession();

    return () => {
      isSubscribed = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("auth.minChars"));
      return;
    }

    setIsLoading(true);

    const { error } = await updatePassword(password);

    if (error) {
      toast.error(t("common.error") + ": " + error.message);
    } else {
      setIsSuccess(true);
      toast.success(t("auth.passwordUpdated"));
    }

    setIsLoading(false);
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-12 flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{t("auth.verifying")}</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="font-display text-2xl">{t("auth.invalidLink")}</CardTitle>
              <CardDescription>
                {t("auth.invalidLinkDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                {t("auth.backToLogin")}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 rounded-full bg-primary/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">{t("auth.passwordUpdated")}</CardTitle>
              <CardDescription>
                {t("auth.passwordUpdatedDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full"
                onClick={() => navigate("/")}
              >
                {t("auth.goHome")}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">{t("auth.newPassword")}</CardTitle>
            <CardDescription>
              {t("auth.enterNewPassword")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.newPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("auth.minChars")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">
                  {t("auth.passwordMismatch")}
                </p>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || password !== confirmPassword}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("auth.updatePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
