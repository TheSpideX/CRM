import React, { createContext, useContext, useState } from 'react';
import { CursorState, CursorContextType, CursorVariant } from '../components/ui/CustomCursor/types';

const defaultCursorState: CursorState = {
  variant: 'default',
  isHidden: false,
  scale: 1,
};

const CursorContext = createContext<CursorContextType>({
  cursorState: defaultCursorState,
  setCursorState: () => {},
  resetCursor: () => {},
});

export const CursorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cursorState, setCursorState] = useState<CursorState>(defaultCursorState);

  const updateCursorState = (newState: Partial<CursorState>) => {
    setCursorState(prev => ({ ...prev, ...newState }));
  };

  const resetCursor = () => {
    setCursorState(defaultCursorState);
  };

  return (
    <CursorContext.Provider 
      value={{ 
        cursorState, 
        setCursorState: updateCursorState,
        resetCursor 
      }}
    >
      {children}
    </CursorContext.Provider>
  );
};

export const useCursorContext = () => {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error('useCursorContext must be used within a CursorProvider');
  }
  return context;
};
