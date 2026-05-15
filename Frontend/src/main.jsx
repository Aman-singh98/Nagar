import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles/globals.css';
import 'antd/dist/reset.css';
import 'leaflet/dist/leaflet.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 2,   // 2 min
			gcTime: 1000 * 60 * 10,  // 10 min
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<App />
				<Toaster
					position="top-right"
					toastOptions={{
						duration: 3500,
						style: {
							background: 'var(--surface-2)',
							color: 'var(--text)',
							border: '1px solid var(--border-2)',
							fontFamily: 'var(--font-body)',
							fontSize: '14px',
							borderRadius: 'var(--radius)',
						},
						success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg)' } },
						error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg)' } },
					}}
				/>
			</BrowserRouter>
		</QueryClientProvider>
	</StrictMode>,
);