import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, FileText, HardHat, Shield, Wrench } from "lucide-react";

const guideCategories = [
  {
    id: "rbq",
    title: "Obligations RBQ",
    icon: Shield,
    description: "Régie du bâtiment du Québec",
    items: [
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
    title: "Inspections obligatoires",
    icon: CheckCircle2,
    description: "Étapes de vérification municipales",
    items: [
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
    title: "Code du bâtiment",
    icon: FileText,
    description: "Exigences techniques essentielles",
    items: [
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
    title: "Corps de métier",
    icon: Wrench,
    description: "Coordination des intervenants",
    items: [
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
    title: "Sécurité sur le chantier",
    icon: HardHat,
    description: "Prévention des accidents",
    items: [
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

const Guide = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Guide de l'autoconstructeur
            </h1>
            <p className="text-muted-foreground mt-1">
              Références et bonnes pratiques pour votre projet de construction
            </p>
          </div>

          {/* Disclaimer */}
          <Card className="border-warning/50 bg-warning/5 animate-fade-in">
            <CardContent className="flex items-start gap-4 pt-6">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
              <div>
                <h3 className="font-semibold text-warning">Avertissement important</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Les informations présentées dans ce guide sont fournies à titre indicatif seulement et n'ont aucune valeur légale. 
                  Consultez toujours les autorités compétentes (municipalité, RBQ) et des professionnels qualifiés pour vos projets.
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
              <CardTitle className="font-display">Liens utiles</CardTitle>
              <CardDescription>Ressources officielles pour votre projet</CardDescription>
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
                  <Badge variant="outline" className="ml-auto text-xs">Officiel</Badge>
                </a>
                <a
                  href="https://www.garantiegcr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">GCR</span>
                  <Badge variant="outline" className="ml-auto text-xs">Officiel</Badge>
                </a>
                <a
                  href="https://www.hydroquebec.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Wrench className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Hydro-Québec</span>
                  <Badge variant="outline" className="ml-auto text-xs">Officiel</Badge>
                </a>
                <a
                  href="https://www.cnesst.gouv.qc.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <HardHat className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">CNESST</span>
                  <Badge variant="outline" className="ml-auto text-xs">Officiel</Badge>
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
