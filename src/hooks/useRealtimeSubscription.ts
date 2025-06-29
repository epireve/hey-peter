"use client";

import { useEffect, useRef } from "react";
import { CRUDService } from "@/lib/services/crud-service";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface RealtimeEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: any;
  old: any;
}

interface UseRealtimeSubscriptionOptions {
  service: CRUDService;
  events?: ("INSERT" | "UPDATE" | "DELETE")[];
  onInsert?: (record: any) => void;
  onUpdate?: (record: any) => void;
  onDelete?: (record: any) => void;
  showNotifications?: boolean;
  autoRefresh?: boolean;
}

export function useRealtimeSubscription({
  service,
  events = ["INSERT", "UPDATE", "DELETE"],
  onInsert,
  onUpdate,
  onDelete,
  showNotifications = true,
  autoRefresh = true,
}: UseRealtimeSubscriptionOptions) {
  const router = useRouter();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to real-time changes
    unsubscribeRef.current = service.subscribe(
      (payload: RealtimeEvent) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
          case "INSERT":
            onInsert?.(newRecord);
            if (showNotifications) {
              toast.info("New record added");
            }
            break;

          case "UPDATE":
            onUpdate?.(newRecord);
            if (showNotifications) {
              toast.info("Record updated");
            }
            break;

          case "DELETE":
            onDelete?.(oldRecord);
            if (showNotifications) {
              toast.info("Record deleted");
            }
            break;
        }

        // Auto-refresh the page to show latest data
        if (autoRefresh) {
          router.refresh();
        }
      },
      events
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribeRef.current?.();
    };
  }, [service, events, onInsert, onUpdate, onDelete, showNotifications, autoRefresh, router]);

  // Manual unsubscribe function
  const unsubscribe = () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  };

  return { unsubscribe };
}