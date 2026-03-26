import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
    dashboard: "Tableau de Bord",
    inspection: "Nouvelle Inspection",
    actions: "Plans d'Actions",
    planning: "Planning",
    historique: "Historique",
    logs: "Journal Logs",
    users: "Utilisateurs",
    parametres: "Paramètres",
};

export function Breadcrumbs() {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);

    if (pathnames.length === 0) return null;

    return (
        <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
            <Link
                to="/dashboard"
                className="flex items-center hover:text-sonatel-orange transition-colors"
            >
                <Home className="w-3.5 h-3.5 mr-1" />
                <span>APP</span>
            </Link>
            {pathnames.map((value, index) => {
                const last = index === pathnames.length - 1;
                const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                const label = routeLabels[value] || value;

                return (
                    <React.Fragment key={to}>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        {last ? (
                            <span className="text-sonatel-orange font-black">
                                <span>{label}</span>
                            </span>
                        ) : (
                            <Link
                                to={to}
                                className="hover:text-sonatel-orange transition-colors"
                            >
                                <span>{label}</span>
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
