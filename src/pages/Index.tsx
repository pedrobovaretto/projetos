import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppHeader } from "@/components/AppHeader";
import { MovementDialog } from "@/components/MovementDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/hooks/useStore";
import { brl, num } from "@/lib/format";
import { Search, Wallet, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const { products, movements } = useStore();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [ingredientFilter, setIngredientFilter] = useState<string>("all");
  const [refDate, setRefDate] = useState<Date | undefined>(undefined);
  const refDateISO = refDate ? format(refDate, "yyyy-MM-dd") : null;

  const classes = useMemo(
    () => Array.from(new Set(products.map((p) => p.productClass))).sort(),
    [products],
  );
  const ingredients = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.activeIngredient).filter((s) => s && s.trim().length > 0)),
      ).sort(),
    [products],
  );
  const stockByProduct = useMemo(() => {
    const map = new Map<string, { qty: number; value: number; lastPrice: number }>();
    // Sort by date asc to keep last known unit price
    const sorted = [...movements].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt < b.createdAt ? -1 : 1,
    );
    for (const m of sorted) {
      const cur = map.get(m.productId) ?? { qty: 0, value: 0, lastPrice: 0 };
      if (m.type === "entrada") {
        cur.qty += m.quantity;
        cur.value += m.quantity * m.unitPrice;
        if (m.unitPrice > 0) cur.lastPrice = m.unitPrice;
      } else {
        cur.qty -= m.quantity;
        const price = m.unitPrice > 0 ? m.unitPrice : cur.lastPrice;
        cur.value -= m.quantity * price;
      }
      map.set(m.productId, cur);
    }
    return map;
  }, [movements]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .map((p) => {
        const s = stockByProduct.get(p.id) ?? { qty: 0, value: 0, lastPrice: 0 };
        return { product: p, qty: s.qty, value: Math.max(s.value, 0) };
      })
      .filter(({ product }) => classFilter === "all" || product.productClass === classFilter)
      .filter(
        ({ product }) =>
          ingredientFilter === "all" || product.activeIngredient === ingredientFilter,
      )
      .filter(({ product }) => {
        if (!q) return true;
        return [product.name, product.activeIngredient, product.productClass, product.id].some(
          (s) => s.toLowerCase().includes(q),
        );
      })
      .sort((a, b) => a.product.name.localeCompare(b.product.name, "pt-BR"));
  }, [products, stockByProduct, search, classFilter, ingredientFilter]);

  const totals = useMemo(() => {
    let value = 0;
    let inStock = 0;
    for (const r of rows) {
      value += r.value;
      if (r.qty > 0) inStock += 1;
    }
    return { value, inStock };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <section className="border-b border-border/60">
        <div className="container flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Estoque</h1>
            <p className="text-sm text-muted-foreground">
              Saldo atual e valor financeiro por produto.
            </p>
          </div>
          <MovementDialog />
        </div>
      </section>

      <main className="container space-y-6 py-8 pb-16">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-leaf" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Valor total em estoque
              </p>
              <p className="font-serif text-2xl font-semibold tabular-nums">
                {brl(totals.value)}
              </p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 shadow-soft">
          <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Todas as classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ingredientFilter} onValueChange={setIngredientFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Princípio ativo" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Todos os princípios ativos</SelectItem>
                  {ingredients.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !refDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {refDate
                      ? `Saldo em ${format(refDate, "dd/MM/yyyy", { locale: ptBR })}`
                      : "Saldo até a data…"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={refDate}
                    onSelect={setRefDate}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {refDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRefDate(undefined)}
                  aria-label="Limpar data"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="hidden grid-cols-12 gap-4 border-b border-border/60 bg-muted/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
            <div className="col-span-6">Produto</div>
            <div className="col-span-2 text-right">Saldo</div>
            <div className="col-span-4 text-right">Valor em estoque</div>
          </div>

          <ScrollArea className="h-[520px]">
            {rows.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {rows.map(({ product: p, qty, value }) => {
                  const empty = qty <= 0;
                  return (
                    <li
                      key={p.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="col-span-12 sm:col-span-6">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{p.name}</span>
                          <Badge
                            variant="outline"
                            className="border-transparent bg-leaf-soft text-leaf text-[10px]"
                          >
                            {p.productClass}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.activeIngredient || "—"} · cód. {p.id}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "col-span-6 text-right tabular-nums sm:col-span-2",
                          empty ? "text-muted-foreground" : "font-medium",
                        )}
                      >
                        {num(qty)}{" "}
                        <span className="text-xs text-muted-foreground">{p.unit}</span>
                      </div>
                      <div
                        className={cn(
                          "col-span-6 text-right tabular-nums sm:col-span-4",
                          empty ? "text-muted-foreground" : "font-semibold text-foreground",
                        )}
                      >
                        {brl(value)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </Card>
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          Domingos Bovaretto · Controle de estoque interno
        </div>
      </footer>
    </div>
  );
};

const SummaryTile = ({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <Card
    className={cn(
      "border-border/60 p-4 shadow-soft",
      highlight && "bg-leaf-soft/40",
    )}
  >
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-background text-leaf">
        {icon}
      </span>
      {label}
    </div>
    <p className="mt-2 font-serif text-2xl font-semibold tabular-nums">{value}</p>
  </Card>
);

export default Index;
