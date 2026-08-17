export type ProductClass =
  | "Herbicida"
  | "Herbicida Seletivo"
  | "Inseticida"
  | "Fungicida"
  | "Fungicida/Bactericida"
  | "Nematicida/Fungicida"
  | "Inseticida/Acaricida"
  | "Acaricida"
  | "Adjuvante"
  | "Óleo Mineral"
  | "Nutrição"
  | "Adubo"
  | "Semente"
  | "Outro";

export type Unit = "L" | "kg" | "un";

export interface Product {
  id: string;          // ex: P001
  name: string;
  productClass: ProductClass;
  activeIngredient: string;
  unit: Unit;
}

export type MovementType = "entrada" | "saida";

export interface StockLocation {
  id: string;          // ex: LOC001
  name: string;
}

export type Location = string;

export const ACTIVITIES = [
  "Pulverização",
  "Adubação",
  "Plantio",
  "Colheita",
  "Tratamento de sementes",
  "Aplicação foliar",
  "Aplicação de solo",
  "Manutenção",
  "Transferência",
  "Outro",
] as const;

export type Activity = (typeof ACTIVITIES)[number] | string;

export interface Movement {
  id: string;
  date: string;        // ISO date (yyyy-mm-dd)
  type: MovementType;
  productId: string;
  quantity: number;
  unitPrice: number;   // R$ por unidade (relevante p/ entradas)
  location: Location;
  activity?: Activity;
  note?: string;
  osNumber?: string;   // Nº da Ordem de Serviço (opcional)
  createdAt: string;   // ISO timestamp
}
