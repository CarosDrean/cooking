import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./lib/toast";
import "./index.css";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 15_000,
        },
    },
});

const rootEl = document.getElementById("root");
if (!rootEl) {
    throw new Error("No se encontró el elemento #root");
}

createRoot(rootEl).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <App />
            </ToastProvider>
        </QueryClientProvider>
    </StrictMode>,
);
