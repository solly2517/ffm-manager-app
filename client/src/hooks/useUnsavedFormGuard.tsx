import { useEffect } from "react";

export function useUnsavedFormGuard(isDirty: boolean, message = "You have unsaved changes. Leaving now will discard this draft.") {
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!isDirty) return; event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);
  const requestLeave = (action: () => void) => {
    if (!isDirty) { action(); return; }
    if (window.confirm(message)) action();
  };
  return { requestLeave };
}
