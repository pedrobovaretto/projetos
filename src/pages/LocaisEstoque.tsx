import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { StockLocationDialog } from "@/components/StockLocationDialog";
import { DuplicateAuditDialog } from "@/components/DuplicateAuditDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { Search, MapPin, Plus, Pencil, Trash2, RotateCcw, ScanSearch } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import type { StockLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LocaisEstoque = () => {
  const { stockLocations, removeOrDeactivateStockLocation, reactivateStockLocation, mergeStockLocations } =
    useStore();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [editing, setEditing] = useState<StockLocation | null>(null);
  const [toDelete, setToDelete] = useState<StockLocation | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stockLocations
      .filter((l) => !q || l.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [stockLocations, search]);

  const duplicateItems = useMemo(
    () => stockLocations.map((l) => ({ id: l.id, label: l.name, sublabel: l.id })),
    [stockLocations],
  );

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (l: StockLocation) => {
    setEditing(l);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const result = removeOrDeactivateStockLocation(toDelete.id);
    if (result === "deactivated") {
      toast.success("Local possui movimentações e foi inativado (histórico preservado)");
    } else {
      toast.success("Local excluído");
    }
    setToDelete(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Locais de Estoque</h1>
            <p className="text-sm text-muted-foreground">
              {stockLocations.length}{" "}
              {stockLocations.length === 1 ? "local cadastrado" : "locais cadastrados"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDuplicatesOpen(true)} className="gap-2">
              <ScanSearch className="h-4 w-4" />
              Verificar duplicados
            </Button>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo local
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 shadow-soft">
          <div className="border-b border-border/60 bg-muted/30 p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-soft text-leaf">
                <MapPin className="h-6 w-6" />
              </div>
              <p className="font-serif text-lg font-semibold">Nenhum local encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar a busca.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[90px]">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const inactive = l.active === false;
                  return (
                    <TableRow key={l.id} className={cn("group", inactive && "opacity-60")}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.id}</TableCell>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          {l.name}
                          {inactive && (
                            <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                              Inativo
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(l)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {inactive ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                reactivateStockLocation(l.id);
                                toast.success("Local reativado");
                              }}
                              aria-label="Reativar"
                            >
                              <RotateCcw className="h-4 w-4 text-leaf" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setToDelete(l)}
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>

      <StockLocationDialog open={dialogOpen} onOpenChange={setDialogOpen} location={editing} />
      <DuplicateAuditDialog
        open={duplicatesOpen}
        onOpenChange={setDuplicatesOpen}
        items={duplicateItems}
        onMerge={mergeStockLocations}
        entityName="local"
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local?</AlertDialogTitle>
            <AlertDialogDescription>
              Se o local não tiver movimentações, ele será excluído permanentemente. Se já tiver
              movimentações registradas, ele será inativado: deixa de aparecer como opção para novas
              movimentações, mas continua exibido corretamente no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LocaisEstoque;
