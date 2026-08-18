import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CopyCheck, SearchX } from "lucide-react";
import { normalizeName } from "@/lib/utils";
import { toast } from "sonner";

export interface DuplicateItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface DuplicateAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DuplicateItem[];
  onMerge: (keepId: string, mergeIds: string[]) => void;
  /** ex.: "produto", "local" — usado nas mensagens */
  entityName: string;
}

export const DuplicateAuditDialog = ({
  open,
  onOpenChange,
  items,
  onMerge,
  entityName,
}: DuplicateAuditDialogProps) => {
  const groups = useMemo(() => {
    const map = new Map<string, DuplicateItem[]>();
    for (const item of items) {
      const key = normalizeName(item.label);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.values()).filter((g) => g.length > 1);
  }, [items]);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ keepId: string; mergeIds: string[] } | null>(null);

  const keyFor = (group: DuplicateItem[]) => normalizeName(group[0].label);

  const handleMergeClick = (group: DuplicateItem[]) => {
    const key = keyFor(group);
    const keepId = selected[key] ?? group[0].id;
    const mergeIds = group.filter((i) => i.id !== keepId).map((i) => i.id);
    setPending({ keepId, mergeIds });
  };

  const confirmMerge = () => {
    if (!pending) return;
    onMerge(pending.keepId, pending.mergeIds);
    toast.success(`Registros mesclados em 1 ${entityName}`);
    setPending(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Verificar duplicados</DialogTitle>
            <DialogDescription>
              Registros com nomes muito parecidos (diferenças de maiúsculas/minúsculas ou espaços) que
              podem ser o mesmo {entityName}.
            </DialogDescription>
          </DialogHeader>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-soft text-leaf">
                <SearchX className="h-6 w-6" />
              </div>
              <p className="font-serif text-lg font-semibold">Nenhum duplicado encontrado</p>
              <p className="text-sm text-muted-foreground">Todos os nomes cadastrados são diferentes entre si.</p>
            </div>
          ) : (
            <div className="max-h-[55vh] space-y-4 overflow-auto">
              {groups.map((group) => {
                const key = keyFor(group);
                const keepId = selected[key] ?? group[0].id;
                return (
                  <Card key={key} className="border-border/60 p-4">
                    <p className="mb-2 text-sm font-medium">
                      Escolha qual registro manter ({group.length} encontrados):
                    </p>
                    <RadioGroup
                      value={keepId}
                      onValueChange={(v) => setSelected((s) => ({ ...s, [key]: v }))}
                      className="space-y-2"
                    >
                      {group.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <RadioGroupItem value={item.id} id={`${key}-${item.id}`} />
                          <Label htmlFor={`${key}-${item.id}`} className="flex-1 cursor-pointer font-normal">
                            <span className="font-medium text-foreground">{item.label}</span>
                            {item.sublabel && (
                              <span className="ml-2 text-xs text-muted-foreground">{item.sublabel}</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" className="gap-2" onClick={() => handleMergeClick(group)}>
                        <CopyCheck className="h-4 w-4" />
                        Mesclar neste registro
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mesclar registros duplicados?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.mergeIds.length} registro(s) serão removidos e todas as movimentações vinculadas a
              eles passarão a apontar para o registro mantido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMerge}>Mesclar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
