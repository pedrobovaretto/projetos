import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SEED_PRODUCTS } from "../../seed";

export default defineTool({
  name: "list_products",
  title: "Listar produtos",
  description:
    "Lista os produtos (insumos) cadastrados no catálogo, com filtros opcionais por classe, princípio ativo ou busca por nome.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Busca por nome, código ou princípio ativo."),
    productClass: z.string().trim().min(1).optional().describe("Filtra por classe (ex: Herbicida, Inseticida)."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de itens retornados (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ search, productClass, limit }) => {
    const q = search?.toLowerCase();
    const items = SEED_PRODUCTS.filter((p) => {
      if (productClass && p.productClass.toLowerCase() !== productClass.toLowerCase()) return false;
      if (!q) return true;
      return [p.name, p.id, p.activeIngredient, p.productClass].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    }).slice(0, limit ?? 50);

    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { count: items.length, items },
    };
  },
});
