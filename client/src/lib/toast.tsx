import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";

interface Toast {
    id: number;
    message: string;
}

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counter = useRef(0);

    const push = useCallback((message: string) => {
        const id = ++counter.current;
        setToasts((t) => [...t, { id, message }]);
        window.setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== id));
        }, 3200);
    }, []);

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className="toast-wrap">
                {toasts.map((t) => (
                    <div key={t.id} className="toast">
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
