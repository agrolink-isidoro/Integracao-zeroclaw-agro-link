import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
const DatePicker = ({ value = '', onChange, placeholder = 'DD/MM/YYYY', disabled = false, error, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const inputRef = useRef(null);
    const calendarRef = useRef(null);
    // Formatar data para DD/MM/YYYY
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    // Parse DD/MM/YYYY para Date
    const parseDate = (dateStr) => {
        const parts = dateStr.split('/');
        if (parts.length !== 3)
            return null;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year))
            return null;
        return new Date(year, month, day);
    };
    // Dias da semana em português
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    // Meses em português
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const handleInputChange = (e) => {
        const inputValue = e.target.value;
        onChange(inputValue);
        // Tentar parse da data
        const parsedDate = parseDate(inputValue);
        if (parsedDate) {
            setCurrentDate(parsedDate);
        }
    };
    const handleDateSelect = (date) => {
        const formattedDate = formatDate(date);
        onChange(formattedDate);
        setIsOpen(false);
    };
    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            }
            else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };
    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        const days = [];
        const current = new Date(startDate);
        for (let i = 0; i < 42; i++) {
            const isCurrentMonth = current.getMonth() === month;
            const isToday = current.toDateString() === new Date().toDateString();
            const isSelected = value && parseDate(value)?.toDateString() === current.toDateString();
            days.push({
                date: new Date(current),
                isCurrentMonth,
                isToday,
                isSelected,
                day: current.getDate()
            });
            current.setDate(current.getDate() + 1);
        }
        return days;
    };
    // Fechar calendário ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current &&
                !calendarRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (_jsxs("div", { className: `relative ${className}`, children: [_jsx("input", { ref: inputRef, type: "text", value: value, onChange: handleInputChange, onFocus: () => setIsOpen(true), placeholder: placeholder, disabled: disabled, className: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}` }), isOpen && (_jsxs("div", { ref: calendarRef, className: "absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 w-80", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("button", { onClick: () => navigateMonth('prev'), className: "p-1 hover:bg-gray-100 rounded", children: "\u2039" }), _jsxs("span", { className: "font-semibold", children: [months[currentDate.getMonth()], " ", currentDate.getFullYear()] }), _jsx("button", { onClick: () => navigateMonth('next'), className: "p-1 hover:bg-gray-100 rounded", children: "\u203A" })] }), _jsx("div", { className: "grid grid-cols-7 gap-1 mb-2", children: weekDays.map(day => (_jsx("div", { className: "text-center text-sm font-medium text-gray-500 py-1", children: day }, day))) }), _jsx("div", { className: "grid grid-cols-7 gap-1", children: generateCalendarDays().map((day, index) => (_jsx("button", { onClick: () => handleDateSelect(day.date), disabled: !day.isCurrentMonth, className: `p-2 text-sm rounded hover:bg-blue-100 ${day.isSelected
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : day.isToday
                                    ? 'bg-blue-100 text-blue-600'
                                    : day.isCurrentMonth
                                        ? 'text-gray-900'
                                        : 'text-gray-400'}`, children: day.day }, index))) })] })), error && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: error }))] }));
};
export default DatePicker;
