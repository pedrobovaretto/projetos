import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { todayISO } from "@/lib/format";
import { ACTIVITIES, type Activity, type Location, type Movement, type MovementType } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement?: Movement | null;
}

export const MovementDialog = ({ open, onOpenChange, movement }: MovementDialogProps) => {
  const { products, stockLocations, addMovement, updateMovement } = useStore();
  const isEdit = !!movement;

  const [type, setType] = useState<MovementType>("entrada");
  const [date, setDate] = useState(todayISO());
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [location, setLocation] = useState<Location>("");
  const [activity, setActivity] = useState<Activity>("");
  const [note, setNote] = useState("");
  const [osNumber, setOsNumber] = useState("");

  useEffect(() => {
    if (!open) return;
    if (movement) {
      setType(movement.type);
      setDate(movement.date);
      setProductId(movement.productId);
      setQuantity(String(movement.quantity).replace(".", ","));
      setUnitPrice(movement.unitPrice > 0 ? String(movement.unitPrice).replace(".", ",") : "");
      setLocation(movement.location);
      setActivity(movement.activity ?? "");
      setNote(movement.note ?? "");
      setOsNumber(movement.osNumber ?? "");
    } else {
      setType("entrada");
      setDate(todayISO());
      setProductId("");
      setQuantity("");
      setUnitPrice("");
      setLocation(stockLocations.find((l) => l.active !== false)?.name ?? "");
      setActivity("");
      setNote("");
      setOsNumber("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, movement]);

  // Produto/local do registro em edição continuam disponíveis mesmo se tiverem sido inativados.
  const availableProducts = useMemo(() => {
    const active = products.filter((p) => p.active !== false);
    if (movement && !active.some((p) => p.id === movement.productId)) {
      const existing = products.find((p) => p.id === movement.productId);
      if (existing) return [...active, existing];
    }
    return active;
  }, [products, movement]);

  const availableLocations = useMemo(() => {
    const active = stockLocations.filter((l) => l.active !== false);
    if (movement && !active.some((l) => l.name === movement.location)) {
      const existing = stockLocations.find((l) => l.name === movement.location);
      return [...active, existing ?? { id: `hist-${movement.location}`, name: movement.location }];
    }
    return active;
  }, [stockLocations, movement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(quantity.replace(",", "."));
    const p = parseFloat((unitPrice || "0").replace(",", "."));
    if (!productId) return toast.error("Selecione um produto");
    if (!q || q <= 0) return toast.error("Quantidade inválida");
    if (type === "entrada" && (!p || p < 0)) return toast.error("Informe o preço unitário");
    if (!location) return toast.error("Selecione o local");

    const payload = {
      type,
      date,
      productId,
      quantity: q,
      unitPrice: p,
      location,
      activity: activity || undefined,
      note: note.trim() || undefined,
      osNumber: osNumber.trim() || undefined,
    };

    if (isEdit && movement) {
      updateMovement(movement.id, payload);
      toast.success("Movimentação atualizada");
    } else {
      addMovement(payload);
      toast.success(type === "entrada" ? "Entrada registrada" : "Saída registrada");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isEdit ? "Editar movimentação" : "Registrar movimentação"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados desta movimentação. O saldo do estoque é recalculado automaticamente."
              : "Registre entradas e saídas de produtos do estoque."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as MovementType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrada" className={cn("gap-2", type === "entrada" && "data-[state=active]:text-success")}>
                <ArrowDownToLine className="h-4 w-4" /> Entrada
              </TabsTrigger>
              <TabsTrigger value="saida" className={cn("gap-2", type === "saida" && "data-[state=active]:text-coffee")}>
                <ArrowUpFromLine className="h-4 w-4" /> Saída
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Local</Label>
              <Select value={location} onValueChange={(v) => setLocation(v as Location)}>
                <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Produto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {availableProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{p.productClass} · {p.unit}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantidade</Label>
              <Input id="qty" inputMode="decimal" placeholder="0,00" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">
                Preço unitário {type === "saida" && <span className="text-muted-foreground">(opcional)</span>}
              </Label>
              <Input id="price" inputMode="decimal" placeholder="R$ 0,00" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="osNumber">Nº da OS <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              id="osNumber"
              value={osNumber}
              onChange={(e) => setOsNumber(e.target.value)}
              placeholder="Ex.: OS #001"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Atividade <span className="text-muted-foreground">(opcional)</span></Label>
            <Select value={activity || "none"} onValueChange={(v) => setActivity(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione a atividade" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">— Sem atividade —</SelectItem>
                {ACTIVITIES.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Observação <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: NF 12345, fornecedor…" />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="gap-2">
              {isEdit ? "Salvar alterações" : `Registrar ${type === "entrada" ? "entrada" : "saída"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
