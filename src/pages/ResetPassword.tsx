import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const RECOVERY_HASH_KEY = "supabase_recovery_hash";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

    // Avec HashRouter, le token est sauvegardé dans sessionStorage par RecoveryRedirect.
    // On le restaure ici via setSession pour ne pas perdre le lien.
    const restoreSessionFromStoredHash = async () => {
      try {
        const stored = sessionStorage.getItem(RECOVERY_HASH_KEY);
        if (!stored) return;
        const params = new URLSearchParams(stored.replace(/^#/, ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) sessionStorage.removeItem(RECOVERY_HASH_KEY);
        }
      } catch (_) {}
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        if (timeoutId) clearTimeout(timeoutId);
        setIsValidSession(true);
      }
    });

    const checkSession = async () => {
      await restoreSessionFromStoredHash();
      const { data: { session } } = await supabase.auth.getSession();
      if (!isSubscribed) return;
      if (session) {
        setIsValidSession(true);
      } else {
        timeoutId = setTimeout(() => {
          if (isSubscribed) setIsValidSession((prev) => (prev === null ? false : prev));
        }, 5000);
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

    if (password.length < 8) {
      toast.error(t("auth.minChars8") || "Minimum 8 caractères (recommandé)");
      return;
    }

    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t("auth.invalidLinkDesc") + " " + t("auth.requestNewLink"));
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("Erreur updatePassword:", error);
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
            <CardContent className="space-y-2">
              <Button 
                className="w-full"
                variant="default"
                onClick={() => navigate("/auth?forgot=1")}
              >
                {t("auth.requestNewLinkButton")}
              </Button>
              <Button 
                className="w-full"
                variant="outline"
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
                  {t("auth.minChars8") || "Minimum 8 caractères (recommandé)"}
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
                    minLength={8}
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
