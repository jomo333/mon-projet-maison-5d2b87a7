import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SubscriberStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Actif", variant: "default" },
  trial: { label: "Essai", variant: "secondary" },
  cancelled: { label: "Annulé", variant: "destructive" },
  paused: { label: "Pause", variant: "outline" },
  past_due: { label: "En retard", variant: "destructive" },
  free: { label: "Gratuit", variant: "outline" },
};

export function SubscriberStatusBadge({ status }: SubscriberStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === "active" && "bg-primary/10 text-primary hover:bg-primary/10",
        status === "trial" && "bg-secondary text-secondary-foreground hover:bg-secondary",
        status === "paused" && "bg-accent text-accent-foreground hover:bg-accent",
        status === "free" && "bg-muted text-muted-foreground hover:bg-muted"
      )}
    >
      {config.label}
    </Badge>
  );
}
