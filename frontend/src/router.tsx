import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import App from './App';
import { parseSearchParams } from './schemas/searchParams';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) => {
    // Use Zod schema for type-safe validation
    const parsed = parseSearchParams(search);
    return {
      origin: parsed.origin || '',
      destination: parsed.destination || '',
      departureDate: parsed.departureDate || '',
      returnDate: parsed.roundTrip ? parsed.returnDate : undefined,
      roundTrip: parsed.roundTrip,
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

