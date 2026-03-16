import { motion as Motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

function AdminSettings() {
  return (
    <AdminLayout title="Settings" subtitle="Manage your admin preferences and platform configuration.">
      <Motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-xl"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            <Settings2 size={20} />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Settings</p>
            <p className="mt-1 text-sm text-slate-300">
              This section is ready for platform settings (coming soon).
            </p>
          </div>
        </div>
      </Motion.section>
    </AdminLayout>
  );
}

export default AdminSettings;

