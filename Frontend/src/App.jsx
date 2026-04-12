// /**
//  * @file App.jsx
//  * Root router configuration.
//  *
//  * Route structure:
//  *   /login                → LoginPage (public)
//  *   /                     → AppLayout (protected shell)
//  *     /                   → DashboardPage
//  *     /employees          → EmployeesPage
//  *     /routes             → RoutesPage
//  *     /assignments        → AssignmentsPage
//  *     /map                → LiveMapPage
//  *
//  * Future scope:
//  *  - Add role-based route guards (e.g. /map only for manager/admin)
//  *  - Add React.lazy + Suspense per route for code splitting
//  *  - Add 404 catch-all route
//  */

// import { Routes, Route, Navigate } from 'react-router-dom';
// import { lazy, Suspense } from 'react';
// import ProtectedRoute from './auth/ProtectedRoute.jsx';
// import AppLayout from './components/layout/AppLayout.jsx';
// import Spinner from './components/ui/Spinner.jsx';

// // ── Lazy-loaded pages for optimal bundle splitting ───────────────────────────
// const LoginPage = lazy(() => import('./pages/Auth/LoginPage.jsx'));
// const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage.jsx'));
// const EmployeesPage = lazy(() => import('./pages/Employees/EmployeesPage.jsx'));
// const RoutesPage = lazy(() => import('./pages/Routes/RoutesPage.jsx'));
// const AssignmentsPage = lazy(() => import('./pages/Assignments/AssignmentsPage.jsx'));
// const LiveMapPage = lazy(() => import('./pages/Live-map/LiveMapPage.jsx'));

// /** Full-screen suspense fallback while lazy chunks load */
// function PageLoader() {
// 	return (
// 		<div style={{
// 			minHeight: '100dvh',
// 			display: 'flex',
// 			alignItems: 'center',
// 			justifyContent: 'center',
// 			background: 'var(--bg)',
// 		}}>
// 			<Spinner size={32} />
// 		</div>
// 	);
// }

// export default function App() {
// 	return (
// 		<Suspense fallback={<PageLoader />}>
// 			<Routes>
// 				{/* Public */}
// 				<Route path="/login" element={<LoginPage />} />

// 				{/* Protected shell */}
// 				<Route element={<ProtectedRoute />}>
// 					<Route element={<AppLayout />}>
// 						<Route index element={<DashboardPage />} />
// 						<Route path="employees" element={<EmployeesPage />} />
// 						<Route path="routes" element={<RoutesPage />} />
// 						<Route path="assignments" element={<AssignmentsPage />} />
// 						<Route path="map" element={<LiveMapPage />} />
// 					</Route>
// 				</Route>
// 				{/* Catch-all → home */}
// 				<Route path="*" element={<Navigate to="/" replace />} />
// 			</Routes>
// 		</Suspense>
// 	);
// }

/**
 * @file App.jsx
 * Root router configuration.
 *
 * Route structure:
 *   /login                → LoginPage (public)
 *   /                     → AppLayout (protected shell)
 *     /                   → DashboardPage
 *     /employees          → EmployeesPage
 *     /routes             → RoutesPage
 *     /assignments        → AssignmentsPage
 *     /map                → LiveMapPage
 *
 * Future scope:
 *  - Add role-based route guards (e.g. /map only for manager/admin)
 *  - Add React.lazy + Suspense per route for code splitting
 *  - Add 404 catch-all route
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Spinner from './components/ui/Spinner.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';

// ── Lazy-loaded pages for optimal bundle splitting ───────────────────────────
const LoginPage      = lazy(() => import('./pages/Auth/LoginPage.jsx'));
const DashboardPage  = lazy(() => import('./pages/Dashboard/DashboardPage.jsx'));
const EmployeesPage  = lazy(() => import('./pages/Employees/EmployeesPage.jsx'));
const RoutesPage     = lazy(() => import('./pages/Routes/RoutesPage.jsx'));
const AssignmentsPage = lazy(() => import('./pages/Assignments/AssignmentsPage.jsx'));
const LiveMapPage    = lazy(() => import('./pages/Live-map/LiveMapPage.jsx'));

/** Full-screen suspense fallback while lazy chunks load */
function PageLoader() {
   return (
      <div style={{
         minHeight: '100dvh',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         background: 'var(--bg)',
      }}>
         <Spinner size={32} />
      </div>
   );
}

/**
 * Inner shell that reads the theme context and passes the correct
 * Ant Design algorithm to ConfigProvider.
 * Separated from App so ThemeProvider is already mounted when useTheme() runs.
 */
function ThemedApp() {
   const { isDark } = useTheme();

   return (
      <ConfigProvider
         theme={{
            algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
            token: {
               colorPrimary: '#6366f1',
               borderRadius: 8,
               fontFamily: "'DM Sans', sans-serif",
            },
         }}
      >
         <Suspense fallback={<PageLoader />}>
            <Routes>
               {/* Public */}
               <Route path="/login" element={<LoginPage />} />

               {/* Protected shell */}
               <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                     <Route index element={<DashboardPage />} />
                     <Route path="employees" element={<EmployeesPage />} />
                     <Route path="routes" element={<RoutesPage />} />
                     <Route path="assignments" element={<AssignmentsPage />} />
                     <Route path="map" element={<LiveMapPage />} />
                  </Route>
               </Route>

               {/* Catch-all → home */}
               <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
         </Suspense>
      </ConfigProvider>
   );
}

export default function App() {
   return (
      <ThemeProvider>
         <ThemedApp />
      </ThemeProvider>
   );
}
