import type { ReactNode } from "react";

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

export type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
};

/** The command/action log table (ui_rules.md §6) — sticky header, zebra rows, empty state. */
export function Table<T>({ columns, rows, rowKey, empty }: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-32 items-center justify-center text-sm">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-muted sticky top-0 z-30">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-muted-foreground px-3 py-2 text-xs font-medium uppercase"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-border even:bg-muted/40 hover:bg-muted/60 border-b transition-colors duration-150"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 align-top">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
