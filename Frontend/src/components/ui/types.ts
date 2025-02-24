export type CursorVariant = 
  | 'default' 
  | 'button' 
  | 'text' 
  | 'link' 
  | 'drag' 
  | 'expand' 
  | 'video' 
  | 'copy' 
  | 'loading'
  | 'success'
  | 'error';

export interface CursorState {
  variant: CursorVariant;
  text?: string;
  isHidden?: boolean;
  color?: string;
  scale?: number;
}

export interface CursorContextType {
  cursorState: CursorState;
  setCursorState: (state: Partial<CursorState>) => void;
  resetCursor: () => void;
}