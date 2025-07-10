"use client";

import * as React from "react";
import { useRenderTracking } from "@/lib/utils/performance-monitor";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn?: string;
  filterPlaceholder?: string;
}

export const DataTable = React.memo(<TData, TValue>({
  columns,
  data,
  filterColumn = "email",
  filterPlaceholder = "Filter emails...",
}: DataTableProps<TData, TValue>) => {
  // Track render performance
  useRenderTracking("DataTable");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  
  // Memoize column definitions to prevent unnecessary re-renders
  const memoizedColumns = React.useMemo(() => columns, [columns]);
  
  // Debug logging only in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("DataTable Debug:", {
        filterColumn,
        availableColumns: columns.map(c => (c as any).accessorKey || (c as any).id),
        dataLength: data.length
      });
    }
  }, [columns, data, filterColumn]);
  
  // Memoize table instance to prevent recreation on every render
  const table = React.useMemo(
    () => ({
      data,
      columns: memoizedColumns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      onColumnFiltersChange: setColumnFilters,
      getFilteredRowModel: getFilteredRowModel(),
      state: {
        sorting,
        columnFilters,
      },
      initialState: {
        pagination: {
          pageSize: 10,
        },
      },
    }),
    [data, memoizedColumns, sorting, columnFilters]
  );
  
  const tableInstance = useReactTable(table);

  return (
    <div>
      <div className="flex items-center py-4">
        {filterColumn && tableInstance.getColumn(filterColumn) && (
          <Input
            placeholder={filterPlaceholder}
            value={(tableInstance.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
            onChange={React.useCallback(
              (event: React.ChangeEvent<HTMLInputElement>) =>
                tableInstance.getColumn(filterColumn)?.setFilterValue(event.target.value),
              [filterColumn]
            )}
            className="max-w-sm"
          />
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tableInstance.getRowModel().rows?.length ? (
              tableInstance.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={React.useCallback(() => tableInstance.previousPage(), [])}
          disabled={!tableInstance.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={React.useCallback(() => tableInstance.nextPage(), [])}
          disabled={!tableInstance.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}) as <TData, TValue>(
  props: DataTableProps<TData, TValue>
) => React.ReactElement;

DataTable.displayName = "DataTable";
