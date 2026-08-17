import { useState } from "react";
import { useStore } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { todayISO } from "@/lib/format";
import { ACTIVITIES, type Activity, type Location, type MovementType } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const MovementDialog = () => {
  const { products, stockLocations, addMovement } = useStore();
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<MovementType>("entrada");
  const [date, setDate] = useState(todayISO());
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [location, setLocation] = useState<Location>(stockLocations[0]?.name ?? "");
  const [activity, setActivity] = useState<Activity>("");
  const [note, setNote] = useState("");
  const [osNumber, setOsNumber] = useState("");

  const reset = () => {
    setType("entrada");
    setDate(todayISO());
    setProductId("");
    setQuantity("");
    setUnitPrice("");
    setLocation(stockLocations[0]?.name ?? "");
    setActivity("");
    setNote("");
    setOsNumber("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(quantity.replace(",", "."));
    const p = parseFloat((unitPrice || "0").replace(",", "."));
    if (!productId) return toast.error("Selecione um produto");
    if (!q || q <= 0) return toast.error("Quantidade inválida");
    if (type === "entrada" && (!p || p < 0)) return toast.error("Informe o preço unitário");
    if (!location) return toast.error("Selecione o local");

    addMovement({
      type,
      date,
      productId,
      quantity: q,
      unitPrice: p,
      location,
      activity: activity || undefined,
      note: note.trim() || undefined,
      osNumber: osNumber.trim() || undefined,
    });
    toast.success(type === "entrada" ? "Entrada registrada" : "Saída registrada");
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 rounded-full px-5 shadow-soft">
          <Plus className="h-4 w-4" />
          Nova movimentação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Registrar movimentação</DialogTitle>
          <DialogDescription>
            Registre entradas e saídas de produtos do estoque.
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
                  {stockLocations.map((loc) => (
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
                {products.map((p) => (
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="gap-2">
              Registrar {type === "entrada" ? "entrada" : "saída"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
