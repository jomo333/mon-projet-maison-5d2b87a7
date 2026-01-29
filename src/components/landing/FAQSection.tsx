import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Comment MonProjetMaison m'aide à ne pas dépasser mon budget?",
    answer: "Notre outil vous permet de définir un budget par catégorie de travaux, puis de suivre vos dépenses réelles en temps réel. Vous recevez des alertes automatiques dès qu'une catégorie approche ou dépasse le montant prévu, ce qui vous permet d'ajuster rapidement.",
  },
  {
    question: "Puis-je gérer plusieurs projets en même temps?",
    answer: "Avec le forfait Pro, vous pouvez créer et gérer autant de projets que nécessaire. Le forfait Essentiel (gratuit) est limité à un seul projet actif.",
  },
  {
    question: "Mes données sont-elles sécurisées?",
    answer: "Absolument. Vos données sont hébergées sur des serveurs sécurisés au Canada, chiffrées en transit et au repos. Nous ne partageons jamais vos informations avec des tiers. Vous restez propriétaire de toutes vos données.",
  },
  {
    question: "Comment gérer les soumissions et devis de mes sous-traitants?",
    answer: "Vous pouvez téléverser les soumissions de vos sous-traitants (PDF, images), les organiser par catégorie de travaux et utiliser notre IA pour les analyser et comparer. Cela vous aide à faire le meilleur choix pour chaque poste.",
  },
  {
    question: "Puis-je annuler ou changer de forfait à tout moment?",
    answer: "Oui, vous pouvez passer d'un forfait à l'autre ou annuler votre abonnement à tout moment depuis les paramètres de votre compte. Si vous annulez, vous conservez l'accès jusqu'à la fin de votre période de facturation.",
  },
];

export function FAQSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container">
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-2 text-sm text-primary mb-6 animate-fade-up">
            <HelpCircle className="h-4 w-4" />
            Questions fréquentes
          </div>
          
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl animate-fade-up-delay-1">
            Vous avez des questions?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto animate-fade-up-delay-2">
            Voici les réponses aux questions les plus courantes
          </p>
        </div>

        <div className="max-w-3xl mx-auto animate-fade-up-delay-3">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-border/50 rounded-xl px-6 data-[state=open]:bg-muted/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
