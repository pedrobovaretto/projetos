import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ProductDialog } from "@/components/ProductDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Search, Package, Plus, Pencil, Trash2, FileUp, X, RotateCcw, ScanSearch } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { ImportProductsDialog } from "@/components/ImportProductsDialog";
import { DuplicateAuditDialog } from "@/components/DuplicateAuditDialog";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Produtos = () => {
  const { products, removeOrDeactivateProduct, reactivateProduct, mergeProducts } = useStore();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [ingredientFilter, setIngredientFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const uniqueSorted = (values: string[]) =>
    Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // Opções dependentes: cada filtro considera os demais já aplicados
  const matches = (p: Product, skip?: "class" | "ingredient" | "unit") => {
    const q = search.trim().toLowerCase();
    if (q && ![p.name, p.activeIngredient, p.productClass, p.id].some((s) => s.toLowerCase().includes(q)))
      return false;
    if (skip !== "class" && classFilter !== "all" && p.productClass !== classFilter) return false;
    if (skip !== "ingredient" && ingredientFilter !== "all" && p.activeIngredient !== ingredientFilter) return false;
    if (skip !== "unit" && unitFilter !== "all" && p.unit !== unitFilter) return false;
    return true;
  };

  const classes = useMemo(
    () => uniqueSorted(products.filter((p) => matches(p, "class")).map((p) => p.productClass)),
    [products, search, ingredientFilter, unitFilter],
  );
  const ingredients = useMemo(
    () => uniqueSorted(products.filter((p) => matches(p, "ingredient")).map((p) => p.activeIngredient)),
    [products, search, classFilter, unitFilter],
  );
  const units = useMemo(
    () => uniqueSorted(products.filter((p) => matches(p, "unit")).map((p) => p.unit)),
    [products, search, classFilter, ingredientFilter],
  );

  const filtered = useMemo(
    () => products.filter((p) => matches(p)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [products, search, classFilter, ingredientFilter, unitFilter],
  );

  const hasFilters =
    !!search.trim() ||
    classFilter !== "all" ||
    ingredientFilter !== "all" ||
    unitFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setClassFilter("all");
    setIngredientFilter("all");
    setUnitFilter("all");
  };


  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const result = removeOrDeactivateProduct(toDelete.id);
    if (result === "deactivated") {
      toast.success("Produto possui movimentações e foi inativado (histórico preservado)");
    } else {
      toast.success("Produto excluído");
    }
    setToDelete(null);
  };

  const duplicateItems = useMemo(
    () => products.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.productClass} · ${p.id}` })),
    [products],
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container space-y-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Produtos</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} {products.length === 1 ? "produto cadastrado" : "produtos cadastrados"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDuplicatesOpen(true)} className="gap-2">
              <ScanSearch className="h-4 w-4" />
              Verificar duplicados
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <FileUp className="h-4 w-4" />
              Importar Excel
            </Button>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 shadow-soft">
          <div className="space-y-3 border-b border-border/60 bg-muted/30 p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, princípio ativo, código…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
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
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Todos os princípios ativos</SelectItem>
                  {ingredients.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {units.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
              <span className="text-sm text-muted-foreground sm:ml-auto">
                {filtered.length} de {products.length}
              </span>
            </div>
          </div>


          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-soft text-leaf">
                <Package className="h-6 w-6" />
              </div>
              <p className="font-serif text-lg font-semibold">Nenhum produto encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar a busca ou o filtro.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[90px]">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Princípio Ativo</TableHead>
                  <TableHead className="w-[90px]">Unidade</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const inactive = p.active === false;
                  return (
                    <TableRow key={p.id} className={cn("group", inactive && "opacity-60")}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          {p.name}
                          {inactive && (
                            <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                              Inativo
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-transparent bg-leaf-soft text-leaf">
                          {p.productClass}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.activeIngredient}</TableCell>
                      <TableCell className="text-sm">{p.unit}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(p)}
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
                                reactivateProduct(p.id);
                                toast.success("Produto reativado");
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
                              onClick={() => setToDelete(p)}
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

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />
      <ImportProductsDialog open={importOpen} onOpenChange={setImportOpen} />
      <DuplicateAuditDialog
        open={duplicatesOpen}
        onOpenChange={setDuplicatesOpen}
        items={duplicateItems}
        onMerge={mergeProducts}
        entityName="produto"
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se o produto não tiver movimentações, ele será excluído permanentemente. Se já tiver
              movimentações registradas, ele será inativado (não aparecerá mais para novas movimentações,
              mas o histórico é preservado).
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

export default Produtos;
