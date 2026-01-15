import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Permis", prevu: 5000, reel: 4800 },
  { name: "Fondations", prevu: 35000, reel: 33500 },
  { name: "Structure", prevu: 45000, reel: 28000 },
  { name: "Toiture", prevu: 18000, reel: 0 },
  { name: "Fenêtres", prevu: 22000, reel: 0 },
  { name: "Électricité", prevu: 15000, reel: 0 },
  { name: "Plomberie", prevu: 12000, reel: 0 },
  { name: "Isolation", prevu: 8000, reel: 0 },
];

export function BudgetChart() {
  return (
    <Card className="animate-fade-in" style={{ animationDelay: "400ms" }}>
      <CardHeader>
        <CardTitle className="font-display">Suivi budgétaire</CardTitle>
        <CardDescription>Comparaison budget prévu vs réel par étape</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toLocaleString()} $`, '']}
              />
              <Bar dataKey="prevu" name="Budget prévu" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-prevu-${index}`} fill="hsl(var(--primary))" opacity={0.3} />
                ))}
              </Bar>
              <Bar dataKey="reel" name="Dépenses réelles" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-reel-${index}`} 
                    fill={entry.reel > entry.prevu ? "hsl(var(--destructive))" : "hsl(var(--accent))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/30" />
            <span className="text-sm text-muted-foreground">Budget prévu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent" />
            <span className="text-sm text-muted-foreground">Dépenses réelles</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
