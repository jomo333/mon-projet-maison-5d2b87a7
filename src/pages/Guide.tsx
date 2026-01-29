import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, FileText, HardHat, Shield, Wrench } from "lucide-react";

const Guide = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const guideCategories = [
    {
      id: "rbq",
      title: t("guide.categories.rbq"),
      icon: Shield,
      description: t("guide.categories.rbqDesc"),
      items: isEn ? [
        {
          question: "When do I need an RBQ licence?",
          answer: "You don't need an RBQ licence if you're building your own primary residence and will live in it for at least one year. However, contractors you hire must hold a valid licence for their category of work.",
        },
        {
          question: "How do I verify a contractor's licence?",
          answer: "Use the RBQ online registry (www.rbq.gouv.qc.ca). Check the licence number, authorized categories, and licence status. Make sure the contractor has the required insurance coverage.",
        },
        {
          question: "What insurance is mandatory?",
          answer: "Civil liability insurance (minimum $1M) for all contractors. For new residential construction, the new home warranty (GCR) is mandatory if you're using a general contractor.",
        },
      ] : [
        {
          question: "Quand ai-je besoin d'une licence RBQ?",
          answer: "Vous n'avez pas besoin de licence RBQ si vous construisez vous-même votre résidence principale et que vous l'habiterez pendant au moins un an. Cependant, les entrepreneurs que vous engagez doivent détenir une licence valide pour leur catégorie de travaux.",
        },
        {
          question: "Comment vérifier la licence d'un entrepreneur?",
          answer: "Utilisez le registre en ligne de la RBQ (www.rbq.gouv.qc.ca). Vérifiez le numéro de licence, les catégories autorisées, et le statut de la licence. Assurez-vous que l'entrepreneur a les garanties d'assurance requises.",
        },
        {
          question: "Quelles assurances sont obligatoires?",
          answer: "Responsabilité civile (minimum 1M$) pour tous les entrepreneurs. Pour les nouvelles constructions résidentielles, la garantie des maisons neuves (GCR) est obligatoire si vous faites faire par un entrepreneur général.",
        },
      ],
    },
    {
      id: "inspections",
      title: t("guide.categories.inspections"),
      icon: CheckCircle2,
      description: t("guide.categories.inspectionsDesc"),
      items: isEn ? [
        {
          question: "What are the typical inspections?",
          answer: "1) Survey (after excavation, before foundations), 2) Foundations (before backfilling), 3) Structure and framing, 4) Insulation and vapour barrier, 5) Plumbing rough-in, 6) Electrical rough-in, 7) Final inspection before occupancy.",
        },
        {
          question: "Who must request inspections?",
          answer: "As the owner-builder holding the permit, you are responsible for requesting inspections from your municipality. Plan 24-48 hours in advance and don't cover the work before inspection.",
        },
        {
          question: "What happens if an inspection fails?",
          answer: "The inspector will give you a report indicating non-conformities. You'll need to fix the problems and request a new inspection. Continue with other unrelated work if possible.",
        },
      ] : [
        {
          question: "Quelles sont les inspections typiques?",
          answer: "1) Implantation (après excavation, avant fondations), 2) Fondations (avant remblayage), 3) Structure et charpente, 4) Isolation et pare-vapeur, 5) Plomberie rough-in, 6) Électricité rough-in, 7) Inspection finale avant occupation.",
        },
        {
          question: "Qui doit demander les inspections?",
          answer: "En tant qu'autoconstructeur titulaire du permis, vous êtes responsable de demander les inspections à votre municipalité. Planifiez 24-48h à l'avance et ne couvrez pas les travaux avant l'inspection.",
        },
        {
          question: "Que se passe-t-il si une inspection échoue?",
          answer: "L'inspecteur vous remettra un rapport indiquant les non-conformités. Vous devrez corriger les problèmes et demander une nouvelle inspection. Continuez les autres travaux non reliés si possible.",
        },
      ],
    },
    {
      id: "code",
      title: t("guide.categories.code"),
      icon: FileText,
      description: t("guide.categories.codeDesc"),
      items: isEn ? [
        {
          question: "What are Quebec's insulation requirements?",
          answer: "According to the Code, minimum R-values are: Walls: R-24.5, Roof/ceiling: R-41 (zone 1-5) to R-50 (zone 6-7A), Foundations: R-17.5 (interior) or R-10 (exterior), Slab on grade: R-10. These values apply to the complete system including thermal bridges.",
        },
        {
          question: "What are ventilation requirements?",
          answer: "Mechanical ventilation is mandatory. The minimum standard is an HRV or ERV with 0.3 ACH capacity. Outlets in each bedroom and living area, extraction in kitchen and bathrooms. Prefer an HRV system for energy efficiency.",
        },
        {
          question: "What is vapour barrier and where to install it?",
          answer: "The vapour barrier (6 mil polyethylene) must be installed on the warm side of insulation (interior in Quebec). It prevents condensation in walls. Seal all openings with acoustic tape. Alternative: smart membranes that adapt to humidity.",
        },
      ] : [
        {
          question: "Quelles sont les exigences d'isolation au Québec?",
          answer: "Selon le Code, les valeurs R minimales sont: Murs: R-24.5, Toiture/plafond: R-41 (zone 1-5) à R-50 (zone 6-7A), Fondations: R-17.5 (intérieur) ou R-10 (extérieur), Dalle sur sol: R-10. Ces valeurs s'appliquent au système complet incluant les ponts thermiques.",
        },
        {
          question: "Quelles sont les exigences de ventilation?",
          answer: "Un système de ventilation mécanique est obligatoire. Le standard minimum est un VRC ou VRE avec débit de 0.3 CAH. Des sorties dans chaque chambre et aire de séjour, extraction dans cuisine et salles de bain. Privilégiez un système HRV pour l'efficacité énergétique.",
        },
        {
          question: "Qu'est-ce que le pare-vapeur et où l'installer?",
          answer: "Le pare-vapeur (polyéthylène 6 mil) doit être installé du côté chaud de l'isolation (intérieur au Québec). Il empêche la condensation dans les murs. Scellez toutes les ouvertures avec du ruban acoustique. Alternative: membranes intelligentes qui s'adaptent à l'humidité.",
        },
      ],
    },
    {
      id: "metiers",
      title: t("guide.categories.trades"),
      icon: Wrench,
      description: t("guide.categories.tradesDesc"),
      items: isEn ? [
        {
          question: "In what order should I hire trades?",
          answer: "1) Excavation, 2) Foundation, 3) Carpenter, 4) Roofer, 5) Windows, 6) Electrician (rough-in), 7) Plumber (rough-in), 8) HVAC, 9) Insulation, 10) Drywall, 11) Electrician (finish), 12) Plumber (finish), 13) Painter, 14) Flooring.",
        },
        {
          question: "How do I get good quotes?",
          answer: "Get at least 3 quotes per trade. Provide the same plans and specifications to all. Compare inclusions/exclusions, not just price. Check references and RBQ licences. Be wary of abnormally low prices.",
        },
        {
          question: "How do I manage scheduling conflicts?",
          answer: "Create a shared calendar. Communicate realistic deadlines. Plan buffer time. Inform quickly of any delays. Document everything in writing. Avoid paying before work is completed.",
        },
      ] : [
        {
          question: "Dans quel ordre engager les corps de métier?",
          answer: "1) Excavation, 2) Fondations, 3) Charpentier, 4) Couvreur, 5) Fenêtres, 6) Électricien (rough-in), 7) Plombier (rough-in), 8) Chauffage/Ventilation, 9) Isolation, 10) Gypse, 11) Électricien (finition), 12) Plombier (finition), 13) Peintre, 14) Revêtements de sol.",
        },
        {
          question: "Comment obtenir de bonnes soumissions?",
          answer: "Demandez 3 soumissions minimum par corps de métier. Fournissez les mêmes plans et spécifications à tous. Comparez les inclusions/exclusions, pas seulement le prix. Vérifiez les références et licences RBQ. Méfiez-vous des prix anormalement bas.",
        },
        {
          question: "Comment gérer les conflits d'horaire?",
          answer: "Créez un calendrier partagé. Communiquez les délais réalistes. Prévoyez des marges de manœuvre. Informez rapidement de tout retard. Documentez tout par écrit. Évitez de payer avant la fin des travaux.",
        },
      ],
    },
    {
      id: "securite",
      title: t("guide.categories.safety"),
      icon: HardHat,
      description: t("guide.categories.safetyDesc"),
      items: isEn ? [
        {
          question: "What safety equipment is mandatory?",
          answer: "Hard hat, steel-toed boots, safety glasses, task-appropriate gloves. For work at height: harness and lifeline. Hearing protection for loud tools. N95 mask for dusty work.",
        },
        {
          question: "How do I secure the job site?",
          answer: "Security fence around perimeter, adequate lighting, hazard signage, covered excavations, compliant scaffolding, secure material storage, accessible fire extinguisher, first aid kit.",
        },
        {
          question: "What to do in case of accident?",
          answer: "Call 911 if urgent. Administer basic first aid. Document the incident with photos. Complete an accident report. Contact your insurance. Identify the cause to prevent recurrence.",
        },
      ] : [
        {
          question: "Quels équipements de protection sont obligatoires?",
          answer: "Casque de sécurité, bottes à embout d'acier, lunettes de protection, gants adaptés aux tâches. Pour les travaux en hauteur: harnais et ligne de vie. Protection auditive pour outils bruyants. Masque N95 pour travaux poussiéreux.",
        },
        {
          question: "Comment sécuriser le chantier?",
          answer: "Clôture de sécurité autour du périmètre, éclairage adéquat, signalisation des dangers, couverture des excavations, échafaudages conformes, entreposage sécuritaire des matériaux, extincteur accessible, trousse de premiers soins.",
        },
        {
          question: "Que faire en cas d'accident?",
          answer: "Appelez le 911 si urgent. Administrez les premiers soins de base. Documentez l'incident avec photos. Remplissez un rapport d'accident. Contactez votre assurance. Identifiez la cause pour prévenir la récurrence.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {t("guide.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("guide.subtitle")}
            </p>
          </div>

          {/* Disclaimer */}
          <Card className="border-warning/50 bg-warning/5 animate-fade-in">
            <CardContent className="flex items-start gap-4 pt-6">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
              <div>
                <h3 className="font-semibold text-warning">{t("guide.disclaimer")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("guide.disclaimerText")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Guide Categories */}
          <div className="grid gap-6">
            {guideCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Card 
                  key={category.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="font-display">{category.title}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {category.items.map((item, itemIndex) => (
                        <AccordionItem key={itemIndex} value={`item-${itemIndex}`}>
                          <AccordionTrigger className="text-left">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground leading-relaxed">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Links */}
          <Card className="animate-fade-in" style={{ animationDelay: "500ms" }}>
            <CardHeader>
              <CardTitle className="font-display">{t("guide.usefulLinks")}</CardTitle>
              <CardDescription>{t("guide.usefulLinksDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <a
                  href="https://www.rbq.gouv.qc.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Shield className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">RBQ</span>
                  <Badge variant="outline" className="ml-auto text-xs">{t("guide.official")}</Badge>
                </a>
                <a
                  href="https://www.garantiegcr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">GCR</span>
                  <Badge variant="outline" className="ml-auto text-xs">{t("guide.official")}</Badge>
                </a>
                <a
                  href="https://www.hydroquebec.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Wrench className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Hydro-Québec</span>
                  <Badge variant="outline" className="ml-auto text-xs">{t("guide.official")}</Badge>
                </a>
                <a
                  href="https://www.cnesst.gouv.qc.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <HardHat className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">CNESST</span>
                  <Badge variant="outline" className="ml-auto text-xs">{t("guide.official")}</Badge>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Guide;
