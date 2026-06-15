"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/**
 * Server-side pagination control. The page lives in the URL (`page`), preserving
 * the active filters; the Server Component re-fetches the matching slice.
 */
export function LogsPagination({
  page,
  total,
  pageSize,
}: {
  page: number;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function goTo(nextPage: number) {
    const next = new URLSearchParams(params.toString());
    if (nextPage <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(nextPage));
    }
    const qs = next.toString();
    router.replace(qs ? `${ROUTES.LOGS}?${qs}` : ROUTES.LOGS);
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? "0 registros"
          : `Mostrando ${from}–${to} de ${total} registro${total === 1 ? "" : "s"}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
          className="h-11 sm:h-9 border-bayon-navy/20 text-bayon-navy hover:bg-bayon-navy/5"
        >
          Anterior
        </Button>
        <span className="text-sm text-bayon-navy">
          Página {page} de {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
          className="h-11 sm:h-9 border-bayon-navy/20 text-bayon-navy hover:bg-bayon-navy/5"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
