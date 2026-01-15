import { useState } from "react";
import { Send, Bot, User, Sparkles, AlertCircle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Bonjour! Je suis votre assistant MonProjetMaison. Je peux vous aider à planifier votre construction, répondre à vos questions sur le Code du bâtiment du Québec, et vous conseiller sur les meilleures pratiques. Comment puis-je vous aider aujourd'hui?",
    timestamp: new Date(),
  },
];

const suggestions = [
  { icon: AlertCircle, text: "Quelles inspections sont obligatoires?" },
  { icon: Lightbulb, text: "Ordre optimal des travaux" },
  { icon: Sparkles, text: "Conseils pour économiser" },
];

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <Card className="animate-fade-in flex flex-col h-[500px]" style={{ animationDelay: "300ms" }}>
      <CardHeader className="shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Bot className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="font-display">Assistant IA</CardTitle>
            <CardDescription>Posez vos questions sur votre projet</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                    message.role === "assistant"
                      ? "bg-accent/10"
                      : "bg-primary"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-4 w-4 text-accent" />
                  ) : (
                    <User className="h-4 w-4 text-primary-foreground" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%]",
                    message.role === "assistant"
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-muted">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 space-y-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={suggestion.text}
                  onClick={() => handleSuggestion(suggestion.text)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-accent/10 hover:text-accent transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  {suggestion.text}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Posez votre question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-[44px] max-h-[120px] resize-none"
            />
            <Button
              variant="accent"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getAIResponse(input: string): string {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes("inspection")) {
    return "Au Québec, plusieurs inspections sont généralement requises: 1) Inspection des fondations avant le remblayage, 2) Inspection de la structure et charpente, 3) Inspection de l'isolation et pare-vapeur, 4) Inspection finale avant occupation. Selon votre municipalité, d'autres inspections peuvent être exigées. Je vous recommande de contacter votre bureau municipal pour obtenir la liste exacte.";
  }

  if (lowerInput.includes("ordre") || lowerInput.includes("travaux")) {
    return "L'ordre optimal des travaux pour une construction résidentielle est: 1) Permis et plans, 2) Excavation, 3) Fondations, 4) Structure/charpente, 5) Toiture, 6) Portes/fenêtres, 7) Électricité (rough-in), 8) Plomberie (rough-in), 9) Isolation, 10) Gypse, 11) Finitions électriques/plomberie, 12) Peinture, 13) Revêtements de sol, 14) Finitions. Voulez-vous que je détaille une étape en particulier?";
  }

  if (lowerInput.includes("économ") || lowerInput.includes("conseils")) {
    return "Voici mes conseils pour économiser: 1) Comparez au moins 3 soumissions par corps de métier, 2) Achetez vos matériaux pendant les soldes saisonnières, 3) Faites vous-même les travaux simples (peinture, finition), 4) Planifiez bien pour éviter les changements en cours de route qui coûtent cher, 5) Optez pour des matériaux de qualité moyenne - le meilleur rapport qualité/prix.";
  }

  return "Merci pour votre question! En tant qu'assistant spécialisé en construction résidentielle au Québec, je suis là pour vous guider. Pourriez-vous me donner plus de détails sur votre situation? Par exemple, à quelle étape de votre projet êtes-vous rendu, et quel aspect vous préoccupe le plus?";
}
