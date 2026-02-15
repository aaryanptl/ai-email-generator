"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

interface SaveEmailData {
  name: string;
  description: string;
  tsxCode: string;
  htmlCode: string;
}

/**
 * Hook for saving/deleting emails via Convex.
 */
export function useConvexSave() {
  const createEmail = useMutation(api.emails.create);
  const removeEmail = useMutation(api.emails.remove);

  const saveEmail = useCallback(async (email: SaveEmailData) => {
    try {
      await createEmail({
        name: email.name,
        description: email.description,
        tsxCode: email.tsxCode,
        htmlCode: email.htmlCode,
      });
    } catch {
      // no-op
    }
  }, [createEmail]);

  const deleteEmail = useCallback(async (id: string) => {
    try {
      await removeEmail({
        id: id as Id<"emails">,
      });
    } catch {
      // no-op
    }
  }, [removeEmail]);

  return { saveEmail, deleteEmail };
}
