import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SEED_PRODUCTS } from "../../seed";

export default defineTool({
  name: "get_product",
  title: "Detalhar produto",
  description: "Retorna os dados de cadastro de um produto pelo código (ex: P001) ou pelo nome exato.",
  inputSchema: {
    idOrName: z.string().trim().min(1).describe("Código do produto (P001) ou nome exato."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ idOrName }) => {
    const key = idOrName.toLowerCase();
    const product = SEED_PRODUCTS.find(
      (p) => p.id.toLowerCase() === key || p.name.toLowerCase() === key,
    );
    if (!product) throw new ToolError(`Produto não encontrado: ${idOrName}`);
    return {
      content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      structuredContent: { product },
    };
  },
});
