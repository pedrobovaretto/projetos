import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SEED_PRODUCTS, SEED_STOCK_LOCATIONS } from "../../seed";
import { ACTIVITIES } from "../../types";

export default defineTool({
  name: "list_taxonomy",
  title: "Listar classes, talhões e atividades",
  description:
    "Retorna as listas de referência do controle de estoque: classes de produto, princípios ativos, talhões/locais e atividades.",
  inputSchema: {
    kind: z
      .enum(["all", "classes", "ingredients", "locations", "activities"])
      .optional()
      .describe("Qual lista retornar (padrão: all)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ kind }) => {
    const classes = Array.from(new Set(SEED_PRODUCTS.map((p) => p.productClass))).sort();
    const ingredients = Array.from(
      new Set(SEED_PRODUCTS.map((p) => p.activeIngredient).filter((s) => s && s.trim())),
    ).sort();
    const all = {
      classes,
      ingredients,
      locations: SEED_STOCK_LOCATIONS.map((l) => l.name),
      activities: [...ACTIVITIES],
    };
    const selected = !kind || kind === "all" ? all : { [kind]: all[kind] };
    return {
      content: [{ type: "text", text: JSON.stringify(selected, null, 2) }],
      structuredContent: selected,
    };
  },
});
