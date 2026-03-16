import { jsx as _jsx } from "react/jsx-runtime";
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import useAuth from '../hooks/useAuth';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const auth = useAuth();
    return (_jsx(AuthContext.Provider, { value: auth, children: children }));
};
export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
