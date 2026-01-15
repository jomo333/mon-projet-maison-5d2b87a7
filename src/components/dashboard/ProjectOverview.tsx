import { TrendingUp, Calendar, DollarSign, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const stats = [
  {
    title: "Avancement global",
    value: "35%",
    description: "7 étapes sur 20 complétées",
    icon: TrendingUp,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "Budget utilisé",
    value: "87 500 $",
    description: "sur 250 000 $ prévus",
    icon: DollarSign,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Jours restants",
    value: "185",
    description: "Fin prévue: 15 août 2025",
    icon: Calendar,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Corps de métier",
    value: "4/12",
    description: "actuellement actifs",
    icon: Users,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

export function ProjectOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.title} 
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
              {stat.title === "Avancement global" && (
                <Progress value={35} className="mt-3 h-2" />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
