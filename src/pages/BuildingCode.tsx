import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Loader2, AlertCircle, FileText, Lightbulb, MessageSquare, Send, User, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: "question" | "clarification" | "answer";
  result?: SearchResult;
}

interface SearchResult {
  article: string;
  title: string;
  content: string;
  summary: string;
  relatedArticles?: string[];
}

interface AIResponse {
  type: "clarification" | "answer";
  clarificationQuestions?: string[];
  message?: string;
  result?: SearchResult;
}

const BuildingCode = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSearching) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      type: "question",
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsSearching(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error: fnError } = await supabase.functions.invoke("search-building-code", {
        body: { 
          query: input.trim(),
          conversationHistory,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      const response = data as AIResponse;

      if (response.type === "clarification") {
        // AI needs more information
        const clarificationMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.message || "J'ai besoin de plus d'informations.",
          type: "clarification",
        };
        setMessages(prev => [...prev, clarificationMessage]);
      } else {
        // AI has enough information to provide an answer
        const answerMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.message || "Voici ce que j'ai trouvé :",
          type: "answer",
          result: response.result,
        };
        setMessages(prev => [...prev, answerMessage]);
      }
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Erreur de recherche");
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Une erreur est survenue lors de la recherche. Veuillez réessayer.",
        type: "answer",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewSearch = () => {
    setMessages([]);
    setInput("");
  };

  const exampleSearches = [
    "Hauteur minimale des garde-corps",
    "Isolation thermique des murs",
    "Escaliers résidentiels dimensions",
    "Ventilation salle de bain",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Code du bâtiment</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Posez vos questions sur le Code national du bâtiment du Canada 2015. 
              L'IA vous posera des questions de clarification si nécessaire pour vous donner une réponse précise.
            </p>
          </div>

          {/* Disclaimer */}
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Avis important :</strong> Les informations fournies sont à titre indicatif seulement et n'ont aucune valeur légale. 
                Consultez toujours un professionnel qualifié et les autorités locales pour vos projets de construction.
              </p>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversation
                </CardTitle>
                {messages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleNewSearch}>
                    Nouvelle recherche
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Posez votre question</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Décrivez ce que vous cherchez et l'IA vous guidera vers la réponse la plus précise.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {exampleSearches.map((example) => (
                      <Button
                        key={example}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(example)}
                        className="text-xs"
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="space-y-3">
                        <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                          {message.role === "assistant" && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          {message.role === "user" && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        {/* Show result if present */}
                        {message.result && (
                          <div className="ml-11 space-y-4">
                            {/* Summary */}
                            <Card className="border-primary/30 bg-primary/5">
                              <CardHeader className="py-3">
                                <CardTitle className="flex items-center gap-2 text-sm text-primary">
                                  <Lightbulb className="h-4 w-4" />
                                  Résumé
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="py-0 pb-4">
                                <p className="text-sm leading-relaxed">{message.result.summary}</p>
                              </CardContent>
                            </Card>

                            {/* Article */}
                            <Card>
                              <CardHeader className="py-3">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  <FileText className="h-4 w-4" />
                                  {message.result.article}
                                </CardTitle>
                                <CardDescription className="text-xs">{message.result.title}</CardDescription>
                              </CardHeader>
                              <CardContent className="py-0 pb-4">
                                <div 
                                  className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: message.result.content }}
                                />
                              </CardContent>
                            </Card>

                            {/* Related articles */}
                            {message.result.relatedArticles && message.result.relatedArticles.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-xs text-muted-foreground">Articles connexes :</span>
                                {message.result.relatedArticles.map((article) => (
                                  <Button
                                    key={article}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setInput(`Explique l'article ${article}`)}
                                    className="text-xs h-6"
                                  >
                                    {article}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {isSearching && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Input */}
              <div className="flex gap-3 mt-4 pt-4 border-t">
                <Input
                  placeholder="Posez votre question sur le code du bâtiment..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={isSearching}
                />
                <Button onClick={handleSend} disabled={isSearching || !input.trim()}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BuildingCode;
