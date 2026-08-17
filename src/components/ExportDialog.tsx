import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/useStore";
import { exportToXlsx, filterMovementsByPeriod } from "@/lib/exportXlsx";
import { toast } from "sonner";

const toISO = (d: Date) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
};

const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const ExportDialog = () => {
  const { products, movements } = useStore();
  const [open, setOpen] = useState(false);

  const earliest = useMemo(() => {
    if (!movements.length) return toISO(new Date());
    return movements.reduce((min, m) => (m.date < min ? m.date : min), movements[0].date);
  }, [movements]);

  const today = toISO(new Date());

  const [from, setFrom] = useState<string>(earliest);
  const [to, setTo] = useState<string>(today);

  const setShortcut = (kind: "30d" | "month" | "year" | "all") => {
    const now = new Date();
    if (kind === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setFrom(toISO(d));
      setTo(toISO(now));
    } else if (kind === "month") {
      setFrom(toISO(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTo(toISO(now));
    } else if (kind === "year") {
      setFrom(toISO(new Date(now.getFullYear(), 0, 1)));
      setTo(toISO(now));
    } else {
      setFrom(earliest);
      setTo(toISO(now));
    }
  };

  const count = useMemo(
    () => filterMovementsByPeriod(movements, { from, to }).length,
    [movements, from, to],
  );

  const invalid = from > to;

  const handleExport = () => {
    if (invalid) return;
    try {
      exportToXlsx(products, movements, { from, to });
      toast.success("Planilha exportada", {
        description: `${count} movimentação(ões) no período.`,
      });
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao exportar a planilha");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Excel</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Exportar movimentações</DialogTitle>
          <DialogDescription>
            Escolha o período. A planilha terá Produtos, Movimentações e Saldo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShortcut("30d")}>
              Últimos 30 dias
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShortcut("month")}>
              Mês atual
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShortcut("year")}>
              Ano atual
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShortcut("all")}>
              Tudo
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateField label="Data inicial" value={from} onChange={setFrom} />
            <DateField label="Data final" value={to} onChange={setTo} />
          </div>

          <div
            className={cn(
              "rounded-lg border bg-muted/40 px-3 py-2 text-sm",
              invalid && "border-destructive/60 text-destructive",
            )}
          >
            {invalid ? (
              "A data inicial deve ser anterior ou igual à data final."
            ) : (
              <>
                <span className="font-medium text-foreground">{count}</span>{" "}
                movimentação(ões) no período selecionado.
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={invalid} className="gap-2">
            <Download className="h-4 w-4" />
            Baixar planilha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}

const DateField = ({ label, value, onChange }: DateFieldProps) => {
  const date = value ? fromISO(value) : undefined;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onChange(toISO(d))}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
