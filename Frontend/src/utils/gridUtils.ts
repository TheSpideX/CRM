export const getGridSpan = (index: number): string => {
  switch (index) {
    case 0:
      return "col-span-2 row-span-2";
    case 1:
      return "col-span-1 row-span-1";
    case 2:
      return "col-span-1 row-span-2";
    case 3:
      return "col-span-1 row-span-1";
    default:
      return "col-span-1 row-span-1";
  }
};

export const getGridHeight = (index: number): string => {
  switch (index) {
    case 0:
    case 2:
      return "h-full min-h-[400px]";
    default:
      return "h-full min-h-[200px]";
  }
};

export const getCardStyle = (index: number): string => {
  return `group relative overflow-hidden backdrop-blur-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 ease-out hover:translate-y-[-2px]`;
};

export const getCardBorderRadius = (index: number): string => {
  return "rounded-2xl";
};

export const getIconSize = (index: number): string => {
  return index === 0 ? "w-12 h-12" : "w-8 h-8";
};
