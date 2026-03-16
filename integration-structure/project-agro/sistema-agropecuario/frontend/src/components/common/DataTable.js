import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
function DataTable({ data, columns, loading = false, onEdit, onDelete, onView, actions, emptyMessage = 'Nenhum registro encontrado' }) {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const handleSort = (columnKey) => {
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };
    // Garantir que data seja sempre um array
    const dataArray = Array.isArray(data) ? data : [];
    const sortedData = React.useMemo(() => {
        if (!sortColumn)
            return dataArray;
        return [...dataArray].sort((a, b) => {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];
            if (aValue < bValue)
                return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue)
                return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [dataArray, sortColumn, sortDirection]);
    if (loading) {
        return (_jsx("div", { className: "flex justify-center items-center py-8", children: _jsx(LoadingSpinner, { size: "lg" }) }));
    }
    if (dataArray.length === 0) {
        return (_jsx("div", { className: "text-center py-8 text-gray-500", children: emptyMessage }));
    }
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [columns.map((column) => (_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100", onClick: () => column.sortable && handleSort(String(column.key)), children: _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("span", { children: column.header }), column.sortable && sortColumn === column.key && (_jsx("span", { children: sortDirection === 'asc' ? '↑' : '↓' }))] }) }, String(column.key)))), (onView || onEdit || onDelete || actions) && (_jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "A\u00E7\u00F5es" }))] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: sortedData.map((item) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [columns.map((column) => (_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: column.render
                                    ? column.render(item[column.key], item)
                                    : String(item[column.key] || '-') }, String(column.key)))), (onView || onEdit || onDelete || actions) && (_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2", children: actions ? actions(item) : (_jsxs(_Fragment, { children: [onView && (_jsx("button", { onClick: () => onView(item), className: "btn btn-link btn-sm text-decoration-none", "aria-label": `Ver ${String(item.id)}`, children: "Ver" })), onEdit && (_jsx("button", { onClick: () => onEdit(item), className: "btn btn-link btn-sm text-decoration-none", "aria-label": `Editar ${String(item.id)}`, children: "Editar" })), onDelete && (_jsx("button", { onClick: () => onDelete(item), className: "btn btn-link btn-sm text-danger text-decoration-none", "aria-label": `Excluir ${String(item.id)}`, children: "Excluir" }))] })) }))] }, item.id))) })] }) }));
}
export default DataTable;
