import { useEffect, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StockLocation } from "@/lib/types";
import { toast } from "sonner";

interface StockLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: StockLocation | null;
}

export const StockLocationDialog = ({ open, onOpenChange, location }: StockLocationDialogProps) => {
  const { stockLocations, addStockLocation, updateStockLocation } = useStore();
  const isEdit = !!location;

  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(location?.name ?? "");
    }
  }, [open, location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Informe o nome do local");
    const duplicate = stockLocations.some(
      (l) => l.id !== location?.id && l.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return toast.error("Já existe um local com esse nome");

    if (isEdit && location) {
      updateStockLocation(location.id, { name: trimmed });
      toast.success("Local atualizado");
    } else {
      addStockLocation({ name: trimmed });
      toast.success("Local cadastrado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEdit ? "Editar local" : "Novo local"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize o nome do local de estoque."
              : "Cadastre um novo local de estoque."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="locationName">Nome</Label>
            <Input
              id="locationName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Fazenda São Pedro"
              required
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
