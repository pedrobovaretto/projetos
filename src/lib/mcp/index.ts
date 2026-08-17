import { defineMcp } from "@lovable.dev/mcp-js";
import getProductTool from "./tools/get-product";
import listProductsTool from "./tools/list-products";
import listTaxonomyTool from "./tools/list-taxonomy";

export default defineMcp({
  name: "coffee-stock-keeper",
  title: "Coffee Stock Keeper",
  version: "0.1.0",
  instructions:
    "Ferramentas de consulta do controle de estoque de insumos da Fazenda São Pedro (cafeicultura). Use `list_products` para buscar insumos, `get_product` para detalhar um item e `list_taxonomy` para classes, princípios ativos, talhões e atividades. As movimentações de entrada/saída ficam no navegador do usuário e não são acessíveis por aqui.",
  tools: [listProductsTool, getProductTool, listTaxonomyTool],
});
