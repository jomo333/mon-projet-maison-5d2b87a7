import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tag, Plus, Loader2, Copy, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PromoCode = {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  expires_at: number | null;
  coupon: {
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
    duration: string;
    duration_in_months: number | null;
    name: string | null;
  } | null;
};

export default function AdminPromotions() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formCode, setFormCode] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"percent" | "amount">("percent");
  const [formDiscountValue, setFormDiscountValue] = useState("");
  const [formDuration, setFormDuration] = useState<"once" | "repeating" | "forever">("once");
  const [formDurationMonths, setFormDurationMonths] = useState("1");
  const [formMaxRedemptions, setFormMaxRedemptions] = useState("");
  const [formExpiresDays, setFormExpiresDays] = useState("");
  const [formName, setFormName] = useState("");

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      const token = refreshed?.access_token ?? session?.access_token;
      if (!token) {
        toast.error("Non connecté");
        return;
      }
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      const res = await fetch(`${baseUrl}/functions/v1/stripe-promotion-codes`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(anonKey && { apikey: anonKey }),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string })?.error || "Erreur chargement des codes");
        return;
      }
      setCodes((data as { codes?: PromoCode[] })?.codes || []);
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeStr = formCode.trim().toUpperCase().replace(/\s/g, "");
    if (!codeStr || codeStr.length < 3) {
      toast.error("Le code doit faire au moins 3 caractères");
      return;
    }
    const value = Number(formDiscountValue.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Valeur de réduction invalide");
      return;
    }
    if (formDiscountType === "percent" && (value < 1 || value > 100)) {
      toast.error("Pourcentage entre 1 et 100");
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      const token = refreshed?.access_token ?? session?.access_token;
      if (!token) {
        toast.error("Non connecté");
        return;
      }
      const body: Record<string, unknown> = {
        code: codeStr,
        discount_type: formDiscountType,
        discount_value: formDiscountType === "amount" ? value : Math.round(value),
        duration: formDuration,
        currency: "cad",
      };
      if (formDuration === "repeating") {
        body.duration_in_months = Math.max(1, Math.min(12, parseInt(formDurationMonths, 10) || 1));
      }
      if (formMaxRedemptions.trim()) {
        const max = parseInt(formMaxRedemptions, 10);
        if (max >= 1) body.max_redemptions = max;
      }
      if (formExpiresDays.trim()) {
        const days = parseInt(formExpiresDays, 10);
        if (days >= 1) {
          const d = new Date();
          d.setDate(d.getDate() + days);
          body.expires_at = Math.floor(d.getTime() / 1000);
        }
      }
      if (formName.trim()) body.name = formName.trim();

      // invoke gère automatiquement apikey + Authorization (session courante)
      const { data, error } = await supabase.functions.invoke("stripe-promotion-codes", {
        body,
      });

      if (error) {
        toast.error(error.message || "Erreur création du code");
        return;
      }

      const resData = data as { code?: string; error?: string };
      if (resData?.error) {
        toast.error(resData.error);
        return;
      }

      toast.success(`Code "${resData?.code ?? formCode.trim().toUpperCase()}" créé avec succès`);
      setCreateOpen(false);
      resetForm();
      await fetchCodes();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormCode("");
    setFormDiscountType("percent");
    setFormDiscountValue("");
    setFormDuration("once");
    setFormDurationMonths("1");
    setFormMaxRedemptions("");
    setFormExpiresDays("");
    setFormName("");
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copié");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDiscount = (p: PromoCode) => {
    const c = p.coupon;
    if (!c) return "—";
    if (c.percent_off != null) return `${c.percent_off} %`;
    if (c.amount_off != null && c.currency) {
      const amount = (c.amount_off / 100).toFixed(2);
      return `${amount} ${c.currency.toUpperCase()}`;
    }
    return "—";
  };

  const formatDuration = (p: PromoCode) => {
    const c = p.coupon;
    if (!c) return "—";
    if (c.duration === "forever") return "Permanent";
    if (c.duration === "once") return "Une fois";
    if (c.duration === "repeating" && c.duration_in_months) return `${c.duration_in_months} mois`;
    return c.duration;
  };

  const formatExpiry = (ts: number | null) => {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
              <p className="text-muted-foreground mt-1">
                Créez et gérez les codes promo Stripe (affichés sur la page de paiement)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchCodes} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouveau code promo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nouveau code promotionnel</DialogTitle>
                    <DialogDescription>
                      Le code sera créé dans Stripe et utilisable sur la page de paiement forfaits.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Code (ex: WELCOME20)</Label>
                      <Input
                        id="code"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        placeholder="WELCOME20"
                        className="font-mono uppercase"
                        maxLength={50}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type de réduction</Label>
                        <Select
                          value={formDiscountType}
                          onValueChange={(v) => setFormDiscountType(v as "percent" | "amount")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Pourcentage</SelectItem>
                            <SelectItem value="amount">Montant fixe (CAD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="value">
                          {formDiscountType === "percent" ? "Pourcentage (%)" : "Montant (CAD)"}
                        </Label>
                        <Input
                          id="value"
                          type="number"
                          min={formDiscountType === "percent" ? 1 : 0.01}
                          max={formDiscountType === "percent" ? 100 : undefined}
                          step={formDiscountType === "percent" ? 1 : 0.01}
                          value={formDiscountValue}
                          onChange={(e) => setFormDiscountValue(e.target.value)}
                          placeholder={formDiscountType === "percent" ? "20" : "10"}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Durée de la réduction</Label>
                      <Select
                        value={formDuration}
                        onValueChange={(v) => setFormDuration(v as "once" | "repeating" | "forever")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">Une fois (premier paiement)</SelectItem>
                          <SelectItem value="repeating">Répétée (N mois)</SelectItem>
                          <SelectItem value="forever">Toujours</SelectItem>
                        </SelectContent>
                      </Select>
                      {formDuration === "repeating" && (
                        <div className="pt-2">
                          <Label htmlFor="months">Nombre de mois</Label>
                          <Input
                            id="months"
                            type="number"
                            min={1}
                            max={12}
                            value={formDurationMonths}
                            onChange={(e) => setFormDurationMonths(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="max">Utilisations max (optionnel)</Label>
                        <Input
                          id="max"
                          type="number"
                          min={1}
                          value={formMaxRedemptions}
                          onChange={(e) => setFormMaxRedemptions(e.target.value)}
                          placeholder="Illimité"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expires">Expire dans (jours, optionnel)</Label>
                        <Input
                          id="expires"
                          type="number"
                          min={1}
                          value={formExpiresDays}
                          onChange={(e) => setFormExpiresDays(e.target.value)}
                          placeholder="Jamais"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom interne (optionnel)</Label>
                      <Input
                        id="name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Campagne été 2025"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer le code"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Codes promotionnels Stripe
              </CardTitle>
              <CardDescription>
                Les clients peuvent saisir ces codes sur la page de paiement (forfaits). Créez des codes ici ou dans le tableau de bord Stripe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : codes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Aucun code promo actif pour le moment.</p>
                  <p className="text-sm mt-1">Cliquez sur « Nouveau code promo » pour en créer un.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Réduction</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead className="text-right">Utilisations</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codes.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-medium">{p.code}</TableCell>
                          <TableCell>{formatDiscount(p)}</TableCell>
                          <TableCell>{formatDuration(p)}</TableCell>
                          <TableCell className="text-right">
                            {p.times_redeemed}
                            {p.max_redemptions != null ? ` / ${p.max_redemptions}` : ""}
                          </TableCell>
                          <TableCell>{formatExpiry(p.expires_at)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(p.code)}
                            >
                              {copiedCode === p.code ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuration Stripe</CardTitle>
              <CardDescription>
                Vous pouvez aussi créer et gérer des codes promo directement dans Stripe.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Dans le tableau de bord Stripe :</strong> Produits → Coupons → Créer un coupon (réduction), puis Créer un code promotionnel pour le lien à un code client (ex: WELCOME20).
              </p>
              <p>
                Les codes créés ici ou dans Stripe s’affichent sur la page de paiement forfaits ; le client peut entrer un code avant de payer.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
