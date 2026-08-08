import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import type {
    AppState,
    CatalogIngredient,
    Day,
    Drink,
    Location,
    MealLogEntry,
    MealType,
    OpenverseImage,
    PantryItem,
    Profile,
    PurchaseLogEntry,
    Recipe,
    Recommendation,
    Season,
    ShoppingList,
    WeeklyPlan,
} from "../types";
import { api } from "./client";

export const STATE_KEY = ["state"] as const;

export function invalidateState(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: ["state"] });
}

function invalidatePlan(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: ["state"] });
    queryClient.invalidateQueries({ queryKey: ["plan"] });
}

export function useAppState() {
    return useQuery({
        queryKey: ["state"],
        queryFn: () => api.get<AppState>("/state"),
        staleTime: 30_000,
    });
}

/* ---------- Profiles ---------- */
export function useActiveProfile() {
    const { data } = useAppState();
    return data?.profiles.find((p) => p.id === data.activeProfileId) ?? data?.profiles[0];
}

export function useCreateProfile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Partial<Profile>) => api.post<Profile>("/profiles", body),
        onSuccess: () => invalidateState(qc),
    });
}

export function useUpdateProfile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Partial<Profile> }) => api.put<Profile>(`/profiles/${id}`, body),
        onSuccess: () => invalidateState(qc),
    });
}

export function useDeleteProfile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<{ ok: boolean }>(`/profiles/${id}`),
        onSuccess: () => invalidateState(qc),
    });
}

export function useActivateProfile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post<Profile>(`/profiles/${id}/activate`),
        onSuccess: () => invalidateState(qc),
    });
}

export function useSetFavorite() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ profileId, recipeId, favorite }: { profileId: string; recipeId: string; favorite: boolean }) =>
            api.post<Profile>(`/profiles/${profileId}/favorite`, { recipeId, favorite }),
        onSuccess: () => invalidateState(qc),
    });
}

export function useSetRating() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ profileId, recipeId, rating }: { profileId: string; recipeId: string; rating: number | null }) =>
            api.post<Profile>(`/profiles/${profileId}/rating`, { recipeId, rating }),
        onSuccess: () => invalidateState(qc),
    });
}

export function useSaveRecipeOverride() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            profileId,
            recipeId,
            recipe,
        }: {
            profileId: string;
            recipeId: string;
            recipe: Partial<Recipe>;
        }) => api.put<Recipe>(`/profiles/${profileId}/recipe-overrides/${recipeId}`, recipe),
        onSuccess: (_data, vars) => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["recipes"] });
            qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
            qc.invalidateQueries({ queryKey: ["makeable"] });
        },
    });
}

export function useClearRecipeOverride() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ profileId, recipeId }: { profileId: string; recipeId: string }) =>
            api.del<Recipe>(`/profiles/${profileId}/recipe-overrides/${recipeId}`),
        onSuccess: (_data, vars) => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["recipes"] });
            qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
            qc.invalidateQueries({ queryKey: ["makeable"] });
        },
    });
}

/* ---------- Recipes ---------- */
export interface RecipeFilters {
    q?: string;
    diets?: string[];
    ingredients?: string[];
    mode?: "all" | "any";
    makeable?: boolean;
    meal?: MealType;
    season?: Season;
    /** Perfil a aplicar (por defecto el activo). `"all"` desactiva el filtro por perfil. */
    profile?: string;
}

export function useRecipes(filters: RecipeFilters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.diets?.length) params.set("diet", filters.diets.join(","));
    if (filters.ingredients?.length) params.set("ingredients", filters.ingredients.join(","));
    if (filters.mode) params.set("mode", filters.mode);
    if (filters.makeable) params.set("makeable", "true");
    if (filters.meal) params.set("meal", filters.meal);
    if (filters.season) params.set("season", filters.season);
    if (filters.profile) params.set("profile", filters.profile);
    const qs = params.toString();
    return useQuery({
        queryKey: ["recipes", qs],
        queryFn: () => api.get<Recipe[]>(`/recipes${qs ? `?${qs}` : ""}`),
    });
}

export function useRecipe(id: string | undefined) {
    return useQuery({
        queryKey: ["recipe", id],
        queryFn: () => api.get<Recipe>(`/recipes/${id}`),
        enabled: Boolean(id),
    });
}

export function useMakeable() {
    return useQuery({
        queryKey: ["makeable"],
        queryFn: () => api.get<{ recipe: Recipe; missingCount: number; makeable: boolean }[]>("/recipes/makeable"),
    });
}

export function useCreateRecipe() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Partial<Recipe>) => api.post<Recipe>("/recipes", body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["recipes"] });
            qc.invalidateQueries({ queryKey: ["makeable"] });
        },
    });
}

export function useUpdateRecipe() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Partial<Recipe> }) => api.put<Recipe>(`/recipes/${id}`, body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["recipes"] });
            qc.invalidateQueries({ queryKey: ["makeable"] });
        },
    });
}

export function useDeleteRecipe() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<{ ok: boolean }>(`/recipes/${id}`),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["recipes"] });
            qc.invalidateQueries({ queryKey: ["makeable"] });
        },
    });
}

export interface GenerateRecipeResponse {
    available?: boolean;
    recipe?: {
        title: string;
        emoji: string;
        description: string;
        diets: string[];
        suitableFor: string[];
        cuisine: string;
        regions: string[];
        seasonal: string[];
        prepMinutes: number;
        cookMinutes: number;
        servings: number;
        ingredients: { name: string; quantity: number; unit: string; category: string }[];
        steps: { text: string; tip?: string }[];
        tips: string[];
        nutrition: { kcal: number; protein: number; carbs: number; fat: number };
    };
}

export function useGenerateRecipe() {
    return useMutation({
        mutationFn: (description: string) => api.post<GenerateRecipeResponse>("/recipes/generate", { description }),
    });
}

/* ---------- TheMealDB ---------- */
export function useThemealdbSearch(q: string, enabled: boolean) {
    return useQuery({
        queryKey: ["tmdb", q],
        queryFn: () => api.get<Recipe[]>(`/themealdb/search?q=${encodeURIComponent(q)}`),
        enabled: enabled && q.trim().length > 0,
        retry: false,
    });
}

export function useThemealdbImport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (mealId: string) =>
            api.post<{ recipe: Recipe; alreadyExists: boolean }>("/themealdb/import", { mealId }),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["recipes"] });
            qc.invalidateQueries({ queryKey: ["makeable"] });
        },
    });
}

export function useThemealdbAutoImport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<{ imported: Recipe[]; count: number }>("/themealdb/auto-import"),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["recipes"] });
            qc.invalidateQueries({ queryKey: ["makeable"] });
        },
    });
}

/* ---------- Import (multi-source) ---------- */

export interface ImportResponse {
    recipes: Array<{
        id: string;
        title: string;
        score: number;
        reasons: string[];
        source: string;
        matchedMeal: string;
    }>;
    drinks: Array<{
        name: string;
        score: number;
        reasons: string[];
    }>;
    importedRecipeCount: number;
    importedDrinkCount: number;
    count: number;
}

export function useAutoImport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body?: { sources?: string[]; maxResults?: number; pantryBonus?: boolean }) =>
            api.post<ImportResponse>("/import/auto-import", body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["recipes"] });
            qc.invalidateQueries({ queryKey: ["makeable"] });
            qc.invalidateQueries({ queryKey: ["drinks"] });
        },
    });
}

/* ---------- Pantry ---------- */
export function useIngredientCatalog() {
    return useQuery({
        queryKey: ["ingredients"],
        queryFn: () => api.get<CatalogIngredient[]>("/ingredients"),
        staleTime: 60_000,
    });
}

export interface EquivalentResult {
    ingredientName: string;
    quantity: number;
    unit: string;
    matched: boolean;
    equivalentUnit?: "g";
    equivalentValue?: number;
}

export function useEquivalent(ingredient: string, quantity: number, unit: string) {
    const debouncedIngredient = useDebouncedValue(ingredient, 300);
    const enabled = Boolean(debouncedIngredient.trim()) && Boolean(unit) && !["g", "kg", "ml", "l"].includes(unit);
    const params = new URLSearchParams({
        ingredient: debouncedIngredient,
        quantity: String(quantity || 1),
        unit,
    });
    return useQuery({
        queryKey: ["equivalent", debouncedIngredient, quantity, unit],
        queryFn: () => api.get<EquivalentResult>(`/ingredients/equivalent?${params}`),
        enabled,
        staleTime: 60_000,
    });
}

export type SpendingPeriod = "week" | "month" | "year";

export interface SpendingReport {
    period: SpendingPeriod;
    periodLabel: string;
    startDate: string;
    endDate: string;
    spentTotal: number;
    consumedTotal: number;
    purchaseCount: number;
    byIngredient: { name: string; total: number }[];
    byCategory: { category: string; total: number }[];
    trend: { label: string; total: number }[];
    movements: PurchaseLogEntry[];
}

export function useSpending(period: SpendingPeriod) {
    return useQuery({
        queryKey: ["spending", period],
        queryFn: () => api.get<SpendingReport>(`/spending?period=${period}`),
        staleTime: 30_000,
    });
}

export function usePantry() {
    const { data } = useAppState();
    return useQuery({
        queryKey: ["pantry"],
        queryFn: () => api.get<PantryItem[]>("/pantry"),
        initialData: data?.pantry,
    });
}

export function useExpiring(days = 7) {
    return useQuery({
        queryKey: ["expiring", days],
        queryFn: () => api.get<(PantryItem & { daysLeft: number })[]>(`/pantry/expiring?days=${days}`),
    });
}

export function useAddPantry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Partial<PantryItem>) => api.post<PantryItem>("/pantry", body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["pantry"] });
            qc.invalidateQueries({ queryKey: ["expiring"] });
            qc.invalidateQueries({ queryKey: ["spending"] });
        },
    });
}

export function useUpdatePantry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            body,
        }: {
            id: string;
            body: Partial<Omit<PantryItem, "unitPrice">> & { unitPrice?: number | null };
        }) => api.put<PantryItem>(`/pantry/${id}`, body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["pantry"] });
            qc.invalidateQueries({ queryKey: ["expiring"] });
            qc.invalidateQueries({ queryKey: ["spending"] });
        },
    });
}

export function useDeletePantry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<{ ok: boolean }>(`/pantry/${id}`),
        onMutate: async (id: string) => {
            await qc.cancelQueries({ queryKey: ["pantry"] });
            const prev = qc.getQueryData<PantryItem[]>(["pantry"]);
            if (prev) {
                qc.setQueryData<PantryItem[]>(
                    ["pantry"],
                    prev.filter((i) => i.id !== id),
                );
            }
            return { prev };
        },
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["pantry"] });
            qc.invalidateQueries({ queryKey: ["expiring"] });
            qc.invalidateQueries({ queryKey: ["spending"] });
        },
        onError: (_err, _id, ctx) => {
            if (ctx?.prev) qc.setQueryData<PantryItem[]>(["pantry"], ctx.prev);
        },
    });
}

/* ---------- Plan ---------- */
export function usePlan() {
    return useQuery({
        queryKey: ["plan"],
        queryFn: () => api.get<{ weekStart: string; plan: WeeklyPlan | null }>("/plan"),
    });
}

export function useGeneratePlan() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (weekStart?: string) => api.post<WeeklyPlan>("/plan/generate", { weekStart }),
        onSuccess: () => invalidatePlan(qc),
    });
}

export function useSavePlan() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ weekStart, slots }: { weekStart: string; slots: WeeklyPlan["slots"] }) =>
            api.put<WeeklyPlan>("/plan", { weekStart, slots }),
        onSuccess: () => invalidatePlan(qc),
    });
}

export function useRegenerateSlot() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ day, meal, excludeId }: { day: Day; meal: MealType; excludeId?: string }) =>
            api.post<WeeklyPlan>("/plan/regenerate", { day, meal, excludeId }),
        onSuccess: () => invalidatePlan(qc),
    });
}

export function useUpdateSlot() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            slotId,
            body,
        }: {
            slotId: string;
            body: Partial<{ day: Day; meal: MealType; recipeId: string; servings: number; drink?: string }>;
        }) => api.put<WeeklyPlan>(`/plan/slots/${slotId}`, body),
        onSuccess: () => invalidatePlan(qc),
    });
}

export function useDeleteSlot() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (slotId: string) => api.del<WeeklyPlan>(`/plan/slots/${slotId}`),
        onSuccess: () => invalidatePlan(qc),
    });
}

/* ---------- History ---------- */
export function useHistory(profileId: string | undefined) {
    return useQuery({
        queryKey: ["history", profileId],
        queryFn: () => api.get<MealLogEntry[]>(`/history${profileId ? `?profileId=${profileId}` : ""}`),
    });
}

export function useAddHistory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Partial<MealLogEntry>) => api.post<MealLogEntry>("/history", body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["history"] });
        },
    });
}

export function useUpdateHistoryEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Partial<MealLogEntry> }) =>
            api.put<MealLogEntry>(`/history/${id}`, body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["history"] });
        },
    });
}

export function useDeleteHistoryEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<{ ok: boolean }>(`/history/${id}`),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["history"] });
        },
    });
}

/* ---------- Shopping ---------- */
export function useShopping() {
    const { data } = useAppState();
    return useQuery({
        queryKey: ["shopping"],
        queryFn: () => api.get<ShoppingList | null>("/shopping"),
        initialData: data?.shoppingList,
    });
}

export function useGenerateShopping() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (weekStart?: string) => api.post<ShoppingList>("/shopping/generate", { weekStart }),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["shopping"] });
        },
    });
}

export function useToggleShoppingItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ name, checked }: { name: string; checked: boolean }) =>
            api.put<ShoppingList>(`/shopping/items/${encodeURIComponent(name)}`, { checked }),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["shopping"] });
        },
    });
}

export function useClearShopping() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.del<{ ok: boolean }>("/shopping"),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["shopping"] });
        },
    });
}

/* ---------- Recommendations & tips ---------- */
export function useRecommendations(limit = 8) {
    return useQuery({
        queryKey: ["recommendations", limit],
        queryFn: () => api.get<Recommendation[]>(`/recommendations?limit=${limit}`),
    });
}

export function useMissing(recipeId: string | undefined) {
    return useQuery({
        queryKey: ["missing", recipeId],
        queryFn: () =>
            api.get<{
                recipeId: string;
                makeable: boolean;
                missing: { name: string; quantity: number; unit: string; category: string }[];
            }>(`/recommendations/missing?recipeId=${recipeId}`),
        enabled: Boolean(recipeId),
    });
}

export function useRecipeTips(recipeId: string | undefined) {
    return useQuery({
        queryKey: ["tips", recipeId],
        queryFn: () => api.get<{ recipeId: string; tips: string[] }>(`/tips?recipeId=${recipeId}`),
        enabled: Boolean(recipeId),
    });
}

export function useDailyTip() {
    return useQuery({
        queryKey: ["tips", "daily"],
        queryFn: () => api.get<{ tip: string }>("/tips/daily"),
        staleTime: 0,
    });
}

/* ---------- Settings ---------- */
export interface SettingsInfo {
    location: Location;
    season: Season;
}

export interface ApiKeysInfo {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    spoonacular: boolean;
    ollama: boolean;
}

export function useSettings() {
    return useQuery({
        queryKey: ["settings"],
        queryFn: () => api.get<SettingsInfo>("/settings"),
        staleTime: 30_000,
    });
}

export function useUpdateSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Partial<Location>) => api.put<SettingsInfo>("/settings", body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["settings"] });
            qc.invalidateQueries({ queryKey: ["recommendations"] });
        },
    });
}

export function useApiKeys() {
    return useQuery({
        queryKey: ["settings", "keys"],
        queryFn: () => api.get<ApiKeysInfo>("/settings/keys"),
        staleTime: 30_000,
    });
}

export function useUpdateApiKeys() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: {
            openai?: string | null;
            anthropic?: string | null;
            google?: string | null;
            spoonacular?: string | null;
            ollamaHost?: string | null;
        }) => api.put<ApiKeysInfo>("/settings/keys", body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["settings", "keys"] });
        },
    });
}

/* ---------- Openverse ---------- */

export function useOpenverseSearch(q: string) {
    return useQuery({
        queryKey: ["openverse", q],
        queryFn: () => api.get<OpenverseImage[]>(`/openverse/search?q=${encodeURIComponent(q)}`),
        enabled: q.length >= 3,
        staleTime: 30_000,
    });
}

export function useUpdateRecipeImage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ recipeId, image }: { recipeId: string; image: string }) =>
            api.patch<Recipe>(`/recipes/${recipeId}/image`, { image }),
        onSuccess: () => invalidateState(qc),
    });
}

/* ---------- Drinks ---------- */
export function useDrinks() {
    const { data } = useAppState();
    return useQuery({
        queryKey: ["drinks"],
        queryFn: () => api.get<Drink[]>("/drinks"),
        initialData: data?.drinks,
    });
}

export function useCreateDrink() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Partial<Drink>) => api.post<Drink>("/drinks", body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["drinks"] });
        },
    });
}

export function useUpdateDrink() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Partial<Drink> }) => api.put<Drink>(`/drinks/${id}`, body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["drinks"] });
        },
    });
}

export function useDeleteDrink() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<{ ok: boolean }>(`/drinks/${id}`),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["drinks"] });
        },
    });
}
