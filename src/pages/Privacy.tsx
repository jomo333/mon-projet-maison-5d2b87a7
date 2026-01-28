import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Shield } from "lucide-react";

const Privacy = () => {
  const sections = [
    {
      number: 1,
      title: "Collecte de renseignements",
      intro: "Monprojetmaison.ca collecte des renseignements personnels lorsque vous utilisez notre plateforme pour planifier votre projet de construction ou de rénovation résidentielle. Les informations que nous recueillons peuvent inclure :",
      items: [
        "Votre nom, adresse courriel et numéro de téléphone",
        "Les détails de votre projet de construction ou rénovation",
        "Votre localisation géographique au Québec",
        "Les préférences et spécifications de votre projet",
        "Les informations d'utilisation de notre plateforme",
      ],
    },
    {
      number: 2,
      title: "Utilisation des renseignements",
      intro: "Nous utilisons vos renseignements personnels pour les finalités suivantes :",
      items: [
        "Fournir et améliorer nos services de planification de projet",
        "Vous connecter avec des entrepreneurs et professionnels qualifiés",
        "Personnaliser votre expérience sur notre plateforme",
        "Vous envoyer des communications pertinentes concernant votre projet",
        "Respecter nos obligations légales et réglementaires",
        "Analyser et optimiser l'utilisation de notre plateforme",
      ],
    },
    {
      number: 3,
      title: "Partage de renseignements",
      intro: "Monprojetmaison.ca ne vend jamais vos renseignements personnels. Nous pouvons partager vos informations dans les circonstances suivantes :",
      items: [
        "Avec des entrepreneurs et professionnels qualifiés pour réaliser votre projet",
        "Avec des fournisseurs de services qui nous aident à opérer notre plateforme",
        "Lorsque requis par la loi ou pour protéger nos droits légaux",
        "Avec votre consentement explicite pour des fins spécifiques",
      ],
      footer: "Tous nos partenaires sont tenus de respecter la confidentialité de vos renseignements et de se conformer aux lois applicables en matière de protection des données.",
    },
    {
      number: 4,
      title: "Protection des renseignements",
      intro: "Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos renseignements personnels contre tout accès non autorisé, modification, divulgation ou destruction. Ces mesures incluent :",
      items: [
        "Chiffrement des données sensibles en transit et au repos",
        "Contrôles d'accès stricts et authentification sécurisée",
        "Surveillance continue de nos systèmes de sécurité",
        "Formation régulière de notre personnel sur la protection des données",
        "Audits de sécurité périodiques",
      ],
    },
    {
      number: 5,
      title: "Transferts internationaux de données",
      intro: "Certains de nos fournisseurs de services et partenaires technologiques peuvent être situés à l'extérieur du Canada, notamment aux États-Unis. Lorsque vos renseignements personnels sont transférés à l'international, nous nous assurons que :",
      items: [
        "Des mesures de protection contractuelles appropriées sont en place",
        "Les fournisseurs respectent des normes de sécurité équivalentes",
        "Les transferts sont limités au strict nécessaire",
        "Vos droits demeurent protégés conformément aux lois canadiennes",
      ],
      footer: "En utilisant notre plateforme, vous consentez à ces transferts dans les conditions décrites ci-dessus.",
    },
    {
      number: 6,
      title: "Vos droits",
      intro: "Conformément aux lois québécoises et canadiennes sur la protection des renseignements personnels, vous disposez des droits suivants :",
      items: [
        "Droit d'accès : Vous pouvez demander une copie des renseignements personnels que nous détenons à votre sujet",
        "Droit de rectification : Vous pouvez demander la correction de renseignements inexacts ou incomplets",
        "Droit de suppression : Vous pouvez demander la suppression de vos renseignements personnels dans certaines circonstances",
        "Droit d'opposition : Vous pouvez vous opposer à certaines utilisations de vos renseignements",
        "Droit de retrait du consentement : Vous pouvez retirer votre consentement à tout moment",
      ],
      footer: "Pour exercer ces droits, veuillez nous contacter aux coordonnées indiquées ci-dessous.",
    },
    {
      number: 7,
      title: "Cookies et technologies similaires",
      intro: "Notre plateforme utilise des cookies et des technologies similaires pour améliorer votre expérience utilisateur, analyser l'utilisation de notre site et personnaliser le contenu. Vous pouvez gérer vos préférences en matière de cookies via les paramètres de votre navigateur.",
      items: [],
      footer: "Les cookies que nous utilisons incluent des cookies essentiels nécessaires au fonctionnement du site, des cookies analytiques pour comprendre comment vous utilisez notre plateforme, et des cookies de performance pour optimiser votre expérience.",
    },
    {
      number: 8,
      title: "Conservation des données",
      intro: "Nous conservons vos renseignements personnels aussi longtemps que nécessaire pour fournir nos services et respecter nos obligations légales. Les périodes de conservation varient selon le type de données :",
      items: [
        "Données de compte : Pendant la durée de votre compte actif plus 2 ans après sa fermeture",
        "Données de projet : Pendant la durée du projet plus 7 ans pour des fins de référence et conformité fiscale",
        "Communications : 3 ans après la dernière interaction",
        "Données analytiques : Sous forme agrégée et anonymisée indéfiniment",
        "Documents légaux : Conformément aux exigences légales applicables (généralement 7 ans)",
      ],
      footer: "Après ces périodes, nous supprimons ou anonymisons vos renseignements de manière sécurisée, sauf si nous sommes légalement tenus de les conserver plus longtemps.",
    },
    {
      number: 9,
      title: "Services tiers et intégrations",
      intro: "Notre plateforme peut intégrer ou faire appel à des services tiers pour améliorer votre expérience :",
      items: [
        "Processeurs de paiement : Pour traiter les transactions de manière sécurisée (ex: Stripe, PayPal)",
        "Outils d'analyse : Pour comprendre l'utilisation de notre plateforme (ex: Google Analytics)",
        "Services de cartographie : Pour localiser les projets et entrepreneurs",
        "Réseaux sociaux : Boutons de partage qui peuvent transmettre des informations aux plateformes sociales",
      ],
      footer: "Ces services tiers ont leurs propres politiques de confidentialité. Nous vous encourageons à les consulter. Monprojetmaison.ca n'est pas responsable des pratiques de confidentialité de ces tiers.",
    },
    {
      number: 10,
      title: "Utilisation de l'intelligence artificielle",
      intro: "Monprojetmaison.ca peut utiliser des technologies d'intelligence artificielle pour améliorer nos services, notamment pour :",
      items: [
        "Recommander des entrepreneurs qualifiés en fonction de votre projet",
        "Estimer les coûts et durées de projet",
        "Personnaliser votre expérience sur la plateforme",
        "Détecter et prévenir les activités frauduleuses",
      ],
      footer: "Les données utilisées pour l'entraînement de nos modèles d'IA sont agrégées et anonymisées. Nous ne partageons jamais vos renseignements personnels identifiables avec des systèmes d'IA externes sans votre consentement explicite.",
    },
    {
      number: 11,
      title: "Gestion des incidents de sécurité",
      intro: "En cas de violation de données susceptible de présenter un risque sérieux de préjudice, nous nous engageons à :",
      items: [
        "Vous notifier dans les plus brefs délais, conformément aux exigences légales",
        "Informer le Commissaire à la protection de la vie privée du Canada si requis",
        "Vous fournir des informations sur la nature de l'incident et les mesures correctives",
        "Prendre des mesures immédiates pour limiter les dommages et prévenir de futurs incidents",
        "Vous conseiller sur les actions que vous pouvez entreprendre pour protéger vos renseignements",
      ],
      footer: "Nous maintenons un plan de réponse aux incidents qui est régulièrement testé et mis à jour.",
    },
    {
      number: 12,
      title: "Protection des mineurs",
      intro: "Nos services ne sont pas destinés aux personnes de moins de 18 ans. Nous ne collectons pas sciemment de renseignements personnels auprès de mineurs.",
      items: [],
      footer: "Si nous découvrons qu'un mineur nous a fourni des renseignements personnels, nous supprimerons ces informations immédiatement de nos systèmes. Si vous croyez qu'un mineur nous a fourni des renseignements personnels, veuillez nous contacter immédiatement.",
    },
    {
      number: 13,
      title: 'Signal "Do Not Track" (DNT)',
      intro: 'Certains navigateurs incluent une fonctionnalité "Do Not Track" (DNT) qui envoie un signal aux sites web indiquant que vous ne souhaitez pas être suivi.',
      items: [],
      footer: "Actuellement, il n'existe pas de norme industrielle reconnue sur la manière de répondre aux signaux DNT. Par conséquent, nous ne répondons pas automatiquement aux signaux DNT. Toutefois, vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur et notre bannière de consentement.",
    },
    {
      number: 14,
      title: "Modifications de la politique",
      intro: "Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Toute modification sera publiée sur cette page avec une date de mise à jour révisée. Nous vous encourageons à consulter régulièrement cette politique pour rester informé de la manière dont nous protégeons vos renseignements.",
      items: [],
      footer: "Si nous apportons des modifications importantes, nous vous en informerons par courriel ou via une notification sur notre plateforme.",
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
                <Shield className="h-4 w-4" />
                Dernière mise à jour : Janvier 2026
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
                Politique de{" "}
                <span className="text-primary">Confidentialité</span>
              </h1>
              
              <p className="text-lg text-muted-foreground">
                Chez Monprojetmaison.ca, nous prenons la protection de vos renseignements personnels au sérieux.
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
                          <p>{section.intro}</p>
                          
                          {section.items.length > 0 && (
                            <ul className="space-y-2 ml-4">
                              {section.items.map((item, index) => (
                                <li key={index} className="flex gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {section.footer && (
                            <p className="mt-4 text-sm">{section.footer}</p>
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
                  Nous contacter
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits en matière de protection des renseignements personnels, veuillez nous contacter :
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
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
                  
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                      📍
                    </div>
                    <div>
                      <p className="font-medium">Adresse</p>
                      <p className="text-muted-foreground">
                        Monprojetmaison.ca<br />
                        Laval, Québec, Canada
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-lg bg-background border text-sm text-muted-foreground">
                  <strong>Note :</strong> Cette politique de confidentialité est conforme à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec et à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada.
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
    </div>
  );
};

export default Privacy;
