import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FAQSection() {
  const { t } = useTranslation();

  const faqs = [
    { questionKey: "faq.q1.question", answerKey: "faq.q1.answer" },
    { questionKey: "faq.q2.question", answerKey: "faq.q2.answer" },
    { questionKey: "faq.q3.question", answerKey: "faq.q3.answer" },
    { questionKey: "faq.q4.question", answerKey: "faq.q4.answer" },
    { questionKey: "faq.q5.question", answerKey: "faq.q5.answer" },
  ];

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container">
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-2 text-sm text-primary mb-6 animate-fade-up">
            <HelpCircle className="h-4 w-4" />
            {t("faq.title")}
          </div>
          
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl animate-fade-up-delay-1">
            {t("faq.subtitle")}
          </h2>
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
                  {t(faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {t(faq.answerKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
