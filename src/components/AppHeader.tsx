/**
 * AppHeader — header conforme al Design System v2.0 di Moca Hub.
 * 3 zone, sticky, sfondo moca-black: [logo+nome cliente] [titolo app] [azioni + logo Moca + esci].
 */
import { type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useMoca } from "@/lib/MocaProvider";

const MOCA_LOGO = "https://mocainteractive.com/assets/svg/logo-light.svg";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  specialist: "Specialist",
  external: "Esterno",
  admin: "Admin",
};

export function AppHeader({
  appTitle,
  actions,
}: {
  appTitle: string;
  actions?: ReactNode;
}) {
  const { client, user, logout } = useMoca();

  return (
    <header className="bg-moca-black text-white sticky top-0 z-50 shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Sx: cliente */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {client.logo_url && (
              <img
                src={client.logo_url}
                alt={client.name}
                className="h-10 w-10 object-contain bg-white rounded-md p-1 flex-shrink-0"
              />
            )}
            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-semibold truncate">{client.name}</p>
              <p className="text-xs text-gray-300 truncate">
                {user.name} · {ROLE_LABEL[user.role] ?? user.role}
              </p>
            </div>
          </div>

          {/* Centro: titolo app */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-base sm:text-lg font-semibold truncate">{appTitle}</h1>
          </div>

          {/* Dx: azioni + logo Moca + esci */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
            {actions}
            <img src={MOCA_LOGO} alt="Moca" className="h-6 opacity-80 hidden sm:block" />
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-moca-red transition-colors"
              title="Esci"
            >
              <LogOut size={18} />
              <span className="hidden lg:inline text-sm">Esci</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
