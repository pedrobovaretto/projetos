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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, ProductClass, Unit } from "@/lib/types";
import { normalizeName } from "@/lib/utils";
import { toast } from "sonner";

const CLASSES: ProductClass[] = [
  "Herbicida",
  "Herbicida Seletivo",
  "Inseticida",
  "Fungicida",
  "Fungicida/Bactericida",
  "Nematicida/Fungicida",
  "Inseticida/Acaricida",
  "Acaricida",
  "Adjuvante",
  "Óleo Mineral",
  "Nutrição",
  "Adubo",
  "Semente",
  "Outro",
];

const UNITS: Unit[] = ["L", "kg", "un"];

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export const ProductDialog = ({ open, onOpenChange, product }: ProductDialogProps) => {
  const { products, addProduct, updateProduct } = useStore();
  const isEdit = !!product;

  const [name, setName] = useState("");
  const [productClass, setProductClass] = useState<ProductClass>("Outro");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [unit, setUnit] = useState<Unit>("L");

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setProductClass(product?.productClass ?? "Outro");
      setActiveIngredient(product?.activeIngredient ?? "");
      setUnit(product?.unit ?? "L");
    }
  }, [open, product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome do produto");
    const duplicate = products.some(
      (p) => p.id !== product?.id && normalizeName(p.name) === normalizeName(name),
    );
    if (duplicate) return toast.error("Já existe um produto com esse nome");
    const payload = {
      name: name.trim(),
      productClass,
      activeIngredient: activeIngredient.trim(),
      unit,
    };
    if (isEdit && product) {
      updateProduct(product.id, payload);
      toast.success("Produto atualizado");
    } else {
      addProduct(payload);
      toast.success("Produto cadastrado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEdit ? "Editar produto" : "Novo produto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do produto."
              : "Cadastre um novo item no catálogo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Classe</Label>
            <Select value={productClass} onValueChange={(v) => setProductClass(v as ProductClass)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai">Princípio ativo</Label>
            <Input
              id="ai"
              value={activeIngredient}
              onChange={(e) => setActiveIngredient(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unidade</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
