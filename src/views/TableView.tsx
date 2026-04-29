import { useMemo, useState } from "react";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { formatDate, getDiseaseLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type Row } from "@/types";

interface TableViewProps {
  rows: Row[];
  onSelectRowKey: (rowKey: string) => void;
  summary: string;
}

const PAGE_SIZES = [20, 50, 100, 500] as const;

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

export function TableView({ rows, onSelectRowKey, summary }: TableViewProps): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [pageSizeMode, setPageSizeMode] = useState<number | "all">(20);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const getScopeConfidenceLabel = (row: Row): string => {
    if (row.scope_group === "not_event_country") {
      return "Not applicable";
    }

    if (row.scope_confidence === "manual_override_high") {
      return "High (manual)";
    }

    if (row.scope_confidence === "manual_override_keep_non_strict") {
      return "Keep non-strict";
    }

    return row.scope_confidence
      .split("_")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
        cell: ({ row }) => <span className="block truncate" title={row.original.disease_standard}>{getDiseaseLabel(row.original)}</span>,
      },
      {
        accessorKey: "scope",
        header: "Scope",
        cell: ({ row }) => (
          <span className="block truncate" title={row.original.scope_display}>
            {row.original.scope_group === "not_event_country" ? "Not applicable" : row.original.scope_display}
          </span>
        ),
      },
      {
        accessorKey: "confidence",
        header: "Confidence",
        cell: ({ row }) => <span className="block truncate">{getScopeConfidenceLabel(row.original)}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.row_key,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
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
        <table className="w-full min-w-[576px] table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-paper-2 shadow-[0_1px_0_0_var(--rule)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    className={cn(
                      "cursor-pointer truncate border-b border-rule px-3 py-2 text-left font-mono text-[10px] uppercase tracking-normal text-ink-muted",
                      header.column.id === "date" ? "w-[104px] whitespace-nowrap" : "",
                      header.column.id === "don_id" ? "w-[144px] whitespace-nowrap" : "",
                      header.column.id === "country" ? "w-[180px]" : "",
                      header.column.id === "disease" ? "w-[132px] max-w-[132px]" : "",
                      header.column.id === "scope" ? "w-[220px]" : "",
                      header.column.id === "confidence" ? "w-[160px] whitespace-nowrap" : "",
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
                onClick={() => onSelectRowKey(row.original.row_key)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    className={cn(
                      "overflow-hidden px-3 py-2 align-top",
                      cell.column.id === "date" ? "w-[104px] whitespace-nowrap font-mono tabular-nums" : "",
                      cell.column.id === "don_id" ? "w-[144px] max-w-[144px] whitespace-nowrap" : "",
                      cell.column.id === "country" ? "w-[180px] max-w-[180px]" : "",
                      cell.column.id === "disease" ? "w-[132px] max-w-[132px]" : "",
                      cell.column.id === "scope" ? "w-[220px] max-w-[220px]" : "",
                      cell.column.id === "confidence" ? "w-[160px] whitespace-nowrap" : "",
                    )}
                    key={cell.id}
                  >
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
