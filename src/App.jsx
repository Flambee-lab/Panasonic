import { AppProvider } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import IPDrawer from "./components/IPDrawer";

export default function App() {
  return (
    <AppProvider>
      <div className="main-screen flex min-h-screen text-[#e9edf5]">
        <Sidebar />
        <Dashboard />
        <IPDrawer />
      </div>
    </AppProvider>
  );
}
