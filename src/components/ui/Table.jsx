/**
 * Generic data table — columns describe the shape once, callers never
 * hand-roll <thead>/<tbody> markup per page.
 * columns: [{ key, label, align?: 'left'|'right'|'center', render?: (row) => node }]
 */
export default function Table({ columns, data, getRowKey, emptyMessage = 'No data available.' }) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
  }

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400 dark:border-line-dark dark:text-slate-500">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-3 font-medium ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={getRowKey ? getRowKey(row) : index}
              className="border-b border-line last:border-0 dark:border-line-dark"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-3 text-slate-700 dark:text-slate-300 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
