import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import { useModalClose } from "./useModalClose";

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
    resolve: (ok: boolean) => void;
}

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(() => Promise.resolve(false));

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [current, setCurrent] = useState<ConfirmState | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setCurrent({ ...options, resolve });
        });
    }, []);

    const close = (result: boolean) => {
        current?.resolve(result);
        setCurrent(null);
    };

    useModalClose(() => close(false));

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {current ? (
                <div className="modal-backdrop" onClick={() => close(false)}>
                    <div className="modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        {current.title ? (
                            <div className="modal-head">
                                <h3>{current.title}</h3>
                            </div>
                        ) : null}
                        <p>{current.message}</p>
                        <div className="page-actions">
                            <button className="btn ghost" onClick={() => close(false)}>
                                {current.cancelLabel ?? "Cancelar"}
                            </button>
                            <button
                                className={`btn ${current.danger ? "danger" : "primary"}`}
                                onClick={() => close(true)}
                            >
                                {current.confirmLabel ?? "Aceptar"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    return useContext(ConfirmContext);
}
