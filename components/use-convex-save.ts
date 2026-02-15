"use client";

import { useCallback, useRef } from "react";

interface SaveEmailData {
  name: string;
  description: string;
  tsxCode: string;
  htmlCode: string;
}

/**
 * Hook for saving/deleting emails via Convex.
 * Falls back to no-op if Convex is not configured.
 */
export function useConvexSave() {
  // Track Convex IDs mapped to local IDs for deletion
  const convexIdMapRef = useRef<Map<string, string>>(new Map());
  const convexAvailable = !!process.env.NEXT_PUBLIC_CONVEX_URL;

  const saveEmail = useCallback(
    async (email: SaveEmailData) => {
      if (!convexAvailable) return;
      try {
        // Dynamic import to avoid errors when Convex is not set up
        const { ConvexHttpClient } = await import("convex/browser");
        const { api } = await import("@/convex/_generated/api");
        const client = new ConvexHttpClient(
          process.env.NEXT_PUBLIC_CONVEX_URL!
        );
        await client.mutation(api.emails.create, {
          name: email.name,
          description: email.description,
          tsxCode: email.tsxCode,
          htmlCode: email.htmlCode,
        });
      } catch {
        // Silently fail - local state still works
      }
    },
    [convexAvailable]
  );

  const deleteEmail = useCallback(
    async (localId: string) => {
      if (!convexAvailable) return;
      const convexId = convexIdMapRef.current.get(localId);
      if (!convexId) return;
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const { api } = await import("@/convex/_generated/api");
        const client = new ConvexHttpClient(
          process.env.NEXT_PUBLIC_CONVEX_URL!
        );
        await client.mutation(api.emails.remove, {
          id: convexId as never,
        });
        convexIdMapRef.current.delete(localId);
      } catch {
        // Silently fail
      }
    },
    [convexAvailable]
  );

  return { saveEmail, deleteEmail };
}
