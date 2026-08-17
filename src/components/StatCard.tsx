import { ArrowDownToLine, ArrowUpFromLine, Package, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: "in" | "out" | "stock" | "money";
  hint?: string;
  tone?: "leaf" | "coffee" | "success" | "warning";
}

const ICONS = {
  in: ArrowDownToLine,
  out: ArrowUpFromLine,
  stock: Package,
  money: Wallet,
};

export const StatCard = ({ label, value, icon, hint, tone = "leaf" }: StatCardProps) => {
  const Icon = ICONS[icon];
  const toneBg: Record<string, string> = {
    leaf: "bg-leaf-soft text-leaf",
    coffee: "bg-secondary text-coffee",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
  };

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneBg[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
};

export const formatStatValue = (n: number, money = false) => (money ? brl(n) : String(n));
