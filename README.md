# Nagar — Admin Dashboard

The admin web dashboard for **Nagar**, a field employee tracking and management system. This panel allows managers to assign routes, monitor employees in real time on a map, and oversee attendance and reports.

## Overview

Nagar is built for businesses that deploy employees to multiple locations daily — sales teams, delivery agents, service technicians, and survey workers. From this dashboard, managers can:

- Create and assign GPS-fenced routes and stops to employees
- Track employees live on a map as they move between locations
- View automatically-verified visits (geofence check-ins)
- Manage employee accounts and roles
- View attendance history and generate reports

This is the **Frontend** admin panel that connects to the [Nagar backend API](https://github.com/Aman-singh98/nagar_v1_backend_live).

## Tech Stack

- **Framework:** React (Vite)
- **UI Library:** Ant Design
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Data Fetching/Caching:** TanStack React Query
- **Forms & Validation:** React Hook Form + Zod
- **Maps:** Leaflet (live employee tracking & geofence visualization)
- **Real-time Updates:** Socket.IO Client
- **HTTP Client:** Axios
- **Notifications:** React Hot Toast
- **Deployment:** Vercel

## Features

- 🗺️ Live map view of all field employees' locations
- 🧭 Route & geofenced stop creation/assignment
- 👥 Employee management (add, edit, deactivate)
- ✅ Real-time attendance & visit verification feed
- 📈 Reports and analytics dashboard
- 🔔 Toast notifications for real-time events
- 🌓 Responsive, modern UI built with Ant Design + Tailwind

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A running instance of the [Nagar backend API](https://github.com/Aman-singh98/nagar_v1_backend_live)

### Installation

```bash
# Clone the repository
git clone https://github.com/Aman-singh98/Nagar.git
cd Nagar/Frontend

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the `Frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

### Build for Production

```bash
npm run build
```

## Project Structure

```
Nagar/
└── Frontend/
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── pages/         # Route-level pages (Dashboard, Routes, Employees, etc.)
    │   ├── store/         # Zustand stores
    │   ├── hooks/         # Custom hooks
    │   ├── api/           # Axios API calls / React Query hooks
    │   └── App.jsx
    ├── package.json
    └── vite.config.js
```

## Related Repositories

- **Backend API:** [nagar_v1_backend_live](https://github.com/Aman-singh98/nagar_v1_backend_live)
- **Field Tracking App (React Native):** [nagar-field-tracking](https://github.com/Aman-singh98/nagar-field-tracking)

## Author

**Aman Singh**
- GitHub: [@Aman-singh98](https://github.com/Aman-singh98)

## License

This project is currently unlicensed. All rights reserved.
