declare module 'react-router-dom' {
  export const BrowserRouter: React.FC<{ children?: React.ReactNode }>;
  export const Routes: React.FC<{ children?: React.ReactNode }>;
  export const Route: React.FC<any>;
  export const NavLink: React.FC<any>;
  export const Link: React.FC<any>;
  export const Outlet: React.FC;
  export const Navigate: React.FC<{ to: string }>;
  export function useNavigate(): (to: string, options?: any) => void;
  export function useLocation(): { pathname: string; state?: any };
  export function useParams<T extends Record<string, string | undefined>>(): T;
  export function useSearchParams(): [URLSearchParams, (params: URLSearchParams | Record<string, string>) => void];
}
