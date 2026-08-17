import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Package, ArrowDownToLine, ArrowUpFromLine, Wallet, Boxes } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useStore } from "@/hooks/useStore";
import { brl, num } from "@/lib/format";
import { cn } from "@/lib/utils";

export const ProductBalanceCard = () => {
  const { products, movements } = useStore();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [products],
  );

  const selected = productId ? products.find((p) => p.id === productId) : null;

  const productStats = useMemo(() => {
    if (!productId) return null;
    let entradas = 0;
    let saidas = 0;
    let valorEntradas = 0;
    for (const m of movements) {
      if (m.productId !== productId) continue;
      if (m.type === "entrada") {
        entradas += m.quantity;
        valorEntradas += m.quantity * m.unitPrice;
      } else {
        saidas += m.quantity;
      }
    }
    return { entradas, saidas, saldo: entradas - saidas, valorEntradas };
  }, [movements, productId]);

  const generalStats = useMemo(() => {
    let valorEntradas = 0;
    for (const m of movements) {
      if (m.type === "entrada") valorEntradas += m.quantity * m.unitPrice;
    }
    return { total: movements.length, valorEntradas };
  }, [movements]);

  return (
    <Card className="overflow-hidden border-border/60 shadow-soft">
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-leaf-soft text-leaf">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold tracking-tight">Saldo por produto</h2>
              <p className="text-xs text-muted-foreground">
                Selecione um produto para ver entradas, saídas e saldo atual.
              </p>
            </div>
          </div>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between sm:w-[320px]"
              >
                <span className="truncate">
                  {selected ? selected.name : "Buscar produto…"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="end">
              <Command>
                <CommandInput placeholder="Digite o nome do produto…" />
                <CommandList>
                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                  <CommandGroup>
                    {sortedProducts.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.activeIngredient} ${p.productClass}`}
                        onSelect={() => {
                          setProductId(p.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            productId === p.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.productClass} · {p.unit}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {selected && productStats ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="leading-tight">
                  <p className="font-serif text-lg font-semibold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.productClass} · {selected.activeIngredient} · unidade {selected.unit}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                icon={<ArrowDownToLine className="h-4 w-4" />}
                tone="success"
                label="Entradas"
                value={`${num(productStats.entradas)} ${selected.unit}`}
              />
              <Stat
                icon={<ArrowUpFromLine className="h-4 w-4" />}
                tone="coffee"
                label="Saídas"
                value={`${num(productStats.saidas)} ${selected.unit}`}
              />
              <Stat
                icon={<Boxes className="h-4 w-4" />}
                tone="leaf"
                label="Saldo atual"
                value={`${num(productStats.saldo)} ${selected.unit}`}
                highlight
              />
              <Stat
                icon={<Wallet className="h-4 w-4" />}
                tone="warning"
                label="Investido"
                value={brl(productStats.valorEntradas)}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Sem produto selecionado. Resumo geral:{" "}
              <strong className="text-foreground">{generalStats.total}</strong>{" "}
              {generalStats.total === 1 ? "movimentação" : "movimentações"} ·{" "}
              <strong className="text-foreground">{brl(generalStats.valorEntradas)}</strong> investidos
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

const toneClasses: Record<string, string> = {
  success: "bg-success/10 text-success",
  coffee: "bg-coffee/10 text-coffee",
  leaf: "bg-leaf-soft text-leaf",
  warning: "bg-warning/10 text-warning",
};

const Stat = ({
  icon,
  label,
  value,
  tone,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "coffee" | "leaf" | "warning";
  highlight?: boolean;
}) => (
  <div
    className={cn(
      "rounded-xl border border-border/60 p-3",
      highlight ? "bg-leaf-soft/50" : "bg-card",
    )}
  >
    <div className="flex items-center gap-2">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneClasses[tone])}>
        {icon}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
    <p className="mt-2 font-serif text-lg font-semibold tabular-nums">{value}</p>
  </div>
);
