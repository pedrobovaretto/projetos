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
import type { Product, ProductClass, Unit } from "@/lib/types";
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

const COLUMNS = ["Nome", "Classe", "Princípio Ativo", "Unidade"] as const;

type RowStatus = "valid" | "duplicate" | "error";

interface ParsedRow {
  line: number;
  status: RowStatus;
  message?: string;
  data: Omit<Product, "id">;
}

const norm = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const matchOption = <T extends string>(value: unknown, options: T[]): T | undefined =>
  options.find((o) => norm(o) === norm(value));

export const ImportProductsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { products, addProducts } = useStore();
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
      ["Exemplo Produto", "Fungicida", "Boscalida", "L"],
      ["Exemplo Inseticida", "Inseticida", "Imidacloprido", "kg"],
    ]);
    ws["!cols"] = [{ wch: 34 }, { wch: 22 }, { wch: 30 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "modelo-cadastro-produtos.xlsx");
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

      const existingNames = new Set(products.map((p) => norm(p.name)));
      const seen = new Set<string>();

      const parsed: ParsedRow[] = raw.map((r, i) => {
        const get = (key: string) => {
          const k = Object.keys(r).find((kk) => norm(kk) === norm(key));
          return k ? String(r[k] ?? "").trim() : "";
        };
        const name = get("Nome");
        const classRaw = get("Classe");
        const activeIngredient = get("Princípio Ativo");
        const unitRaw = get("Unidade");

        const productClass = matchOption(classRaw, CLASSES);
        const unit = matchOption(unitRaw, UNITS);

        const data: Omit<Product, "id"> = {
          name,
          productClass: productClass ?? "Outro",
          activeIngredient,
          unit: unit ?? "L",
        };

        const errors: string[] = [];
        if (!name) errors.push("Nome obrigatório");
        if (!classRaw) errors.push("Classe obrigatória");
        else if (!productClass) errors.push(`Classe inválida: ${classRaw}`);
        if (!unitRaw) errors.push("Unidade obrigatória");
        else if (!unit) errors.push(`Unidade inválida: ${unitRaw}`);

        if (errors.length) {
          return { line: i + 2, status: "error", message: errors.join(" · "), data };
        }
        const key = norm(name);
        if (existingNames.has(key)) {
          return { line: i + 2, status: "duplicate", message: "Já cadastrado no sistema", data };
        }
        if (seen.has(key)) {
          return { line: i + 2, status: "duplicate", message: "Repetido na planilha", data };
        }
        seen.add(key);
        return { line: i + 2, status: "valid", data };
      });

      setFileName(file.name);
      setRows(parsed);
    } catch {
      toast.error("Não foi possível ler o arquivo. Verifique se é um .xlsx ou .xls válido.");
    }
  };

  const counts = {
    valid: rows?.filter((r) => r.status === "valid").length ?? 0,
    duplicate: rows?.filter((r) => r.status === "duplicate").length ?? 0,
    error: rows?.filter((r) => r.status === "error").length ?? 0,
  };

  const confirm = () => {
    if (!rows) return;
    const toAdd = rows.filter((r) => r.status === "valid").map((r) => r.data);
    if (!toAdd.length) return;
    addProducts(toAdd);
    toast.success(
      `${toAdd.length} produto(s) importado(s) · ${counts.duplicate} já existente(s) · ${counts.error} com erro`,
    );
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
          <DialogTitle className="font-serif text-xl">Importar produtos do Excel</DialogTitle>
          <DialogDescription>
            Cadastra vários produtos de uma vez. Nada é apagado ou alterado — produtos e
            movimentações existentes são preservados.
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
              <Badge variant="outline">{counts.duplicate} duplicado(s)</Badge>
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                {counts.error} com erro
              </Badge>
            </div>

            <div className="max-h-[45vh] overflow-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[70px]">Linha</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Princípio ativo</TableHead>
                    <TableHead className="w-[80px]">Un.</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.line}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.line}
                      </TableCell>
                      <TableCell className="font-medium">{r.data.name || "—"}</TableCell>
                      <TableCell className="text-sm">{r.data.productClass}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.data.activeIngredient || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.unit}</TableCell>
                      <TableCell className="text-sm">
                        {r.status === "valid" ? (
                          <span className="text-leaf">Será importado</span>
                        ) : r.status === "duplicate" ? (
                          <span className="text-muted-foreground">{r.message}</span>
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
            Importar {counts.valid || ""} produto(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
