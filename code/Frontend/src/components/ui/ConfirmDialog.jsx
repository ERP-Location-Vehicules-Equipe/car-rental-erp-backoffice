import React from 'react';

const ConfirmDialog = ({
    open,
    title = 'Confirmation',
    message = 'Voulez-vous continuer ?',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    confirmClassName = 'bg-rose-600 hover:bg-rose-700',
    loading = false,
    onCancel,
    onConfirm,
}) => {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl p-5 space-y-4">
                <h4 className="text-base font-bold text-slate-900">{title}</h4>
                <p className="text-sm text-slate-600">{message}</p>
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`px-3 py-2 text-sm font-semibold rounded-md text-white disabled:opacity-60 ${confirmClassName}`}
                        disabled={loading}
                    >
                        {loading ? 'Traitement...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
