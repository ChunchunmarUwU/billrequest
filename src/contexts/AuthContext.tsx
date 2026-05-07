import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

type User = {
  id: string;
  username: string;
  role: 'Admin' | 'User';
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
              setUser({
                id: firebaseUser.uid,
                username: userDoc.data().username,
                role: userDoc.data().role as 'Admin' | 'User'
              });
            } else {
              console.error('User record not found in database. Signing out.');
              auth.signOut();
              setUser(null);
            }
            setIsLoading(false);
          }, (error) => {
            console.error("Error subscribing to user data", error);
            setIsLoading(false);
          });
        } catch (error) {
          console.error("Error setting up user listener", error);
          setIsLoading(false);
        }
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = undefined;
        }
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
