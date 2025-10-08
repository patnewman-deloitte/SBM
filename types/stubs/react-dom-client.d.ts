declare module 'react-dom/client' {
  export function createRoot(container: any): { render: (children: any) => void; unmount: () => void };
}
