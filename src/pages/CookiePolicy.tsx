import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CookiePreferencesDialog } from "@/components/cookies/CookiePreferencesDialog";
import { CookiePreferences, getStoredPreferences } from "@/components/cookies/CookieConsent";

const CookiePolicy = () => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    return getStoredPreferences() || {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
  });

  const handleSavePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("mpm_cookie_consent", "true");
    localStorage.setItem("mpm_cookie_preferences", JSON.stringify(prefs));
    setPreferences(prefs);
    setShowPreferences(false);
  };

  const sections = [
    {
      number: 1,
      title: "Qu'est-ce qu'un cookie ?",
      content: `Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, tablette, smartphone) lorsque vous visitez un site web. Les cookies permettent au site de mémoriser vos actions et préférences (comme la langue, la taille de police et d'autres préférences d'affichage) pendant une période déterminée, afin que vous n'ayez pas à les ressaisir chaque fois que vous revenez sur le site ou naviguez d'une page à l'autre.`,
    },
    {
      number: 2,
      title: "Types de cookies utilisés",
      intro: "Nous utilisons différentes catégories de cookies sur Monprojetmaison.ca :",
      categories: [
        {
          name: "Cookies essentiels",
          description: "Ces cookies sont indispensables au fonctionnement du site. Ils permettent la navigation, l'accès aux zones sécurisées et l'utilisation des fonctionnalités de base. Sans ces cookies, le site ne peut pas fonctionner correctement.",
          examples: ["Authentification et session utilisateur", "Préférences de sécurité", "Panier d'achat (le cas échéant)", "Mémorisation du consentement aux cookies"],
        },
        {
          name: "Cookies analytiques",
          description: "Ces cookies collectent des informations anonymes sur la façon dont les visiteurs utilisent notre site. Ils nous aident à améliorer notre plateforme en comprenant quelles pages sont les plus consultées et comment les utilisateurs naviguent.",
          examples: ["Google Analytics", "Statistiques de pages vues", "Taux de rebond et temps passé sur le site", "Sources de trafic"],
        },
        {
          name: "Cookies marketing",
          description: "Ces cookies sont utilisés pour suivre les visiteurs sur différents sites web. Leur objectif est d'afficher des publicités pertinentes et personnalisées, ce qui les rend plus utiles pour les éditeurs et les annonceurs tiers.",
          examples: ["Publicités ciblées", "Remarketing", "Pixels de suivi", "Mesure de l'efficacité des campagnes"],
        },
        {
          name: "Cookies fonctionnels",
          description: "Ces cookies permettent d'améliorer les fonctionnalités du site et de personnaliser votre expérience. Ils peuvent être définis par nous ou par des fournisseurs tiers dont nous avons ajouté les services à nos pages.",
          examples: ["Mémorisation de la langue préférée", "Personnalisation de l'interface", "Chat en direct", "Intégrations de médias sociaux"],
        },
      ],
    },
    {
      number: 3,
      title: "Durée de conservation",
      intro: "Les cookies que nous utilisons ont différentes durées de conservation :",
      items: [
        "Cookies de session : Supprimés automatiquement lorsque vous fermez votre navigateur",
        "Cookies persistants : Conservés pendant une durée déterminée (généralement de 1 mois à 2 ans selon leur fonction)",
        "Cookies tiers : Leur durée dépend des politiques des tiers concernés",
      ],
    },
    {
      number: 4,
      title: "Gestion de vos préférences",
      intro: "Vous avez le contrôle total sur les cookies. Vous pouvez :",
      items: [
        "Accepter ou refuser les cookies non essentiels via notre bannière de consentement",
        "Modifier vos préférences à tout moment en cliquant sur le bouton ci-dessous",
        "Configurer votre navigateur pour bloquer ou supprimer les cookies",
        "Utiliser des extensions de navigateur pour gérer les cookies",
      ],
      hasButton: true,
    },
    {
      number: 5,
      title: "Configuration du navigateur",
      intro: "Vous pouvez également gérer les cookies directement depuis votre navigateur. Voici les liens vers les instructions des principaux navigateurs :",
      browsers: [
        { name: "Google Chrome", url: "https://support.google.com/chrome/answer/95647" },
        { name: "Mozilla Firefox", url: "https://support.mozilla.org/fr/kb/protection-renforcee-contre-pistage-firefox-ordinateur" },
        { name: "Safari", url: "https://support.apple.com/fr-ca/guide/safari/sfri11471/mac" },
        { name: "Microsoft Edge", url: "https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" },
      ],
    },
    {
      number: 6,
      title: "Cookies tiers",
      content: `Notre site peut contenir des cookies placés par des tiers (partenaires, annonceurs, réseaux sociaux). Ces tiers ont leurs propres politiques de confidentialité et de cookies. Nous n'avons pas de contrôle sur ces cookies et vous encourageons à consulter les politiques de ces tiers pour plus d'informations.`,
    },
    {
      number: 7,
      title: "Conformité légale",
      intro: "Notre utilisation des cookies est conforme aux réglementations suivantes :",
      items: [
        "Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada",
        "Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25)",
        "Règlement général sur la protection des données (RGPD) de l'Union européenne",
        "Directive ePrivacy de l'Union européenne",
      ],
    },
    {
      number: 8,
      title: "Mises à jour",
      content: `Nous pouvons mettre à jour cette politique de cookies de temps à autre pour refléter les changements dans notre utilisation des cookies ou les exigences légales. Nous vous encourageons à consulter régulièrement cette page. La date de dernière mise à jour est indiquée en haut de cette page.`,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Cookie className="h-4 w-4" />
                Dernière mise à jour : Janvier 2026
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
                Politique de{" "}
                <span className="text-primary">Cookies</span>
              </h1>
              
              <p className="text-lg text-muted-foreground">
                Cette politique explique comment Monprojetmaison.ca utilise les cookies et technologies similaires.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-12">
                {sections.map((section) => (
                  <div key={section.number} className="relative">
                    <div className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg">
                        {section.number}
                      </div>
                      
                      <div className="flex-1">
                        <h2 className="font-display text-2xl font-semibold mb-4">
                          {section.title}
                        </h2>
                        
                        <div className="text-muted-foreground space-y-4">
                          {section.content && <p>{section.content}</p>}
                          
                          {section.intro && <p>{section.intro}</p>}
                          
                          {section.categories && (
                            <div className="space-y-6 mt-4">
                              {section.categories.map((cat, idx) => (
                                <div key={idx} className="p-4 rounded-lg bg-muted/50 border">
                                  <h3 className="font-semibold text-foreground mb-2">{cat.name}</h3>
                                  <p className="text-sm mb-3">{cat.description}</p>
                                  <div className="text-sm">
                                    <span className="font-medium text-foreground">Exemples :</span>
                                    <ul className="mt-1 ml-4 space-y-1">
                                      {cat.examples.map((ex, i) => (
                                        <li key={i} className="flex gap-2">
                                          <span className="text-primary">•</span>
                                          <span>{ex}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {section.items && (
                            <ul className="space-y-2 ml-4">
                              {section.items.map((item, index) => (
                                <li key={index} className="flex gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {section.hasButton && (
                            <div className="mt-4">
                              <Button onClick={() => setShowPreferences(true)}>
                                Gérer mes préférences de cookies
                              </Button>
                            </div>
                          )}
                          
                          {section.browsers && (
                            <div className="grid sm:grid-cols-2 gap-3 mt-4">
                              {section.browsers.map((browser, idx) => (
                                <a
                                  key={idx}
                                  href={browser.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors flex items-center gap-3"
                                >
                                  <span className="text-primary">→</span>
                                  <span className="font-medium text-foreground">{browser.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact Section */}
              <div className="mt-16 p-8 rounded-2xl bg-muted/50 border">
                <h2 className="font-display text-2xl font-semibold mb-4">
                  Questions sur les cookies
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Si vous avez des questions concernant notre utilisation des cookies, veuillez nous contacter :
                </p>
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                    📧
                  </div>
                  <div>
                    <p className="font-medium">Courriel</p>
                    <a 
                      href="mailto:confidentialite@monprojetmaison.ca" 
                      className="text-primary hover:underline"
                    >
                      confidentialite@monprojetmaison.ca
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <div className="mt-12 text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} Monprojetmaison.ca. Tous droits réservés.
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      
      <CookiePreferencesDialog
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onSave={handleSavePreferences}
      />
    </div>
  );
};

export default CookiePolicy;
