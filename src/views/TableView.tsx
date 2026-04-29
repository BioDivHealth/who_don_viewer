import { useEffect, useMemo, useState } from "react";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type VisibilityState,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { AdjudicationBadge } from "@/components/AdjudicationBadge";
import { GenericLabelBadge } from "@/components/GenericLabelBadge";
import { Badge } from "@/components/ui/badge";
import { formatCodeLabel, formatDate, getDiseaseLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type Row } from "@/types";

interface TableViewProps {
  rows: Row[];
  onSelectRecord: (recordKey: string) => void;
  summary: string;
}

const PAGE_SIZES = [20, 50, 100, 500] as const;
const TABLE_MEDIUM_BREAKPOINT = 1180;
const TABLE_WIDE_BREAKPOINT = 1380;

const TABLE_COLUMN_IDS = [
  "date",
  "don_id",
  "country",
  "disease",
  "confidence",
  "source",
  "needs_review",
  "disease_refinement_review_status",
  "scope",
  "country_role",
] as const;

type TableColumnId = (typeof TABLE_COLUMN_IDS)[number];

const isTableColumnId = (value: string): value is TableColumnId =>
  (TABLE_COLUMN_IDS as readonly string[]).includes(value);

const HEADER_CLASS_BY_COLUMN: Record<TableColumnId, string> = {
  date: "w-[104px] whitespace-nowrap",
  don_id: "w-[240px] whitespace-nowrap",
  country: "w-[180px]",
  disease: "min-w-[220px]",
  confidence: "w-[120px] whitespace-nowrap",
  source: "w-[140px]",
  needs_review: "w-[140px] whitespace-nowrap",
  disease_refinement_review_status: "w-[190px]",
  scope: "w-[220px]",
  country_role: "w-[160px]",
};

const CELL_CLASS_BY_COLUMN: Record<TableColumnId, string> = {
  date: "w-[104px] whitespace-nowrap font-mono tabular-nums",
  don_id: "w-[240px] max-w-[240px] whitespace-nowrap",
  country: "w-[180px] max-w-[180px]",
  disease: "min-w-[220px]",
  confidence: "w-[120px] whitespace-nowrap",
  source: "w-[140px] max-w-[140px]",
  needs_review: "w-[140px] whitespace-nowrap",
  disease_refinement_review_status: "w-[190px] max-w-[190px]",
  scope: "w-[220px] max-w-[220px]",
  country_role: "w-[160px] max-w-[160px]",
};

function getHeaderClassName(columnId: string): string {
  if (!isTableColumnId(columnId)) {
    return "";
  }
  return HEADER_CLASS_BY_COLUMN[columnId];
}

function getCellClassName(columnId: string): string {
  if (!isTableColumnId(columnId)) {
    return "";
  }
  return CELL_CLASS_BY_COLUMN[columnId];
}

function getColumnVisibilityForWidth(width: number): VisibilityState {
  const medium = width >= TABLE_MEDIUM_BREAKPOINT;
  const wide = width >= TABLE_WIDE_BREAKPOINT;

  return {
    confidence: medium,
    source: medium,
    needs_review: wide,
    disease_refinement_review_status: wide,
    scope: medium,
    country_role: wide,
  };
}

function buildPaginationWindow(currentPage: number, pageCount: number): Array<number | "..."> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const pages = new Set<number>([0, 1, pageCount - 2, pageCount - 1, currentPage - 1, currentPage, currentPage + 1]);
  const sortedPages = [...pages].filter((page) => page >= 0 && page < pageCount).sort((a, b) => a - b);
  const result: Array<number | "..."> = [];

  for (let index = 0; index < sortedPages.length; index += 1) {
    const page = sortedPages[index];
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      result.push("...");
    }
    result.push(page);
  }

  return result;
}

function getEvidenceConfidence(row: Row): string {
  if (row.scope_group === "not_event_country") {
    return row.event_layer_confidence;
  }

  if (row.confidence === "manual_override_keep_non_strict") {
    return row.event_layer_confidence;
  }

  return row.scope_confidence;
}

export function TableView({ rows, onSelectRecord, summary }: TableViewProps): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [pageSizeMode, setPageSizeMode] = useState<number | "all">(20);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === "undefined") {
      return getColumnVisibilityForWidth(1400);
    }
    return getColumnVisibilityForWidth(window.innerWidth);
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: "don_id",
        header: "DON",
        cell: ({ row }) => (
          <a
            className="block truncate text-accent underline decoration-rule underline-offset-2"
            href={row.original.article_url}
            rel="noreferrer"
            target="_blank"
            title={row.original.don_id}
          >
            {row.original.don_id}
          </a>
        ),
      },
      {
        accessorKey: "country",
        header: "Country",
        cell: ({ row }) => (
          <span className="block truncate" title={row.original.country}>
            {row.original.country}
          </span>
        ),
      },
      {
        accessorKey: "disease",
        header: "Disease",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate" title={row.original.disease_standard}>
              {getDiseaseLabel(row.original)}
            </span>
            {row.original.is_generic_label ? (
              <span className="shrink-0">
                <GenericLabelBadge />
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "confidence",
        header: "Evidence confidence",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col items-center gap-1">
            <Badge>{formatCodeLabel(getEvidenceConfidence(row.original))}</Badge>
            {row.original.manual_focal_review_decision === "keep_non_strict" ? (
              <AdjudicationBadge label="Keep non-strict" />
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <span className="block truncate" title={row.original.source}>
            {row.original.source}
          </span>
        ),
      },
      {
        accessorKey: "needs_review",
        header: "Downstream review",
        cell: ({ row }) => (row.original.needs_review ? "Yes" : "No"),
      },
      {
        accessorKey: "disease_refinement_review_status",
        header: "Disease review",
        cell: ({ row }) => (
          <span className="block truncate" title={row.original.disease_refinement_review_status}>
            {row.original.disease_refinement_review_status}
          </span>
        ),
      },
      {
        accessorKey: "scope",
        header: "Scope",
        cell: ({ row }) => (
          <span className="block truncate" title={row.original.scope_display}>
            {row.original.scope_display}
          </span>
        ),
      },
      {
        accessorKey: "country_role",
        header: "Country role",
        cell: ({ row }) => (
          <span className="block truncate" title={row.original.country_role}>
            {row.original.country_role}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const paginatedRows = table.getPaginationRowModel().rows;
  const showAll = pageSizeMode === "all";
  const pageCount = table.getPageCount();
  const pageWindow = buildPaginationWindow(pagination.pageIndex, pageCount);
  const visibleRows = showAll ? tableRows : paginatedRows;

  useEffect(() => {
    const updateColumnsForViewport = () => {
      setColumnVisibility(getColumnVisibilityForWidth(window.innerWidth));
    };
    updateColumnsForViewport();
    window.addEventListener("resize", updateColumnsForViewport);
    return () => {
      window.removeEventListener("resize", updateColumnsForViewport);
    };
  }, []);

  const onPageSizeChange = (value: string) => {
    if (value === "all") {
      setPageSizeMode("all");
      const totalRows = rows.length;
      table.setPageSize(totalRows);
      setPagination({
        pageIndex: 0,
        pageSize: totalRows,
      });
      return;
    }

    const size = Number(value);
    setPageSizeMode(size);
    table.setPageSize(size);
    setPagination({
      pageIndex: 0,
      pageSize: size,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col border border-rule bg-paper">
      <div className="flex items-center justify-between">
        <h3 className="label px-4 py-3">Table</h3>
        <p className="numeric px-4 text-xs text-ink-muted">{summary}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-y border-rule">
        <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-paper-2 shadow-[0_1px_0_0_var(--rule)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    className={cn(
                      "cursor-pointer truncate border-b border-rule px-3 py-2 text-left font-mono text-[10px] uppercase tracking-normal text-ink-muted",
                      getHeaderClassName(header.column.id),
                    )}
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                className="cursor-pointer border-b border-rule text-sm text-ink hover:bg-paper-2"
                key={row.id}
                onClick={() => onSelectRecord(row.original.record_key)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td className={cn("overflow-hidden px-3 py-2 align-top", getCellClassName(cell.column.id))} key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            className="numeric h-8 min-w-8 border border-rule px-2 text-xs text-ink disabled:opacity-40"
            disabled={showAll || !table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            type="button"
          >
            {"<"}
          </button>

          {!showAll
            ? pageWindow.map((entry, index) =>
                entry === "..." ? (
                  <span className="numeric px-1 text-xs text-ink-muted" key={`dots-${index}`}>
                    ...
                  </span>
                ) : (
                  <button
                    className="numeric h-8 min-w-8 border px-2 text-xs"
                    key={entry}
                    onClick={() => table.setPageIndex(entry)}
                    style={{
                      borderColor: entry === pagination.pageIndex ? "var(--accent)" : "var(--rule)",
                      backgroundColor: entry === pagination.pageIndex ? "var(--accent)" : "transparent",
                      color: entry === pagination.pageIndex ? "var(--paper)" : "var(--ink)",
                    }}
                    type="button"
                  >
                    {entry + 1}
                  </button>
                ),
              )
            : null}

          <button
            className="numeric h-8 min-w-8 border border-rule px-2 text-xs text-ink disabled:opacity-40"
            disabled={showAll || !table.getCanNextPage()}
            onClick={() => table.nextPage()}
            type="button"
          >
            {">"}
          </button>
        </div>

        <label className="numeric flex items-center gap-2 text-xs text-ink-muted">
          Rows per page
          <select
            className="h-8 border border-rule bg-paper px-2 text-xs text-ink"
            onChange={(event) => onPageSizeChange(event.target.value)}
            value={pageSizeMode}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value="all">Show all</option>
          </select>
        </label>
      </div>
    </div>
  );
}
