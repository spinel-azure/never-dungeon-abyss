// Share one fresh reconciliation across synchronous UI and persistence updates.
// Nothing is cached across turns; reset/load cancels work from the old session.
export function createCoalescedNotificationSync(sync) {
  let pending = null;
  return {
    request() {
      if (pending) return;
      const token = {};
      pending = token;
      queueMicrotask(() => {
        if (pending !== token) return;
        pending = null;
        sync();
      });
    },
    cancel() { pending = null; }
  };
}
