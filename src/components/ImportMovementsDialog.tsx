import { useRef, useState } from "react";
import * as XLSX from "xlsx";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import type { Movement, MovementType } from "@/lib/types";
import { parseDateBR, formatDateBR } from "@/lib/format";
import { toast } from "sonner";

const COLUMNS = [
  "Data",
  "Tipo",
  "Produto",
  "Quantidade",
  "Local",
  "Preço Unit. (R$)",
  "Nº OS",
  "Observação",
] as const;

type RowStatus = "valid" | "error";

interface ParsedRow {
  line: number;
  status: RowStatus;
  message?: string;
  data: Omit<Movement, "id" | "createdAt"> | null;
  preview: { date: string; type: string; product: string; quantity: string; location: string };
}

const DIACRITICS_RE = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

const norm = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "");

export const ImportMovementsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { products, stockLocations, addMovements } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");

  const reset = () => {
    setRows(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [...COLUMNS],
      ["10/01/2026", "Entrada", "Nome do produto já cadastrado", "10", "Nome do local já cadastrado", "15,50", "", "Ex.: NF 12345"],
      ["12/01/2026", "Saída", "Nome do produto já cadastrado", "2", "Nome do local já cadastrado", "", "OS #001", ""],
    ]);
    ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 34 }, { wch: 12 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimentações");
    XLSX.writeFile(wb, "modelo-importacao-movimentacoes.xlsx");
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (!raw.length) {
        toast.error("A planilha está vazia");
        return;
      }

      const parsed: ParsedRow[] = raw.map((r, i) => {
        const get = (key: string) => {
          const k = Object.keys(r).find((kk) => norm(kk) === norm(key));
          return k ? String(r[k] ?? "").trim() : "";
        };
        const dataRaw = get("Data");
        const tipoRaw = get("Tipo");
        const produtoRaw = get("Produto");
        const qtdRaw = get("Quantidade");
        const localRaw = get("Local");
        const precoRaw = get("Preço Unit. (R$)");
        const osNumberRaw = get("Nº OS");
        const obsRaw = get("Observação");

        const errors: string[] = [];

        const iso = dataRaw ? parseDateBR(dataRaw) : null;
        if (!dataRaw) errors.push("Data obrigatória");
        else if (!iso) errors.push(`Data inválida: "${dataRaw}" (use dd/mm/aaaa)`);

        const type: MovementType | undefined =
          norm(tipoRaw) === "entrada" ? "entrada" : norm(tipoRaw) === "saida" ? "saida" : undefined;
        if (!tipoRaw) errors.push("Tipo obrigatório");
        else if (!type) errors.push(`Tipo inválido: "${tipoRaw}" (use Entrada ou Saída)`);

        const product = products.find((p) => norm(p.name) === norm(produtoRaw));
        if (!produtoRaw) errors.push("Produto obrigatório");
        else if (!product) errors.push(`Produto não encontrado: "${produtoRaw}"`);

        const quantity = parseFloat(qtdRaw.replace(",", "."));
        if (!qtdRaw) errors.push("Quantidade obrigatória");
        else if (!Number.isFinite(quantity) || quantity <= 0) errors.push(`Quantidade inválida: "${qtdRaw}"`);

        const location = stockLocations.find((l) => norm(l.name) === norm(localRaw));
        if (!localRaw) errors.push("Local obrigatório");
        else if (!location) errors.push(`Local não encontrado: "${localRaw}"`);

        const unitPrice = precoRaw ? parseFloat(precoRaw.replace(",", ".")) : 0;
        if (precoRaw && !Number.isFinite(unitPrice)) errors.push(`Preço inválido: "${precoRaw}"`);

        const preview = {
          date: iso ? formatDateBR(iso) : dataRaw || "—",
          type: tipoRaw || "—",
          product: produtoRaw || "—",
          quantity: qtdRaw || "—",
          location: localRaw || "—",
        };

        if (errors.length) {
          return { line: i + 2, status: "error", message: errors.join(" · "), data: null, preview };
        }

        return {
          line: i + 2,
          status: "valid",
          data: {
            type: type!,
            date: iso!,
            productId: product!.id,
            quantity,
            unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
            location: location!.name,
            osNumber: osNumberRaw || undefined,
            note: obsRaw || undefined,
          },
          preview,
        };
      });

      setFileName(file.name);
      setRows(parsed);
    } catch {
      toast.error("Não foi possível ler o arquivo. Verifique se é um .xlsx ou .xls válido.");
    }
  };

  const counts = {
    valid: rows?.filter((r) => r.status === "valid").length ?? 0,
    error: rows?.filter((r) => r.status === "error").length ?? 0,
  };

  const confirm = () => {
    if (!rows) return;
    const toAdd = rows.filter((r) => r.status === "valid" && r.data).map((r) => r.data!);
    if (!toAdd.length) return;
    addMovements(toAdd);
    toast.success(`${toAdd.length} movimentação(ões) importada(s) · ${counts.error} com erro`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Importar movimentações do Excel</DialogTitle>
          <DialogDescription>
            Registra várias entradas/saídas de uma vez. Nada é apagado ou alterado — produtos e
            movimentações existentes são preservados. Produto e Local devem já estar cadastrados no
            sistema (mesmo nome).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Baixar modelo Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Selecionar arquivo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
        </div>

        {rows && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="border-transparent bg-leaf-soft text-leaf">
                {counts.valid} válido(s)
              </Badge>
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                {counts.error} com erro
              </Badge>
              <span className="text-muted-foreground">{rows.length} linha(s) encontrada(s)</span>
            </div>

            <div className="max-h-[45vh] overflow-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[70px]">Linha</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-[80px]">Qtd.</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.line}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.line}</TableCell>
                      <TableCell className="text-sm">{r.preview.date}</TableCell>
                      <TableCell className="text-sm">{r.preview.type}</TableCell>
                      <TableCell className="font-medium">{r.preview.product}</TableCell>
                      <TableCell className="text-sm">{r.preview.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.preview.location}</TableCell>
                      <TableCell className="text-sm">
                        {r.status === "valid" ? (
                          <span className="text-leaf">Será importado</span>
                        ) : (
                          <span className="text-destructive">{r.message}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" className="gap-2" disabled={!counts.valid} onClick={confirm}>
            <Upload className="h-4 w-4" />
            Importar {counts.valid || ""} movimentação(ões)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
