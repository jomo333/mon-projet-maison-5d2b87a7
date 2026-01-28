import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building, Mail, DollarSign, Cpu, Save } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Company info
  const [companyName, setCompanyName] = useState("MonProjetMaison.ca");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyEmail, setCompanyEmail] = useState("support@monprojetmaison.ca");
  const [companyPhone, setCompanyPhone] = useState("");

  // Tax settings
  const [enableTPS, setEnableTPS] = useState(true);
  const [tpsRate, setTpsRate] = useState("5");
  const [enableTVQ, setEnableTVQ] = useState(true);
  const [tvqRate, setTvqRate] = useState("9.975");
  const [taxNumber, setTaxNumber] = useState("");

  // Email settings
  const [supportEmail, setSupportEmail] = useState("support@monprojetmaison.ca");
  const [billingEmail, setBillingEmail] = useState("facturation@monprojetmaison.ca");
  const [noReplyEmail, setNoReplyEmail] = useState("noreply@monprojetmaison.ca");

  // AI/Limits settings
  const [defaultAICredits, setDefaultAICredits] = useState("5");
  const [maxUploadSize, setMaxUploadSize] = useState("10");
  const [trialDays, setTrialDays] = useState("14");

  const handleSave = async () => {
    setSaving(true);
    
    // In a real app, this would save to the database
    // For now, we'll just show a success message
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast({
      title: "Paramètres sauvegardés",
      description: "Vos modifications ont été enregistrées.",
    });
    
    setSaving(false);
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
              <p className="text-muted-foreground mt-1">
                Configuration générale de l'application
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>

          <Tabs defaultValue="company" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="company" className="gap-2">
                <Building className="h-4 w-4 hidden sm:block" />
                Entreprise
              </TabsTrigger>
              <TabsTrigger value="taxes" className="gap-2">
                <DollarSign className="h-4 w-4 hidden sm:block" />
                Taxes
              </TabsTrigger>
              <TabsTrigger value="emails" className="gap-2">
                <Mail className="h-4 w-4 hidden sm:block" />
                Emails
              </TabsTrigger>
              <TabsTrigger value="limits" className="gap-2">
                <Cpu className="h-4 w-4 hidden sm:block" />
                Limites
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Informations de l'entreprise
                  </CardTitle>
                  <CardDescription>
                    Ces informations apparaîtront sur les factures et communications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nom de l'entreprise</Label>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-email">Email principal</Label>
                      <Input
                        id="company-email"
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-address">Adresse</Label>
                    <Textarea
                      id="company-address"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="Adresse complète pour la facturation"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Téléphone</Label>
                    <Input
                      id="company-phone"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="(514) 555-0123"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="taxes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Configuration des taxes
                  </CardTitle>
                  <CardDescription>
                    Paramètres de taxes pour le Québec (TPS/TVQ)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="enable-tps">TPS (Taxe sur les produits et services)</Label>
                        <p className="text-sm text-muted-foreground">
                          Taxe fédérale canadienne
                        </p>
                      </div>
                      <Switch
                        id="enable-tps"
                        checked={enableTPS}
                        onCheckedChange={setEnableTPS}
                      />
                    </div>
                    {enableTPS && (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        <Label htmlFor="tps-rate">Taux TPS (%)</Label>
                        <Input
                          id="tps-rate"
                          type="number"
                          step="0.001"
                          value={tpsRate}
                          onChange={(e) => setTpsRate(e.target.value)}
                          className="max-w-[200px]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="enable-tvq">TVQ (Taxe de vente du Québec)</Label>
                        <p className="text-sm text-muted-foreground">
                          Taxe provinciale du Québec
                        </p>
                      </div>
                      <Switch
                        id="enable-tvq"
                        checked={enableTVQ}
                        onCheckedChange={setEnableTVQ}
                      />
                    </div>
                    {enableTVQ && (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        <Label htmlFor="tvq-rate">Taux TVQ (%)</Label>
                        <Input
                          id="tvq-rate"
                          type="number"
                          step="0.001"
                          value={tvqRate}
                          onChange={(e) => setTvqRate(e.target.value)}
                          className="max-w-[200px]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax-number">Numéro d'entreprise (NE)</Label>
                    <Input
                      id="tax-number"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="123456789 RT0001"
                      className="max-w-[300px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Adresses email système
                  </CardTitle>
                  <CardDescription>
                    Emails utilisés pour les communications automatiques
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="support-email">Email support</Label>
                      <Input
                        id="support-email"
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pour les demandes de support client
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-email">Email facturation</Label>
                      <Input
                        id="billing-email"
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pour les questions de facturation
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noreply-email">Email no-reply</Label>
                    <Input
                      id="noreply-email"
                      type="email"
                      value={noReplyEmail}
                      onChange={(e) => setNoReplyEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pour les emails automatiques (confirmations, rappels)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="limits">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Limites globales
                  </CardTitle>
                  <CardDescription>
                    Paramètres par défaut pour les nouveaux utilisateurs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-ai-credits">Crédits IA par défaut/mois</Label>
                      <Input
                        id="default-ai-credits"
                        type="number"
                        value={defaultAICredits}
                        onChange={(e) => setDefaultAICredits(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pour les comptes gratuits
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-upload-size">Taille max upload (Mo)</Label>
                      <Input
                        id="max-upload-size"
                        type="number"
                        value={maxUploadSize}
                        onChange={(e) => setMaxUploadSize(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Par fichier
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trial-days">Durée essai (jours)</Label>
                      <Input
                        id="trial-days"
                        type="number"
                        value={trialDays}
                        onChange={(e) => setTrialDays(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Période d'essai gratuite
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
