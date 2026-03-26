import React, { useState, useEffect } from "react";
import {
    FileText,
    Plus,
    Trash2,
    Edit2,
    Eye,
    EyeOff,
    ChevronLeft as ChevronLeftIcon,
    Copy,
    History,
    AlertCircle,
    CheckCircle2,
    Settings2,
    ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { questionService, Rubrique, Question, QuestionnaireTemplate, CreateRubriqueData } from "@/services/QuestionService";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function QuestionnaireManager() {
    const [rubriques, setRubriques] = useState<Rubrique[]>([]);
    const [currentTemplate, setCurrentTemplate] = useState<QuestionnaireTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRubriqueNom, setSelectedRubriqueNom] = useState<string | null>(null);
    const [isSnapshotting, setIsSnapshotting] = useState(false);

    // State for Rubrique Dialog (Add / Edit)
    const [isRubriqueModalOpen, setIsRubriqueModalOpen] = useState(false);
    const [rubriqueForm, setRubriqueForm] = useState({ id: "", nom: "", description: "" });
    const [isSavingRubrique, setIsSavingRubrique] = useState(false);

    // State for Question Dialog (Add / Edit)
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [questionForm, setQuestionForm] = useState({ id: "", texte: "", criticite: "MINEUR" as "MINEUR" | "MAJEUR" | "CRITIQUE" });
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [rubRes, tempRes] = await Promise.all([
                questionService.getRubriques(),
                questionService.getCurrentTemplate()
            ]);

            if (rubRes.data) setRubriques(rubRes.data);
            if (tempRes.data) setCurrentTemplate(tempRes.data);
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors du chargement du questionnaire");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateSnapshot = async () => {
        if (!window.confirm("Voulez-vous vraiment créer une nouvelle version du questionnaire ? L'ancienne sera archivée.")) return;

        setIsSnapshotting(true);
        try {
            const res = await questionService.snapshotTemplate();
            if (res.data) {
                toast.success(`Nouvelle version v${res.data.version} créée avec succès`);
                loadData();
            } else {
                toast.error(res.error || "Erreur lors du snapshot");
            }
        } catch (error) {
            toast.error("Erreur serveur lors du snapshot");
        } finally {
            setIsSnapshotting(false);
        }
    };

    const handleSaveRubrique = async () => {
        if (!rubriqueForm.nom.trim()) {
            toast.error("Le nom de la rubrique est requis");
            return;
        }

        setIsSavingRubrique(true);
        try {
            const data = { nom: rubriqueForm.nom.trim() };
            const res = rubriqueForm.id
                ? await questionService.updateRubrique(rubriqueForm.id, data)
                : await questionService.createRubrique(data);

            if (res.data) {
                toast.success(rubriqueForm.id ? "Rubrique mise à jour" : "Rubrique créée");
                setIsRubriqueModalOpen(false);
                setRubriqueForm({ id: "", nom: "", description: "" });
                loadData();
            } else {
                toast.error(res.error || "Erreur lors de l'enregistrement");
            }
        } catch (error) {
            toast.error("Erreur serveur");
        } finally {
            setIsSavingRubrique(false);
        }
    };

    const handleDeleteRubrique = async (id: string, nom: string) => {
        if (!window.confirm(`Voulez-vous supprimer la rubrique "${nom}" ? Les points de contrôle rattachés seront également désactivés.`)) return;

        try {
            const res = await questionService.deleteRubrique(id);
            if (!res.error) {
                toast.success("Rubrique supprimée");
                loadData();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Erreur serveur");
        }
    };

    const handleSaveQuestion = async () => {
        if (!selectedRubrique) return;
        if (!questionForm.texte.trim()) {
            toast.error("Le texte du point de contrôle est requis");
            return;
        }

        setIsSavingQuestion(true);
        try {
            const data: any = {
                texte: questionForm.texte.trim(),
                categorieId: selectedRubrique.id,
                criticite: questionForm.criticite,
                ponderation: questionForm.criticite === 'CRITIQUE' ? 4 : questionForm.criticite === 'MAJEUR' ? 2 : 1,
                typeReponse: 'OUI_NON'
            };

            const res = questionForm.id
                ? await questionService.update(questionForm.id, data)
                : await questionService.create(data);

            if (res.data) {
                toast.success(questionForm.id ? "Point de contrôle modifié" : "Point de contrôle ajouté");
                setIsQuestionModalOpen(false);
                setQuestionForm({ id: "", texte: "", criticite: "MINEUR" });
                loadData();
            } else {
                toast.error(res.error || "Erreur lors de l'enregistrement");
            }
        } catch (error) {
            toast.error("Erreur serveur");
        } finally {
            setIsSavingQuestion(false);
        }
    };

    const handleDeleteQuestion = async (id: string, texte: string) => {
        if (!window.confirm(`Supprimer le point de contrôle : "${texte}" ?`)) return;

        try {
            const res = await questionService.delete(id);
            if (!res.error) {
                toast.success("Point de contrôle supprimé");
                loadData();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Erreur serveur");
        }
    };

    const selectedRubrique = rubriques.find(r => r.nom === selectedRubriqueNom);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Template Info Bar */}
            <div className="bg sonatel-orange/5 border border-sonatel-orange/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sonatel-orange text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <History className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 uppercase leading-none">
                            Version Actuelle : {currentTemplate?.nom || "Audit Standard"}
                            <Badge className="ml-2 bg-sonatel-orange text-white border-none">v{currentTemplate?.version || 1}</Badge>
                        </h4>
                        <p className="text-xs font-bold text-muted-foreground uppercase mt-1 tracking-widest">
                            Dernière mise à jour le {currentTemplate?.updatedAt ? new Date(currentTemplate.updatedAt).toLocaleDateString() : 'NC'}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleCreateSnapshot}
                    disabled={isSnapshotting}
                    className="bg sonatel-orange hover:bg-orange-600 text-white font-black h-12 px-6 rounded-2xl gap-2 shadow-lg shadow-orange-500/20"
                >
                    {isSnapshotting ? "Création..." : <><Copy className="w-4 h-4" /> Versionner (Snapshot)</>}
                </Button>
            </div>

            {!selectedRubriqueNom ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card
                        className="p-8 flex flex-col items-center justify-center text-center space-y-4 bg-white border-2 border-dashed border-sonatel-orange/20 rounded-3xl hover:border-sonatel-orange/50 transition-colors cursor-pointer group"
                        onClick={() => {
                            setRubriqueForm({ id: "", nom: "", description: "" });
                            setIsRubriqueModalOpen(true);
                        }}
                    >
                        <div className="w-16 h-16 rounded-3xl bg-sonatel-light-bg text-sonatel-orange flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900 uppercase tracking-widest">Nouvelle Rubrique</h4>
                            <p className="text-xs font-bold text-muted-foreground mt-1">Ajouter une section au questionnaire</p>
                        </div>
                    </Card>

                    {rubriques.map((rubrique, i) => (
                        <Card
                            key={rubrique.nom}
                            className="p-8 bg-white border-2 border-gray-100 rounded-3xl hover:shadow-lg transition-all"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-sonatel-light-bg rounded-2xl text-sonatel-orange">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-sonatel-orange"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setRubriqueForm({ id: rubrique.id || "", nom: rubrique.nom, description: "" });
                                            setIsRubriqueModalOpen(true);
                                        }}
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteRubrique(rubrique.id || "", rubrique.nom);
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                    <Badge className="bg-sonatel-orange/10 text-sonatel-orange border-none font-black text-[10px] uppercase">
                                        Poids Moyen: {Math.round(rubrique.questions.reduce((acc, q) => acc + q.ponderation, 0) / (rubrique.questions.length || 1))}
                                    </Badge>
                                </div>
                            </div>
                            <h4 className="font-black text-lg text-gray-900 leading-none mb-2 uppercase">{rubrique.nom}</h4>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                {rubrique.questions.length} Points de contrôle
                            </p>
                            <Separator className="my-6 opacity-30" />
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setSelectedRubriqueNom(rubrique.nom)}
                                    className="flex-1 font-black text-[10px] uppercase text-gray-500 hover:text-sonatel-orange h-10 rounded-xl"
                                >
                                    Gérer les points
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="p-2 h-10 rounded-xl text-gray-400 hover:text-sonatel-orange"
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedRubriqueNom(null)}
                                className="p-3 h-12 w-12 rounded-2xl bg-gray-50 hover:bg-sonatel-light-bg hover:text-sonatel-orange text-gray-400"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </Button>
                            <div>
                                <h4 className="font-black text-xl text-gray-900 uppercase leading-none">
                                    {selectedRubriqueNom}
                                </h4>
                                <p className="text-xs font-bold text-muted-foreground uppercase mt-1 tracking-widest">
                                    {selectedRubrique?.questions.length} points de contrôle configurés
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => {
                                setQuestionForm({ id: "", texte: "", criticite: "MINEUR" });
                                setIsQuestionModalOpen(true);
                            }}
                            className="bg sonatel-orange text-white font-black h-12 px-6 rounded-2xl gap-2 shadow-lg shadow-orange-500/20"
                        >
                            <Plus className="w-5 h-5" /> Ajouter un point
                        </Button>
                    </div>

                    <Card className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-50">
                                {selectedRubrique?.questions.length === 0 && (
                                    <div className="p-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                            <FileText className="w-8 h-8 text-gray-200" />
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground">Aucun point de contrôle configuré.</p>
                                    </div>
                                )}
                                {selectedRubrique?.questions.map((q, idx) => (
                                    <div key={q.id} className={`p-6 flex items-center justify-between group hover:bg-gray-50/50 transition-colors ${!q.actif ? "opacity-40" : ""}`}>
                                        <div className="flex items-center gap-6">
                                            <span className="text-xs font-black text-gray-300">{(idx + 1).toString().padStart(2, '0')}</span>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{q.texte}</p>
                                                <div className="flex gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider">
                                                        Poids: {q.ponderation}
                                                    </Badge>
                                                    {!q.actif && <Badge className="bg-gray-100 text-gray-500 border-none text-[9px] font-black uppercase tracking-wider">Masqué</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                className="p-2 h-10 rounded-xl text-gray-400 hover:text-sonatel-orange"
                                                onClick={() => {
                                                    setQuestionForm({ id: q.id, texte: q.texte, criticite: q.criticite as any });
                                                    setIsQuestionModalOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="p-2 h-10 rounded-xl text-gray-400 hover:text-destructive"
                                                onClick={() => handleDeleteQuestion(q.id, q.texte)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modal Ajout/Edit Rubrique */}
            <Dialog open={isRubriqueModalOpen} onOpenChange={setIsRubriqueModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl p-8">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-widest text-xl">
                            {rubriqueForm.id ? "Modifier" : "Nouvelle"} Rubrique
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Configurez la section du questionnaire d'audit.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-sonatel-orange">
                                Nom de la rubrique
                            </Label>
                            <Input
                                id="name"
                                value={rubriqueForm.nom}
                                onChange={(e) => setRubriqueForm({ ...rubriqueForm, nom: e.target.value })}
                                className="h-14 rounded-2xl border-2 border-gray-100 focus:border-sonatel-orange transition-all font-bold"
                                placeholder="Ex: SÉCURITÉ INCENDIE"
                                onKeyDown={(e) => e.key === "Enter" && handleSaveRubrique()}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-start">
                        <Button
                            type="button"
                            className="bg sonatel-orange hover:bg-orange-600 text-white font-black h-12 px-8 rounded-2xl transition-all shadow-lg shadow-orange-500/20"
                            onClick={handleSaveRubrique}
                            disabled={isSavingRubrique}
                        >
                            {isSavingRubrique ? "Enregistrement..." : (rubriqueForm.id ? "MODIFIER" : "CRÉER LA RUBRIQUE")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="font-black text-xs uppercase text-gray-400 hover:text-gray-900 h-12 rounded-2xl"
                            onClick={() => setIsRubriqueModalOpen(false)}
                        >
                            Annuler
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Ajout/Edit Question */}
            <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl p-8">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-widest text-xl">
                            {questionForm.id ? "Modifier" : "Nouveau"} Point de Contrôle
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Configurer une question dans : {selectedRubriqueNom}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="question" className="text-[10px] font-black uppercase tracking-widest text-sonatel-orange">
                                Libellé du point de contrôle
                            </Label>
                            <Input
                                id="question"
                                value={questionForm.texte}
                                onChange={(e) => setQuestionForm({ ...questionForm, texte: e.target.value })}
                                className="h-14 rounded-2xl border-2 border-gray-100 focus:border-sonatel-orange transition-all font-bold"
                                placeholder="Ex: L'agent est-il en tenue correcte ?"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-sonatel-orange">
                                Criticité / Importance
                            </Label>
                            <div className="flex gap-2">
                                {['MINEUR', 'MAJEUR', 'CRITIQUE'].map((lvl) => (
                                    <Button
                                        key={lvl}
                                        type="button"
                                        variant={questionForm.criticite === lvl ? "default" : "outline"}
                                        onClick={() => setQuestionForm({ ...questionForm, criticite: lvl as any })}
                                        className={`flex-1 h-12 rounded-xl font-black text-[10px] transition-all ${questionForm.criticite === lvl ?
                                                (lvl === 'CRITIQUE' ? 'bg-red-500 hover:bg-red-600' : lvl === 'MAJEUR' ? 'bg-orange-500 hover:bg-orange-600 border-none' : 'bg-green-500 hover:bg-green-600')
                                                : 'border-2 text-gray-400'
                                            }`}
                                    >
                                        {lvl}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-start">
                        <Button
                            type="button"
                            className="bg sonatel-orange hover:bg-orange-600 text-white font-black h-12 px-8 rounded-2xl transition-all shadow-lg shadow-orange-500/20"
                            onClick={handleSaveQuestion}
                            disabled={isSavingQuestion}
                        >
                            {isSavingQuestion ? "Enregistrement..." : (questionForm.id ? "MODIFIER LE POINT" : "AJOUTER LE POINT")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="font-black text-xs uppercase text-gray-400 hover:text-gray-900 h-12 rounded-2xl"
                            onClick={() => setIsQuestionModalOpen(false)}
                        >
                            Annuler
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
