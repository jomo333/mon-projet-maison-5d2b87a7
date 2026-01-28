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
};

export function SubscriberStatusBadge({ status }: SubscriberStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === "active" && "bg-green-100 text-green-800 hover:bg-green-100",
        status === "trial" && "bg-blue-100 text-blue-800 hover:bg-blue-100",
        status === "paused" && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      )}
    >
      {config.label}
    </Badge>
  );
}
