export type GoToSymbolHandler = (symbol: string) => void;

export function useNavigationState() {
  return {
    activeNav: null as string | null,
    setActiveNav: (_nav: string | null) => {},
  };
}
