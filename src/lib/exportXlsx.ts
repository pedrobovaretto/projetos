import * as XLSX from "xlsx";
import type { Movement, Product } from "./types";
import { formatDateBR } from "./format";

interface Period {
  from: string; // ISO yyyy-mm-dd
  to: string;
}

export const filterMovementsByPeriod = (movements: Movement[], { from, to }: Period) =>
  movements.filter((m) => m.date >= from && m.date <= to);

const setColWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
};

const boldHeaderRow = (ws: XLSX.WorkSheet, row: number, colCount: number) => {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: row, c });
    const cell = ws[addr];
    if (cell) cell.s = { font: { bold: true } };
  }
};

export const exportToXlsx = (
  products: Product[],
  movements: Movement[],
  period: Period,
) => {
  const filtered = filterMovementsByPeriod(movements, period);
  const productById = new Map(products.map((p) => [p.id, p]));

  const wb = XLSX.utils.book_new();

  // === Aba Produtos ===
  const produtosRows = products.map((p) => ({
    Código: p.id,
    Nome: p.name,
    Classe: p.productClass,
    "Princípio Ativo": p.activeIngredient,
    Unidade: p.unit,
  }));
  const wsProdutos = XLSX.utils.json_to_sheet(produtosRows);
  setColWidths(wsProdutos, [10, 40, 22, 36, 10]);
  boldHeaderRow(wsProdutos, 0, 5);
  XLSX.utils.book_append_sheet(wb, wsProdutos, "Produtos");

  // === Aba Movimentações ===
  const movRows = filtered
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => {
      const p = productById.get(m.productId);
      return {
        Data: formatDateBR(m.date),
        Tipo: m.type === "entrada" ? "Entrada" : "Saída",
        Código: m.productId,
        Produto: p?.name ?? "",
        Quantidade: m.quantity,
        Unidade: p?.unit ?? "",
        "Preço Unit. (R$)": m.unitPrice,
        "Total (R$)": +(m.quantity * m.unitPrice).toFixed(2),
        Local: m.location,
        "Nº OS": m.osNumber ?? "",
        Observação: m.note ?? "",
      };
    });
  const wsMov = XLSX.utils.json_to_sheet(
    movRows.length
      ? movRows
      : [
          {
            Data: "",
            Tipo: "",
            Código: "",
            Produto: "",
            Quantidade: "",
            Unidade: "",
            "Preço Unit. (R$)": "",
            "Total (R$)": "",
            Local: "",
            "Nº OS": "",
            Observação: "",
          },
        ],
  );
  setColWidths(wsMov, [12, 10, 10, 36, 12, 10, 16, 14, 18, 14, 30]);
  boldHeaderRow(wsMov, 0, 11);
  XLSX.utils.book_append_sheet(wb, wsMov, "Movimentações");

  // === Aba Saldo no Período ===
  type Agg = { entradas: number; saidas: number; investido: number };
  const agg = new Map<string, Agg>();
  for (const m of filtered) {
    const a = agg.get(m.productId) ?? { entradas: 0, saidas: 0, investido: 0 };
    if (m.type === "entrada") {
      a.entradas += m.quantity;
      a.investido += m.quantity * m.unitPrice;
    } else {
      a.saidas += m.quantity;
    }
    agg.set(m.productId, a);
  }

  const periodLabel = `Período: ${formatDateBR(period.from)} a ${formatDateBR(period.to)}`;
  const saldoHeader = [
    [periodLabel],
    [],
    [
      "Código",
      "Nome",
      "Classe",
      "Unidade",
      "Entradas",
      "Saídas",
      "Saldo",
      "Valor Investido (R$)",
    ],
  ];

  const saldoRows = products
    .map((p) => {
      const a = agg.get(p.id) ?? { entradas: 0, saidas: 0, investido: 0 };
      return [
        p.id,
        p.name,
        p.productClass,
        p.unit,
        a.entradas,
        a.saidas,
        a.entradas - a.saidas,
        +a.investido.toFixed(2),
      ];
    })
    .filter((r) => (r[4] as number) > 0 || (r[5] as number) > 0);

  const wsSaldo = XLSX.utils.aoa_to_sheet([...saldoHeader, ...saldoRows]);
  setColWidths(wsSaldo, [10, 36, 22, 10, 12, 12, 12, 20]);
  boldHeaderRow(wsSaldo, 2, 8);
  if (wsSaldo["A1"]) wsSaldo["A1"].s = { font: { bold: true, italic: true } };
  XLSX.utils.book_append_sheet(wb, wsSaldo, "Saldo no Período");

  const filename = `fazenda-sao-pedro_${period.from}_a_${period.to}.xlsx`;
  XLSX.writeFile(wb, filename);
};
