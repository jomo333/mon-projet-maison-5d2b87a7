import { AlertTriangle, Clock, DollarSign, FileX } from "lucide-react";

const problems = [
  {
    icon: DollarSign,
    text: "Dépassements de budget imprévus",
  },
  {
    icon: Clock,
    text: "Retards et oublis dans la coordination",
  },
  {
    icon: FileX,
    text: "Documents éparpillés, difficiles à retrouver",
  },
];

export function ProblemSection() {
  return (
    <section className="py-16 lg:py-20 bg-background">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm text-destructive mb-6 animate-fade-up">
            <AlertTriangle className="h-4 w-4" />
            Le défi de l'autoconstruction
          </div>
          
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-foreground animate-fade-up-delay-1">
            Gérer un projet de construction seul, c'est complexe
          </h2>
          
          <p className="mt-4 text-muted-foreground text-lg animate-fade-up-delay-2">
            Sans les bons outils, vous risquez de perdre du temps, de l'argent et votre tranquillité d'esprit.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {problems.map((problem, index) => {
              const Icon = problem.icon;
              return (
                <div 
                  key={problem.text}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-6 transition-all hover:border-destructive/40 hover:bg-destructive/10 animate-fade-up"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <Icon className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-sm font-medium text-foreground text-center">{problem.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
