import React from 'react';

const DateTimeInputDialog = ({
    open,
    title,
    label,
    value,
    submitLabel = 'Valider',
    cancelLabel = 'Annuler',
    loading = false,
    onChange,
    onCancel,
    onSubmit,
}) => {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl p-5 space-y-4">
                <h4 className="text-base font-bold text-slate-900">{title}</h4>
                <label className="text-xs font-semibold text-slate-600 block">
                    {label}
                    <input
                        type="datetime-local"
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                </label>
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
                        onClick={onSubmit}
                        className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                        disabled={loading}
                    >
                        {loading ? 'Traitement...' : submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DateTimeInputDialog;
