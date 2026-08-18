import { useMemo, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDownToLine, ArrowUpFromLine, Search, Trash2, Pencil, Inbox } from "lucide-react";
import { brl, formatDateBR, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Movement } from "@/lib/types";
import { toast } from "sonner";

interface MovementsTableProps {
  onEdit: (movement: Movement) => void;
}

export const MovementsTable = ({ onEdit }: MovementsTableProps) => {
  const { movements, stockLocations, productById, deleteMovement } = useStore();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "entrada" | "saida">("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [toDelete, setToDelete] = useState<Movement | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements
      .filter((m) => filterType === "all" || m.type === filterType)
      .filter((m) => filterLocation === "all" || m.location === filterLocation)
      .filter((m) => {
        if (!q) return true;
        const p = productById(m.productId);
        return [p?.name, p?.activeIngredient, p?.productClass, m.note]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q));
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1));
  }, [movements, search, filterType, filterLocation, productById]);

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMovement(toDelete.id);
    toast.success("Movimentação excluída — saldo do estoque atualizado");
    setToDelete(null);
  };

  return (
    <Card className="overflow-hidden border-border/60 shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto, princípio ativo…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterLocation} onValueChange={(v) => setFilterLocation(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Todos locais</SelectItem>
              {stockLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-soft text-leaf">
            <Inbox className="h-6 w-6" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold">Nenhuma movimentação ainda</p>
            <p className="text-sm text-muted-foreground">
              Clique em <span className="font-medium text-foreground">"Nova movimentação"</span> para registrar a primeira entrada ou saída.
            </p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[110px]">Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Nº OS</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Preço unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => {
              const p = productById(m.productId);
              const isIn = m.type === "entrada";
              const total = m.quantity * m.unitPrice;
              return (
                <TableRow key={m.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">{formatDateBR(m.date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 border-transparent font-medium",
                        isIn ? "bg-success/10 text-success" : "bg-coffee/10 text-coffee",
                      )}
                    >
                      {isIn ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                      {isIn ? "Entrada" : "Saída"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="leading-tight">
                      <p className="font-medium text-foreground">{p?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{p?.productClass} · {p?.activeIngredient}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="leading-tight">
                      <p className="text-foreground">{m.location}</p>
                      {m.activity && (
                        <p className="text-xs text-muted-foreground">{m.activity}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.osNumber || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {num(m.quantity)} <span className="text-xs text-muted-foreground">{p?.unit}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {m.unitPrice ? brl(m.unitPrice) : "—"}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", isIn ? "text-foreground" : "text-coffee")}>
                    {total ? brl(total) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onEdit(m)}
                        aria-label="Editar movimentação"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setToDelete(m)}
                        aria-label="Excluir movimentação"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita e vai alterar o saldo do estoque deste produto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
