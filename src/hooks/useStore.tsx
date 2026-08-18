import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Movement, Product, StockLocation } from "@/lib/types";
import { SEED_PRODUCTS, SEED_STOCK_LOCATIONS } from "@/lib/seed";

const STORAGE_KEY = "cafeeira-store-v2";

interface StoreState {
  products: Product[];
  movements: Movement[];
  stockLocations: StockLocation[];
}

type RemoveResult = "deleted" | "deactivated";

interface StoreContextValue extends StoreState {
  addMovement: (m: Omit<Movement, "id" | "createdAt">) => void;
  addMovements: (list: Omit<Movement, "id" | "createdAt">[]) => void;
  updateMovement: (id: string, m: Omit<Movement, "id" | "createdAt">) => void;
  deleteMovement: (id: string) => void;
  addProduct: (p: Omit<Product, "id">) => Product;
  addProducts: (list: Omit<Product, "id">[]) => void;
  updateProduct: (id: string, p: Omit<Product, "id">) => void;
  deleteProduct: (id: string) => void;
  removeOrDeactivateProduct: (id: string) => RemoveResult;
  reactivateProduct: (id: string) => void;
  mergeProducts: (keepId: string, mergeIds: string[]) => void;
  productById: (id: string) => Product | undefined;
  addStockLocation: (l: Omit<StockLocation, "id">) => StockLocation;
  updateStockLocation: (id: string, l: Omit<StockLocation, "id">) => void;
  deleteStockLocation: (id: string) => void;
  removeOrDeactivateStockLocation: (id: string) => RemoveResult;
  reactivateStockLocation: (id: string) => void;
  mergeStockLocations: (keepId: string, mergeIds: string[]) => void;
  stockLocationById: (id: string) => StockLocation | undefined;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const initial: StoreState = { products: SEED_PRODUCTS, movements: [], stockLocations: SEED_STOCK_LOCATIONS };

const load = (): StoreState => {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as StoreState;
    return {
      products: parsed.products?.length ? parsed.products : SEED_PRODUCTS,
      movements: parsed.movements ?? [],
      stockLocations: parsed.stockLocations?.length ? parsed.stockLocations : SEED_STOCK_LOCATIONS,
    };
  } catch {
    return initial;
  }
};

const nextProductId = (products: Product[]) => {
  const max = products.reduce((acc, p) => {
    const n = parseInt(p.id.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `P${String(max + 1).padStart(3, "0")}`;
};

const nextLocationId = (locations: StockLocation[]) => {
  const max = locations.reduce((acc, l) => {
    const n = parseInt(l.id.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `LOC${String(max + 1).padStart(3, "0")}`;
};

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<StoreState>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addMovement: StoreContextValue["addMovement"] = useCallback((m) => {
    setState((s) => ({
      ...s,
      movements: [
        { ...m, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ...s.movements,
      ],
    }));
  }, []);

  const addMovements: StoreContextValue["addMovements"] = useCallback((list) => {
    if (!list.length) return;
    const now = new Date().toISOString();
    setState((s) => ({
      ...s,
      movements: [
        ...list.map((m) => ({ ...m, id: crypto.randomUUID(), createdAt: now })),
        ...s.movements,
      ],
    }));
  }, []);

  const updateMovement: StoreContextValue["updateMovement"] = useCallback((id, m) => {
    setState((s) => ({
      ...s,
      movements: s.movements.map((it) => (it.id === id ? { ...m, id, createdAt: it.createdAt } : it)),
    }));
  }, []);

  const deleteMovement = useCallback((id: string) => {
    setState((s) => ({ ...s, movements: s.movements.filter((m) => m.id !== id) }));
  }, []);

  const addProduct: StoreContextValue["addProduct"] = useCallback((p) => {
    let created!: Product;
    setState((s) => {
      created = { ...p, id: nextProductId(s.products) };
      return { ...s, products: [...s.products, created] };
    });
    return created;
  }, []);

  const addProducts: StoreContextValue["addProducts"] = useCallback((list) => {
    if (!list.length) return;
    setState((s) => {
      const created: Product[] = [];
      let products = s.products;
      for (const p of list) {
        const item = { ...p, id: nextProductId(products) };
        products = [...products, item];
        created.push(item);
      }
      return { ...s, products };
    });
  }, []);

  const updateProduct: StoreContextValue["updateProduct"] = useCallback((id, p) => {
    setState((s) => ({
      ...s,
      products: s.products.map((it) => (it.id === id ? { ...p, id } : it)),
    }));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
  }, []);

  const removeOrDeactivateProduct: StoreContextValue["removeOrDeactivateProduct"] = useCallback((id) => {
    let result: RemoveResult = "deleted";
    setState((s) => {
      const used = s.movements.some((m) => m.productId === id);
      if (used) {
        result = "deactivated";
        return { ...s, products: s.products.map((p) => (p.id === id ? { ...p, active: false } : p)) };
      }
      result = "deleted";
      return { ...s, products: s.products.filter((p) => p.id !== id) };
    });
    return result;
  }, []);

  const reactivateProduct = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, active: true } : p)),
    }));
  }, []);

  const mergeProducts: StoreContextValue["mergeProducts"] = useCallback((keepId, mergeIds) => {
    setState((s) => ({
      ...s,
      movements: s.movements.map((m) =>
        mergeIds.includes(m.productId) ? { ...m, productId: keepId } : m,
      ),
      products: s.products.filter((p) => !mergeIds.includes(p.id)),
    }));
  }, []);

  const productById = useCallback(
    (id: string) => state.products.find((p) => p.id === id),
    [state.products],
  );

  const addStockLocation: StoreContextValue["addStockLocation"] = useCallback((l) => {
    let created!: StockLocation;
    setState((s) => {
      created = { ...l, id: nextLocationId(s.stockLocations) };
      return { ...s, stockLocations: [...s.stockLocations, created] };
    });
    return created;
  }, []);

  const updateStockLocation: StoreContextValue["updateStockLocation"] = useCallback((id, l) => {
    setState((s) => ({
      ...s,
      stockLocations: s.stockLocations.map((it) => (it.id === id ? { ...l, id } : it)),
    }));
  }, []);

  const deleteStockLocation = useCallback((id: string) => {
    setState((s) => ({ ...s, stockLocations: s.stockLocations.filter((l) => l.id !== id) }));
  }, []);

  const removeOrDeactivateStockLocation: StoreContextValue["removeOrDeactivateStockLocation"] = useCallback(
    (id) => {
      let result: RemoveResult = "deleted";
      setState((s) => {
        const loc = s.stockLocations.find((l) => l.id === id);
        const used = !!loc && s.movements.some((m) => m.location === loc.name);
        if (used) {
          result = "deactivated";
          return {
            ...s,
            stockLocations: s.stockLocations.map((l) => (l.id === id ? { ...l, active: false } : l)),
          };
        }
        result = "deleted";
        return { ...s, stockLocations: s.stockLocations.filter((l) => l.id !== id) };
      });
      return result;
    },
    [],
  );

  const reactivateStockLocation = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      stockLocations: s.stockLocations.map((l) => (l.id === id ? { ...l, active: true } : l)),
    }));
  }, []);

  const mergeStockLocations: StoreContextValue["mergeStockLocations"] = useCallback((keepId, mergeIds) => {
    setState((s) => {
      const keep = s.stockLocations.find((l) => l.id === keepId);
      if (!keep) return s;
      const mergeNames = new Set(
        s.stockLocations.filter((l) => mergeIds.includes(l.id)).map((l) => l.name),
      );
      return {
        ...s,
        movements: s.movements.map((m) => (mergeNames.has(m.location) ? { ...m, location: keep.name } : m)),
        stockLocations: s.stockLocations.filter((l) => !mergeIds.includes(l.id)),
      };
    });
  }, []);

  const stockLocationById = useCallback(
    (id: string) => state.stockLocations.find((l) => l.id === id),
    [state.stockLocations],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      addMovement,
      addMovements,
      updateMovement,
      deleteMovement,
      addProduct,
      addProducts,
      updateProduct,
      deleteProduct,
      removeOrDeactivateProduct,
      reactivateProduct,
      mergeProducts,
      productById,
      addStockLocation,
      updateStockLocation,
      deleteStockLocation,
      removeOrDeactivateStockLocation,
      reactivateStockLocation,
      mergeStockLocations,
      stockLocationById,
    }),
    [
      state,
      addMovement,
      addMovements,
      updateMovement,
      deleteMovement,
      addProduct,
      addProducts,
      updateProduct,
      deleteProduct,
      removeOrDeactivateProduct,
      reactivateProduct,
      mergeProducts,
      productById,
      addStockLocation,
      updateStockLocation,
      deleteStockLocation,
      removeOrDeactivateStockLocation,
      reactivateStockLocation,
      mergeStockLocations,
      stockLocationById,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
