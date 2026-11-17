import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface DataTableColumn<Row> {
  key: string;
  title: ReactNode;
  width: number;
  render: (row: Row) => ReactNode;
}

interface DataTableProps<Row> {
  columns: ReadonlyArray<DataTableColumn<Row>>;
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  caption?: string;
}

/**
 * Таблица организатора: синяя шапка (#e5edfc), строки по 8/10, радиус 8.
 * Ширины колонок заданы в пикселях, как в макете; на мобильных — горизонтальный скролл.
 */
export function DataTable<Row>({ columns, rows, rowKey, caption }: DataTableProps<Row>) {
  const cols = (
    <colgroup>
      {columns.map((c) => (
        <col key={c.key} style={{ width: c.width }} />
      ))}
    </colgroup>
  );
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        {cols}
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
