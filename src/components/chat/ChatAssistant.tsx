import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;

export function ChatAssistant() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Quick actions with translations
  const quickActions = [
    { key: "createProject", label: t("chatAssistant.quickActions.createProject") },
    { key: "uploadQuote", label: t("chatAssistant.quickActions.uploadQuote") },
    { key: "understandAnalysis", label: t("chatAssistant.quickActions.understandAnalysis") },
    { key: "technicalIssue", label: t("chatAssistant.quickActions.technicalIssue") },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(anonKey && { apikey: anonKey }),
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!resp.ok || !resp.body) {
      let msg = t("chatAssistant.connectionError");
      try {
        const errData = await resp.json();
        if (errData?.error) msg = errData.error;
      } catch {
        if (resp.status === 500) msg = "Erreur serveur. Vérifiez que GEMINI_API_KEY est configurée dans Supabase.";
      }
      throw new Error(msg);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
    window.dispatchEvent(new CustomEvent("subscription-refetch"));
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (error) {
      console.error("ChatAssistant error:", error);
      const errMsg = error instanceof Error ? error.message : t("chatAssistant.errorMessage");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `**Erreur :** ${errMsg}\n\n${t("chatAssistant.retryHint")}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 max-sm:bottom-20 max-sm:right-3">
        {/* Welcome bubble - above FAB on mobile to avoid covering footer */}
        {showWelcome && (
          <div className="relative bg-gradient-to-br from-primary via-accent to-primary/80 text-primary-foreground rounded-2xl px-4 py-3 shadow-xl w-[calc(100vw-2rem)] max-w-[280px] sm:max-w-[280px] animate-fade-in">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowWelcome(false);
              }}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("chatAssistant.close")}
            >
              <X className="h-3 w-3" />
            </button>
            <div className="flex items-start gap-2 min-w-0">
              <Bot className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm font-medium leading-relaxed break-words">
                {t("chatAssistant.welcomeBubble")}
              </p>
            </div>
            {/* Bubble tail */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-gradient-to-br from-primary/80 to-accent rotate-45" />
          </div>
        )}

        {/* FAB button */}
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all hover:scale-105"
          size="icon"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[350px] sm:w-[400px] h-[500px] bg-background border rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">{t("chatAssistant.title")}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" viewportRef={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm bg-muted p-3 rounded-lg">
                <p className="font-medium mb-2">{t("chatAssistant.welcomeTitle")}</p>
                <p className="text-muted-foreground mb-3">{t("chatAssistant.welcomeMessage")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.key}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => sendMessage(action.label)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`p-1.5 rounded-full shrink-0 ${
                    msg.role === "user" ? "bg-primary" : "bg-primary/10"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-3 w-3 text-primary-foreground" />
                  ) : (
                    <Bot className="h-3 w-3 text-primary" />
                  )}
                </div>
                <div
                  className={`text-sm p-3 rounded-lg max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="text-sm p-3 rounded-lg bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chatAssistant.inputPlaceholder")}
            disabled={isLoading}
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
