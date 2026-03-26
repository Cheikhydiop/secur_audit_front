import { useState, useEffect } from "react";
import { adminService } from "@/services/AdminService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Filter, Eye, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Inspection {
  id: string;
  date: string;
  statut: "EN_COURS" | "VALIDEE" | "REJETEE";
  score: number | null;
  site: {
    id: string;
    nom: string;
    code: string;
    zone: string;
    type: string;
  };
  inspecteur: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    actions: number;
    inspectionQuestions: number;
  };
}

const STATUT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  EN_COURS: { label: "En cours", variant: "secondary" },
  VALIDEE: { label: "Validée", variant: "default" },
  REJETEE: { label: "Rejetée", variant: "destructive" },
};

export default function AdminInspectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const filters: any = { page, limit: 10 };
      if (search) filters.search = search;
      if (statut !== "all") filters.statut = statut;

      const res = await adminService.getInspections(filters);
      if (res.data) {
        setInspections(res.data);
        setTotalPages(res.pagination?.pages || 1);
        setTotal(res.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching inspections:", error);
      toast.error("Erreur lors du chargement des inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [page, statut]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      fetchInspections();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Accès restreint aux administrateurs</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Inspections</h1>
          <p className="text-gray-500">Liste de toutes les inspections soumises</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Total: {total} inspections
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="EN_COURS">En cours</SelectItem>
                <SelectItem value="VALIDEE">Validée</SelectItem>
                <SelectItem value="REJETEE">Rejetée</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchInspections}>
              Filtrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sonatel-orange"></div>
            </div>
          ) : inspections.length === 0 ? (
            <div className="text-center p-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune inspection trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Inspecteur</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(inspection.date)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inspection.site.nom}</p>
                        <p className="text-xs text-gray-500">{inspection.site.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{inspection.site.zone || "-"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inspection.inspecteur.name}</p>
                        <p className="text-xs text-gray-500">{inspection.inspecteur.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {inspection.score !== null ? (
                        <span
                          className={`font-bold ${
                            inspection.score >= 80
                              ? "text-green-600"
                              : inspection.score >= 50
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {inspection.score}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUT_LABELS[inspection.statut]?.variant || "outline"}>
                        {STATUT_LABELS[inspection.statut]?.label || inspection.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {inspection._count.inspectionQuestions}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/historique/${inspection.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setPage(pageNum)}
                    isActive={page === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
