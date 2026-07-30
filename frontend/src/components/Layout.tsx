import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-container">
          <div key={location.pathname} className="page-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
