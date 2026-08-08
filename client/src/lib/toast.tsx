import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";

export type ToastVariant = "success" | "error";

interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
}

const ToastContext = createContext<(message: string, variant?: ToastVariant) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counter = useRef(0);

    const push = useCallback((message: string, variant: ToastVariant = "success") => {
        const id = ++counter.current;
        setToasts((t) => [...t, { id, message, variant }]);
        window.setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== id));
        }, 3200);
    }, []);

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className="toast-wrap">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`toast ${t.variant === "error" ? "error" : ""}`}
                        role={t.variant === "error" ? "alert" : "status"}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
