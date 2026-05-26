'use client';

import { Check, Loader2, ChevronRight } from 'lucide-react';

export default function SaveButton({ onClick, status }) {
  const isSaving = status === 'saving';
  const isSaved  = status === 'saved';

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-100 p-4 pb-8 md:pb-6 z-50">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onClick}
          disabled={isSaving}
          className="w-full bg-[#ab3500] hover:bg-[#8f2c00] disabled:opacity-70 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#ab3500]/20 hover:scale-[0.99] active:scale-95 transition-all"
        >
          {isSaving ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Saving…
            </>
          ) : isSaved ? (
            <>
              <Check size={20} />
              Saved!
            </>
          ) : (
            <>
              Save Changes
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
