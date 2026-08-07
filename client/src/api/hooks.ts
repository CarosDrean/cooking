import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
    AppState,
    Day,
    Location,
    MealLogEntry,
    MealType,
    PantryItem,
    Profile,
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

/* ---------- Recipes ---------- */
export interface RecipeFilters {
    q?: string;
    diets?: string[];
    ingredients?: string[];
    mode?: "all" | "any";
    makeable?: boolean;
    meal?: MealType;
    season?: Season;
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

/* ---------- Pantry ---------- */
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
            qc.invalidateQueries({ queryKey: ["expiring"] });
        },
    });
}

export function useUpdatePantry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Partial<PantryItem> }) =>
            api.put<PantryItem>(`/pantry/${id}`, body),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["expiring"] });
        },
    });
}

export function useDeletePantry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<{ ok: boolean }>(`/pantry/${id}`),
        onSuccess: () => {
            invalidateState(qc);
            qc.invalidateQueries({ queryKey: ["expiring"] });
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
            body: Partial<{ day: Day; meal: MealType; recipeId: string; servings: number }>;
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
