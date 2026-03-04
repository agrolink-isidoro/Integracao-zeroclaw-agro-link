import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

function DataTable<T extends { id: number | string }>({
  data,
  columns,
  loading = false,
  onEdit,
  onDelete,
  onView,
  actions,
  emptyMessage = 'Nenhum registro encontrado'
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Garantir que data seja sempre um array
  const dataArray = Array.isArray(data) ? data : [];

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return dataArray;

    return [...dataArray].sort((a, b) => {
      const aValue = (a as any)[sortColumn];
      const bValue = (b as any)[sortColumn];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dataArray, sortColumn, sortDirection]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (dataArray.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => column.sortable && handleSort(String(column.key))}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  {column.sortable && sortColumn === column.key && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
            {(onView || onEdit || onDelete || actions) && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render
                    ? column.render((item as any)[column.key], item)
                    : String((item as any)[column.key] || '-')
                  }
                </td>
              ))}
              {(onView || onEdit || onDelete || actions) && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {actions ? actions(item) : (
                    <>
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          className="btn btn-link btn-sm text-decoration-none"
                          aria-label={`Ver ${String((item as any).id)}`}
                        >
                          Ver
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="btn btn-link btn-sm text-decoration-none"
                          aria-label={`Editar ${String((item as any).id)}`}
                        >
                          Editar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="btn btn-link btn-sm text-danger text-decoration-none"
                          aria-label={`Excluir ${String((item as any).id)}`}
                        >
                          Excluir
                        </button>
                      )}
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;