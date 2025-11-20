import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import App from './App';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) => {
    return {
      origin: (search.origin as string) || '',
      destination: (search.destination as string) || '',
      departureDate: (search.departureDate as string) || '',
      returnDate: (search.returnDate as string) || undefined,
    };
  },
  component: App,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

