import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Movement, MovementType, Product, ProductClass, StockLocation, Unit } from "@/lib/types";
import { SEED_PRODUCTS, SEED_STOCK_LOCATIONS } from "@/lib/seed";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

const STORAGE_KEY = "cafeeira-store-v2";

interface StoreState {
  products: Product[];
  movements: Movement[];
  stockLocations: StockLocation[];
}

type RemoveResult = "deleted" | "deactivated";

interface StoreContextValue extends StoreState {
  loading: boolean;
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

// ---- conversão entre o formato usado no app (camelCase) e as tabelas do Supabase (snake_case) ----

const productToRow = (p: Product): TablesInsert<"products"> => ({
  id: p.id,
  name: p.name,
  product_class: p.productClass,
  active_ingredient: p.activeIngredient,
  unit: p.unit,
  active: p.active ?? true,
});

const rowToProduct = (r: Tables<"products">): Product => ({
  id: r.id,
  name: r.name,
  productClass: r.product_class as ProductClass,
  activeIngredient: r.active_ingredient,
  unit: r.unit as Unit,
  active: r.active,
});

const locationToRow = (l: StockLocation): TablesInsert<"stock_locations"> => ({
  id: l.id,
  name: l.name,
  active: l.active ?? true,
});

const rowToLocation = (r: Tables<"stock_locations">): StockLocation => ({
  id: r.id,
  name: r.name,
  active: r.active,
});

const movementToRow = (m: Movement): TablesInsert<"movements"> => ({
  id: m.id,
  date: m.date,
  type: m.type,
  product_id: m.productId,
  quantity: m.quantity,
  unit_price: m.unitPrice,
  location: m.location,
  activity: m.activity ?? null,
  note: m.note ?? null,
  os_number: m.osNumber ?? null,
  created_at: m.createdAt,
});

const rowToMovement = (r: Tables<"movements">): Movement => ({
  id: r.id,
  date: r.date,
  type: r.type as MovementType,
  productId: r.product_id,
  quantity: Number(r.quantity),
  unitPrice: Number(r.unit_price),
  location: r.location,
  activity: r.activity ?? undefined,
  note: r.note ?? undefined,
  osNumber: r.os_number ?? undefined,
  createdAt: r.created_at,
});

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
  const [state, setState] = useState<StoreState>({ products: [], movements: [], stockLocations: [] });
  const [loading, setLoading] = useState(true);

  // Carregamento inicial: busca do Supabase; se a nuvem estiver vazia e houver dados
  // locais antigos (localStorage), migra-os uma única vez para a nuvem.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [productsRes, locationsRes, movementsRes] = await Promise.all([
          supabase.from("products").select("*"),
          supabase.from("stock_locations").select("*"),
          supabase.from("movements").select("*"),
        ]);
        if (productsRes.error) throw productsRes.error;
        if (locationsRes.error) throw locationsRes.error;
        if (movementsRes.error) throw movementsRes.error;

        const cloudEmpty =
          (productsRes.data?.length ?? 0) === 0 &&
          (locationsRes.data?.length ?? 0) === 0 &&
          (movementsRes.data?.length ?? 0) === 0;

        if (cloudEmpty) {
          const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
          let localProducts = SEED_PRODUCTS;
          let localLocations = SEED_STOCK_LOCATIONS;
          let localMovements: Movement[] = [];

          if (raw) {
            try {
              const parsed = JSON.parse(raw) as StoreState;
              localProducts = parsed.products?.length ? parsed.products : SEED_PRODUCTS;
              localLocations = parsed.stockLocations?.length ? parsed.stockLocations : SEED_STOCK_LOCATIONS;
              localMovements = parsed.movements ?? [];
            } catch {
              // ignora JSON inválido e segue com os valores padrão (seed)
            }
          }

          if (localProducts.length) {
            const { error } = await supabase.from("products").insert(localProducts.map(productToRow));
            if (error) throw error;
          }
          if (localLocations.length) {
            const { error } = await supabase.from("stock_locations").insert(localLocations.map(locationToRow));
            if (error) throw error;
          }
          if (localMovements.length) {
            const { error } = await supabase.from("movements").insert(localMovements.map(movementToRow));
            if (error) throw error;
          }

          if (!cancelled) {
            setState({ products: localProducts, movements: localMovements, stockLocations: localLocations });
          }
          if (raw) toast.success("Dados deste computador migrados para a nuvem");
        } else if (!cancelled) {
          setState({
            products: (productsRes.data ?? []).map(rowToProduct),
            stockLocations: (locationsRes.data ?? []).map(rowToLocation),
            movements: (movementsRes.data ?? []).map(rowToMovement),
          });
        }
      } catch (err) {
        console.error(err);
        toast.error(
          "Não foi possível conectar ao banco de dados na nuvem. Verifique se as tabelas foram criadas no Supabase.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addMovement: StoreContextValue["addMovement"] = useCallback((m) => {
    const created: Movement = { ...m, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, movements: [created, ...s.movements] }));
    supabase
      .from("movements")
      .insert(movementToRow(created))
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao salvar movimentação na nuvem — tente novamente");
          setState((s) => ({ ...s, movements: s.movements.filter((mv) => mv.id !== created.id) }));
        }
      });
  }, []);

  const addMovements: StoreContextValue["addMovements"] = useCallback((list) => {
    if (!list.length) return;
    const now = new Date().toISOString();
    const created = list.map((m) => ({ ...m, id: crypto.randomUUID(), createdAt: now }));
    setState((s) => ({ ...s, movements: [...created, ...s.movements] }));
    supabase
      .from("movements")
      .insert(created.map(movementToRow))
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao importar movimentações na nuvem — tente novamente");
          const ids = new Set(created.map((c) => c.id));
          setState((s) => ({ ...s, movements: s.movements.filter((mv) => !ids.has(mv.id)) }));
        }
      });
  }, []);

  const updateMovement: StoreContextValue["updateMovement"] = useCallback((id, m) => {
    let previous: Movement | undefined;
    setState((s) => {
      previous = s.movements.find((it) => it.id === id);
      return { ...s, movements: s.movements.map((it) => (it.id === id ? { ...m, id, createdAt: it.createdAt } : it)) };
    });
    supabase
      .from("movements")
      .update(movementToRow({ ...m, id, createdAt: previous?.createdAt ?? new Date().toISOString() }))
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao salvar alterações na nuvem — tente novamente");
          if (previous) {
            const prev = previous;
            setState((s) => ({ ...s, movements: s.movements.map((it) => (it.id === id ? prev : it)) }));
          }
        }
      });
  }, []);

  const deleteMovement = useCallback((id: string) => {
    let removed: Movement | undefined;
    setState((s) => {
      removed = s.movements.find((m) => m.id === id);
      return { ...s, movements: s.movements.filter((m) => m.id !== id) };
    });
    supabase
      .from("movements")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao excluir movimentação na nuvem — tente novamente");
          if (removed) {
            const prev = removed;
            setState((s) => ({ ...s, movements: [prev, ...s.movements] }));
          }
        }
      });
  }, []);

  const addProduct: StoreContextValue["addProduct"] = useCallback((p) => {
    let created!: Product;
    setState((s) => {
      created = { ...p, id: nextProductId(s.products) };
      return { ...s, products: [...s.products, created] };
    });
    supabase
      .from("products")
      .insert(productToRow(created))
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao salvar produto na nuvem — tente novamente");
          setState((s) => ({ ...s, products: s.products.filter((it) => it.id !== created.id) }));
        }
      });
    return created;
  }, []);

  const addProducts: StoreContextValue["addProducts"] = useCallback((list) => {
    if (!list.length) return;
    let created: Product[] = [];
    setState((s) => {
      created = [];
      let products = s.products;
      for (const p of list) {
        const item = { ...p, id: nextProductId(products) };
        products = [...products, item];
        created.push(item);
      }
      return { ...s, products };
    });
    supabase
      .from("products")
      .insert(created.map(productToRow))
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao importar produtos na nuvem — tente novamente");
          const ids = new Set(created.map((c) => c.id));
          setState((s) => ({ ...s, products: s.products.filter((it) => !ids.has(it.id)) }));
        }
      });
  }, []);

  const updateProduct: StoreContextValue["updateProduct"] = useCallback((id, p) => {
    let previous: Product | undefined;
    setState((s) => {
      previous = s.products.find((it) => it.id === id);
      return { ...s, products: s.products.map((it) => (it.id === id ? { ...p, id } : it)) };
    });
    supabase
      .from("products")
      .update(productToRow({ ...p, id }))
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao salvar produto na nuvem — tente novamente");
          if (previous) {
            const prev = previous;
            setState((s) => ({ ...s, products: s.products.map((it) => (it.id === id ? prev : it)) }));
          }
        }
      });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    let removed: Product | undefined;
    setState((s) => {
      removed = s.products.find((p) => p.id === id);
      return { ...s, products: s.products.filter((p) => p.id !== id) };
    });
    supabase
      .from("products")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao excluir produto na nuvem — tente novamente");
          if (removed) {
            const prev = removed;
            setState((s) => ({ ...s, products: [...s.products, prev] }));
          }
        }
      });
  }, []);

  const removeOrDeactivateProduct: StoreContextValue["removeOrDeactivateProduct"] = useCallback((id) => {
    let result: RemoveResult = "deleted";
    let removedProduct: Product | undefined;
    setState((s) => {
      const used = s.movements.some((m) => m.productId === id);
      if (used) {
        result = "deactivated";
        return { ...s, products: s.products.map((p) => (p.id === id ? { ...p, active: false } : p)) };
      }
      result = "deleted";
      removedProduct = s.products.find((p) => p.id === id);
      return { ...s, products: s.products.filter((p) => p.id !== id) };
    });

    if (result === "deactivated") {
      supabase
        .from("products")
        .update({ active: false })
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error(error);
            toast.error("Falha ao inativar produto na nuvem — tente novamente");
            setState((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, active: true } : p)) }));
          }
        });
    } else {
      supabase
        .from("products")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error(error);
            toast.error("Falha ao excluir produto na nuvem — tente novamente");
            if (removedProduct) {
              const prev = removedProduct;
              setState((s) => ({ ...s, products: [...s.products, prev] }));
            }
          }
        });
    }
    return result;
  }, []);

  const reactivateProduct = useCallback((id: string) => {
    setState((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, active: true } : p)) }));
    supabase
      .from("products")
      .update({ active: true })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao reativar produto na nuvem — tente novamente");
          setState((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, active: false } : p)) }));
        }
      });
  }, []);

  const mergeProducts: StoreContextValue["mergeProducts"] = useCallback((keepId, mergeIds) => {
    let affectedMovementIds: string[] = [];
    setState((s) => {
      affectedMovementIds = s.movements.filter((m) => mergeIds.includes(m.productId)).map((m) => m.id);
      return {
        ...s,
        movements: s.movements.map((m) => (mergeIds.includes(m.productId) ? { ...m, productId: keepId } : m)),
        products: s.products.filter((p) => !mergeIds.includes(p.id)),
      };
    });

    (async () => {
      try {
        if (affectedMovementIds.length) {
          const { error } = await supabase.from("movements").update({ product_id: keepId }).in("id", affectedMovementIds);
          if (error) throw error;
        }
        const { error: deleteError } = await supabase.from("products").delete().in("id", mergeIds);
        if (deleteError) throw deleteError;
      } catch (error) {
        console.error(error);
        toast.error("Falha ao mesclar produtos na nuvem — a página será recarregada");
        window.location.reload();
      }
    })();
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
    supabase
      .from("stock_locations")
      .insert(locationToRow(created))
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao salvar local na nuvem — tente novamente");
          setState((s) => ({ ...s, stockLocations: s.stockLocations.filter((it) => it.id !== created.id) }));
        }
      });
    return created;
  }, []);

  const updateStockLocation: StoreContextValue["updateStockLocation"] = useCallback((id, l) => {
    let previous: StockLocation | undefined;
    setState((s) => {
      previous = s.stockLocations.find((it) => it.id === id);
      return { ...s, stockLocations: s.stockLocations.map((it) => (it.id === id ? { ...l, id } : it)) };
    });
    supabase
      .from("stock_locations")
      .update(locationToRow({ ...l, id }))
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao salvar local na nuvem — tente novamente");
          if (previous) {
            const prev = previous;
            setState((s) => ({ ...s, stockLocations: s.stockLocations.map((it) => (it.id === id ? prev : it)) }));
          }
        }
      });
  }, []);

  const deleteStockLocation = useCallback((id: string) => {
    let removed: StockLocation | undefined;
    setState((s) => {
      removed = s.stockLocations.find((l) => l.id === id);
      return { ...s, stockLocations: s.stockLocations.filter((l) => l.id !== id) };
    });
    supabase
      .from("stock_locations")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao excluir local na nuvem — tente novamente");
          if (removed) {
            const prev = removed;
            setState((s) => ({ ...s, stockLocations: [...s.stockLocations, prev] }));
          }
        }
      });
  }, []);

  const removeOrDeactivateStockLocation: StoreContextValue["removeOrDeactivateStockLocation"] = useCallback(
    (id) => {
      let result: RemoveResult = "deleted";
      let removedLocation: StockLocation | undefined;
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
        removedLocation = loc;
        return { ...s, stockLocations: s.stockLocations.filter((l) => l.id !== id) };
      });

      if (result === "deactivated") {
        supabase
          .from("stock_locations")
          .update({ active: false })
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              console.error(error);
              toast.error("Falha ao inativar local na nuvem — tente novamente");
              setState((s) => ({
                ...s,
                stockLocations: s.stockLocations.map((l) => (l.id === id ? { ...l, active: true } : l)),
              }));
            }
          });
      } else {
        supabase
          .from("stock_locations")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              console.error(error);
              toast.error("Falha ao excluir local na nuvem — tente novamente");
              if (removedLocation) {
                const prev = removedLocation;
                setState((s) => ({ ...s, stockLocations: [...s.stockLocations, prev] }));
              }
            }
          });
      }
      return result;
    },
    [],
  );

  const reactivateStockLocation = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      stockLocations: s.stockLocations.map((l) => (l.id === id ? { ...l, active: true } : l)),
    }));
    supabase
      .from("stock_locations")
      .update({ active: true })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          toast.error("Falha ao reativar local na nuvem — tente novamente");
          setState((s) => ({
            ...s,
            stockLocations: s.stockLocations.map((l) => (l.id === id ? { ...l, active: false } : l)),
          }));
        }
      });
  }, []);

  const mergeStockLocations: StoreContextValue["mergeStockLocations"] = useCallback((keepId, mergeIds) => {
    let keepName = "";
    let mergeNames: string[] = [];
    setState((s) => {
      const keep = s.stockLocations.find((l) => l.id === keepId);
      if (!keep) return s;
      keepName = keep.name;
      mergeNames = s.stockLocations.filter((l) => mergeIds.includes(l.id)).map((l) => l.name);
      return {
        ...s,
        movements: s.movements.map((m) => (mergeNames.includes(m.location) ? { ...m, location: keep.name } : m)),
        stockLocations: s.stockLocations.filter((l) => !mergeIds.includes(l.id)),
      };
    });

    if (!keepName) return;
    (async () => {
      try {
        if (mergeNames.length) {
          const { error } = await supabase.from("movements").update({ location: keepName }).in("location", mergeNames);
          if (error) throw error;
        }
        const { error: deleteError } = await supabase.from("stock_locations").delete().in("id", mergeIds);
        if (deleteError) throw deleteError;
      } catch (error) {
        console.error(error);
        toast.error("Falha ao mesclar locais na nuvem — a página será recarregada");
        window.location.reload();
      }
    })();
  }, []);

  const stockLocationById = useCallback(
    (id: string) => state.stockLocations.find((l) => l.id === id),
    [state.stockLocations],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      loading,
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
      loading,
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
