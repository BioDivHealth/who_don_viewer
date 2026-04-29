import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadData } from "@/data/loader";
import { useFilterStore } from "@/store/filters";
import { type DataBundle } from "@/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DataBundle };

function LoadingView(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <Card className="w-full max-w-lg space-y-3">
        <h1 className="font-mono text-lg text-ink">Loading WHO DON dataset</h1>
        <div className="h-2 animate-pulse rounded bg-paper-2" />
        <div className="h-2 w-2/3 animate-pulse rounded bg-paper-2" />
      </Card>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <Card className="w-full max-w-lg space-y-3">
        <h1 className="font-mono text-lg text-ink">Could not load data</h1>
        <p className="text-sm text-ink-muted">{message}</p>
        <Button onClick={onRetry}>Retry</Button>
      </Card>
    </div>
  );
}

export default function App(): JSX.Element {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const initializeFromMeta = useFilterStore((s) => s.initializeFromMeta);

  const runLoad = useCallback(async () => {
    try {
      const data = await loadData();
      initializeFromMeta(data.meta);
      setLoadState({ status: "ready", data });
    } catch (error) {
      setLoadState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [initializeFromMeta]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runLoad();
  }, [runLoad]);

  switch (loadState.status) {
    case "loading":
      return <LoadingView />;
    case "error":
      return (
        <ErrorView
          message={loadState.message}
          onRetry={() => {
            setLoadState({ status: "loading" });
            void runLoad();
          }}
        />
      );
    case "ready":
      return <AppShell meta={loadState.data.meta} rows={loadState.data.rows} />;
    default:
      return <LoadingView />;
  }
}
