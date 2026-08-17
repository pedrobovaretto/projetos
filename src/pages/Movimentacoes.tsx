import { useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { MovementDialog } from "@/components/MovementDialog";
import { MovementsTable } from "@/components/MovementsTable";
import { Card } from "@/components/ui/card";
import { useStore } from "@/hooks/useStore";
import { brl, num } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const Movimentacoes = () => {
  const { movements } = useStore();

  const stats = useMemo(() => {
    let entradasQty = 0;
    let saidasQty = 0;
    let entradasValor = 0;
    let saidasValor = 0;
    for (const m of movements) {
      if (m.type === "entrada") {
        entradasQty += m.quantity;
        entradasValor += m.quantity * m.unitPrice;
      } else {
        saidasQty += m.quantity;
        saidasValor += m.quantity * m.unitPrice;
      }
    }
    return {
      entradasQty,
      saidasQty,
      entradasValor,
      saidasValor,
      saldoValor: entradasValor - saidasValor,
      total: movements.length,
    };
  }, [movements]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Movimentações</h1>
            <p className="text-sm text-muted-foreground">
              Fluxo de entradas e saídas do estoque.
            </p>
          </div>
          <MovementDialog />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FlowTile
            tone="success"
            icon={<ArrowDownToLine className="h-4 w-4" />}
            label="Entradas"
            primary={`${num(stats.entradasQty)}`}
            secondary={brl(stats.entradasValor)}
          />
          <FlowTile
            tone="coffee"
            icon={<ArrowUpFromLine className="h-4 w-4" />}
            label="Saídas"
            primary={`${num(stats.saidasQty)}`}
            secondary={brl(stats.saidasValor)}
          />
          <FlowTile
            tone="leaf"
            icon={<Activity className="h-4 w-4" />}
            label="Saldo financeiro"
            primary={brl(stats.saldoValor)}
            secondary="entradas − saídas"
          />
          <FlowTile
            tone="muted"
            icon={<Activity className="h-4 w-4" />}
            label="Total de registros"
            primary={String(stats.total)}
            secondary={stats.total === 1 ? "movimentação" : "movimentações"}
          />
        </div>

        <MovementsTable />
      </main>
    </div>
  );
};

const toneMap: Record<string, string> = {
  success: "bg-success/10 text-success",
  coffee: "bg-coffee/10 text-coffee",
  leaf: "bg-leaf-soft text-leaf",
  muted: "bg-muted text-muted-foreground",
};

const FlowTile = ({
  icon,
  label,
  primary,
  secondary,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
  tone: keyof typeof toneMap;
}) => (
  <Card className="border-border/60 p-4 shadow-soft">
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneMap[tone])}>
        {icon}
      </span>
      {label}
    </div>
    <p className="mt-2 font-serif text-2xl font-semibold tabular-nums">{primary}</p>
    <p className="text-xs text-muted-foreground">{secondary}</p>
  </Card>
);

export default Movimentacoes;
