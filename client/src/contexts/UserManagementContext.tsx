import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserRole = 'admin' | 'gerente' | 'operador';

export interface User {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: UserRole;
  createdAt: string;
}

interface UserManagementContextType {
  users: User[];
  currentUser: User | null;
  addUser: (name: string, username: string, pin: string, role: UserRole) => void;
  updateUser: (id: string, name: string, username: string, pin: string, role: UserRole) => void;
  deleteUser: (id: string) => void;
  authenticateUser: (pin: string) => User | null;
  setCurrentUser: (user: User | null) => void;
  getUserByPin: (pin: string) => User | null;
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

const DEFAULT_USERS: User[] = [
  {
    id: 'admin-001',
    name: 'Super Admin',
    username: 'admin',
    pin: '1234',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'op-001',
    name: 'Operador 1',
    username: 'operador1',
    pin: '1111',
    role: 'operador',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'op-002',
    name: 'Operador 2',
    username: 'operador2',
    pin: '2222',
    role: 'operador',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mgr-001',
    name: 'Gerente',
    username: 'gerente',
    pin: '3333',
    role: 'gerente',
    createdAt: new Date().toISOString(),
  },
];

export function UserManagementProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  const addUser = useCallback((name: string, username: string, pin: string, role: UserRole) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      username,
      pin,
      role,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((id: string, name: string, username: string, pin: string, role: UserRole) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === id ? { ...user, name, username, pin, role } : user
      )
    );
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
  }, []);

  const authenticateUser = useCallback((pin: string): User | null => {
    const user = users.find(u => u.pin === pin);
    if (user) {
      setCurrentUserState(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
    return null;
  }, [users]);

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, []);

  const getUserByPin = useCallback((pin: string): User | null => {
    return users.find(u => u.pin === pin) || null;
  }, [users]);

  const value: UserManagementContextType = {
    users,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    authenticateUser,
    setCurrentUser,
    getUserByPin,
  };

  return (
    <UserManagementContext.Provider value={value}>
      {children}
    </UserManagementContext.Provider>
  );
}

export function useUserManagement() {
  const context = useContext(UserManagementContext);
  if (!context) {
    throw new Error('useUserManagement must be used within UserManagementProvider');
  }
  return context;
}
