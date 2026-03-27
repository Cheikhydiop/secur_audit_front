import React, { useState, useRef, useCallback } from "react";
import {
    Check,
    AlertCircle,
    Info,
    ChevronLeft,
    ChevronRight,
    Save,
    AlertTriangle,
    User,
    Mail,
    Calendar,
    ListChecks,
    X,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CameraCapture } from "@/components/CameraCapture";
import { Badge } from "@/components/ui/badge";

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface MobileQuestion {
    text: string;
    helper?: string;
    criticality: string;
    rubriqueId: string;
    rubriqueLabel: string;
}

export interface MobileAnswer {
    status?: "conforme" | "non-conforme" | "na";
    observation?: string;
    recommendation?: string;
    assignee?: string;
    porteurEmail?: string;
    dueDate?: string;
    origine?: string;
    avancement?: string;
    statut_suivi?: string;
    photos?: string[];
    showActionPlan?: boolean;
}

interface Rubrique {
    id: string;
    label: string;
    icon: React.ElementType;
    color?: string;
}

interface Props {
    /* Data */
    rubriques: Rubrique[];
    currentRubriqueIdx: number;
    questions: MobileQuestion[];
    answers: Record<string, MobileAnswer>;
    isLoadingQuestions: boolean;
    stats: { answered: number; total: number; completion: number; percent: number };
    originesAction: string[];
    avancementAction: string[];
    statutAction: string[];
    /* Actions */
    onRubriqueChange: (idx: number) => void;
    onAnswerUpdate: (key: string, patch: Partial<MobileAnswer>) => void;
    onPhotoUpload: (key: string, photos: string[]) => void;
    onPhotoDelete: (url: string) => void;
    onCloseSummary: () => void;
    /* State */
    activeTab: string;
    onTabChange: (tab: string) => void;
}

/* ─── Dots indicator ─────────────────────────────────────────────────────── */
function DotsIndicator({
    total,
    current,
    answered,
    answers,
    rubriqueId,
}: {
    total: number;
    current: number;
    answered: number;
    answers: Record<string, MobileAnswer>;
    rubriqueId: string;
}) {
    const MAX_DOTS = 8;
    const dots = Math.min(total, MAX_DOTS);

    if (total <= MAX_DOTS) {
        return (
            <div className="flex items-center justify-center gap-1.5 py-2">
                {Array.from({ length: total }).map((_, i) => {
                    const key = `${rubriqueId}-${i}`;
                    const ans = answers[key];
                    const isActive = i === current;
                    const status = ans?.status;
                    return (
                        <div
                            key={i}
                            className={`rounded-full transition-all duration-300 ${isActive
                                    ? "w-5 h-2 bg-sonatel-orange"
                                    : status === "conforme"
                                        ? "w-2 h-2 bg-emerald-400"
                                        : status === "non-conforme"
                                            ? "w-2 h-2 bg-red-400"
                                            : status === "na"
                                                ? "w-2 h-2 bg-gray-300"
                                                : "w-2 h-2 bg-gray-200"
                                }`}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-[11px] font-black text-sonatel-orange">
                {current + 1}
            </span>
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-sonatel-orange rounded-full transition-all"
                    style={{ width: `${((current + 1) / total) * 100}%` }}
                />
            </div>
            <span className="text-[11px] font-black text-gray-400">{total}</span>
        </div>
    );
}

/* ─── Action Plan Sheet ──────────────────────────────────────────────────── */
function ActionPlanSheet({
    open,
    onClose,
    onConfirm,
    answer,
    onUpdate,
    origines,
    avancement,
    statuts,
    questionText,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    answer: MobileAnswer;
    onUpdate: (patch: Partial<MobileAnswer>) => void;
    origines: string[];
    avancement: string[];
    statuts: string[];
    questionText: string;
}) {
    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent
                side="bottom"
                className="rounded-t-3xl p-0 border-0 max-h-[88vh] flex flex-col focus:outline-none"
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-3 border-b border-gray-100 shrink-0">
                    {/* Question context (faded) */}
                    <p className="text-xs text-gray-400 font-medium line-clamp-2 mb-3 italic">
                        {questionText}
                    </p>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                                Plan d'action correctif
                            </h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Remplissez rapidement
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Action recommandée */}
                    <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                            Action Recommandée
                        </label>
                        <Textarea
                            placeholder="Décrivez l'action corrective..."
                            value={answer.recommendation ?? ""}
                            onChange={(e) => onUpdate({ recommendation: e.target.value })}
                            className="w-full min-h-[72px] rounded-xl border-gray-200 bg-gray-50 focus:bg-white text-sm font-medium resize-none"
                            autoFocus
                        />
                    </div>

                    {/* Responsable + Échéance */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                Responsable
                            </label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="A. Diallo"
                                    value={answer.assignee ?? ""}
                                    onChange={(e) => onUpdate({ assignee: e.target.value })}
                                    className="w-full pl-8 pr-2 h-10 text-sm font-bold rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-100 bg-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                Échéance
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="date"
                                    value={answer.dueDate ?? ""}
                                    onChange={(e) => onUpdate({ dueDate: e.target.value })}
                                    className="w-full pl-8 pr-2 h-10 text-sm font-bold rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-100 bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                            Email du Responsable
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="email"
                                placeholder="email@sonatel.com"
                                value={answer.porteurEmail ?? ""}
                                onChange={(e) => onUpdate({ porteurEmail: e.target.value })}
                                className="w-full pl-8 pr-2 h-10 text-sm font-bold rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-100 bg-white"
                            />
                        </div>
                    </div>

                    {/* Avancement + Statut */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                Avancement
                            </label>
                            <select
                                value={answer.avancement ?? avancement[3] ?? ""}
                                onChange={(e) => onUpdate({ avancement: e.target.value })}
                                className="w-full h-10 px-2 text-sm font-bold rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-100 bg-white"
                            >
                                {avancement.map((a) => (
                                    <option key={a} value={a}>
                                        {a}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                                Statut
                            </label>
                            <select
                                value={answer.statut_suivi ?? statuts[3] ?? ""}
                                onChange={(e) => onUpdate({ statut_suivi: e.target.value })}
                                className="w-full h-10 px-2 text-sm font-bold rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-100 bg-white"
                            >
                                {statuts.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="px-5 pb-safe pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 shrink-0 bg-white pb-6">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="h-14 rounded-2xl font-black text-sm border-2 border-gray-100"
                    >
                        Ignorer
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="h-14 rounded-2xl bg-sonatel-orange hover:bg-orange-600 font-black text-sm text-white gap-2"
                    >
                        Confirmer <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

/* ─── Single Question Card ───────────────────────────────────────────────── */
function QuestionCard({
    question,
    questionKey,
    index,
    total,
    answer,
    onUpdate,
    onPhotoUpload,
    onPhotoDelete,
    onOpenActionPlan,
    rubrique,
}: {
    question: MobileQuestion;
    questionKey: string;
    index: number;
    total: number;
    answer: MobileAnswer;
    onUpdate: (patch: Partial<MobileAnswer>) => void;
    onPhotoUpload: (photos: string[]) => void;
    onPhotoDelete: (url: string) => void;
    onOpenActionPlan: () => void;
    rubrique: Rubrique;
}) {
    return (
        <div className="flex flex-col h-full px-4 pt-2 pb-4 overflow-y-auto">
            {/* Criticality badge */}
            <div className="mb-3">
                <Badge
                    className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-0 ${question.criticality === "Critique"
                            ? "bg-red-100 text-red-600 animate-pulse"
                            : question.criticality === "Majeur"
                                ? "bg-orange-100 text-orange-600"
                                : "bg-gray-100 text-gray-500"
                        }`}
                >
                    {question.criticality}
                </Badge>
            </div>

            {/* Question text */}
            <p className="text-lg font-black text-gray-900 leading-tight mb-4 flex-shrink-0">
                {question.text}
            </p>

            {/* Helper */}
            {question.helper && (
                <div className="flex gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100/50 mb-4 shrink-0">
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-blue-700 leading-relaxed">
                        {question.helper}
                    </p>
                </div>
            )}

            {/* OUI / NON / N/A — 44px min touch targets */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100/60 rounded-2xl mb-4 shrink-0">
                {[
                    {
                        id: "conforme",
                        label: "Conforme",
                        short: "OUI",
                        icon: Check,
                        active: "bg-emerald-500 text-white shadow-lg shadow-emerald-200/50",
                    },
                    {
                        id: "non-conforme",
                        label: "Non conforme",
                        short: "NON",
                        icon: AlertCircle,
                        active: "bg-red-500 text-white shadow-lg shadow-red-200/50",
                    },
                    {
                        id: "na",
                        label: "Non applicable",
                        short: "N/A",
                        icon: Info,
                        active: "bg-gray-500 text-white shadow-md",
                    },
                ].map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => {
                            onUpdate({ status: opt.id as MobileAnswer["status"] });
                            if (opt.id === "non-conforme") {
                                setTimeout(onOpenActionPlan, 300);
                            }
                        }}
                        aria-pressed={answer.status === opt.id}
                        aria-label={opt.label}
                        className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation min-h-[72px] ${answer.status === opt.id
                                ? opt.active + " scale-[1.03]"
                                : "bg-white text-gray-400"
                            }`}
                    >
                        <opt.icon className="w-6 h-6" />
                        <span className="text-[11px] font-black tracking-widest">
                            {opt.short}
                        </span>
                    </button>
                ))}
            </div>

            {/* Observation */}
            <Textarea
                placeholder="Observation (optionnel)..."
                value={answer.observation ?? ""}
                onChange={(e) => onUpdate({ observation: e.target.value })}
                className="w-full min-h-[64px] rounded-xl border-gray-200 bg-gray-50 focus:bg-white text-sm font-medium resize-none placeholder:text-gray-300 mb-4 shrink-0"
            />

            {/* Action plan recap (if set) */}
            {answer.status === "non-conforme" && answer.recommendation && (
                <button
                    onClick={onOpenActionPlan}
                    className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-left mb-4 active:scale-95 transition-all shrink-0"
                >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">
                            Plan d'action · Taper pour modifier
                        </p>
                        <p className="text-xs font-medium text-red-700 line-clamp-2">
                            {answer.recommendation}
                        </p>
                    </div>
                </button>
            )}

            {/* Non-conforme without action plan yet */}
            {answer.status === "non-conforme" && !answer.recommendation && (
                <button
                    onClick={onOpenActionPlan}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-red-200 text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all mb-4 min-h-[44px] shrink-0"
                >
                    <AlertTriangle className="w-3.5 h-3.5" /> Renseigner le plan d'action
                </button>
            )}

            {/* Photos */}
            <div className="shrink-0">
                <CameraCapture
                    photos={answer.photos || []}
                    onPhotosChange={onPhotoUpload}
                    onPhotoDelete={onPhotoDelete}
                />
            </div>
        </div>
    );
}

/* ─── Main MobileQuestionView ────────────────────────────────────────────── */
export function MobileQuestionView({
    rubriques,
    currentRubriqueIdx,
    questions,
    answers,
    isLoadingQuestions,
    stats,
    originesAction,
    avancementAction,
    statutAction,
    onRubriqueChange,
    onAnswerUpdate,
    onPhotoUpload,
    onPhotoDelete,
    onCloseSummary,
    activeTab,
    onTabChange,
}: Props) {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [actionSheetOpen, setActionSheetOpen] = useState(false);
    const [slideDir, setSlideDir] = useState<"left" | "right">("right");
    const [animating, setAnimating] = useState(false);

    // Touch swipe
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const MIN_SWIPE = 60;

    const currentRubrique = rubriques[currentRubriqueIdx];
    const totalQuestions = questions.length;

    const questionKey = currentRubrique
        ? `${currentRubrique.id}-${currentQuestionIdx}`
        : "";
    const currentAnswer = (answers[questionKey] || {}) as MobileAnswer;

    /* Navigation */
    const animateTo = useCallback(
        (newIdx: number, dir: "left" | "right") => {
            if (animating) return;
            setSlideDir(dir);
            setAnimating(true);
            setTimeout(() => {
                setCurrentQuestionIdx(newIdx);
                setAnimating(false);
            }, 220);
        },
        [animating]
    );

    const gotoPrev = useCallback(() => {
        if (currentQuestionIdx > 0) {
            animateTo(currentQuestionIdx - 1, "right");
        } else if (currentRubriqueIdx > 0) {
            const prevRubIdx = currentRubriqueIdx - 1;
            const prevRubQCount = Object.keys(answers).filter((k) =>
                k.startsWith(rubriques[prevRubIdx].id + "-")
            ).length;
            onRubriqueChange(prevRubIdx);
            setCurrentQuestionIdx(Math.max(0, prevRubQCount - 1));
        }
    }, [
        currentQuestionIdx,
        currentRubriqueIdx,
        animateTo,
        onRubriqueChange,
        answers,
        rubriques,
    ]);

    const gotoNext = useCallback(() => {
        if (currentQuestionIdx < totalQuestions - 1) {
            animateTo(currentQuestionIdx + 1, "left");
        } else if (currentRubriqueIdx < rubriques.length - 1) {
            onRubriqueChange(currentRubriqueIdx + 1);
            setCurrentQuestionIdx(0);
        }
    }, [
        currentQuestionIdx,
        totalQuestions,
        currentRubriqueIdx,
        rubriques.length,
        animateTo,
        onRubriqueChange,
    ]);

    /* Swipe handlers */
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        touchEndX.current = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX.current;
        if (Math.abs(diff) > MIN_SWIPE) {
            if (diff > 0) gotoNext();
            else gotoPrev();
        }
    };

    /* Reset question index when rubrique changes */
    React.useEffect(() => {
        setCurrentQuestionIdx(0);
    }, [currentRubriqueIdx]);

    const isFirst = currentQuestionIdx === 0 && currentRubriqueIdx === 0;
    const isLast =
        currentQuestionIdx === totalQuestions - 1 &&
        currentRubriqueIdx === rubriques.length - 1;

    /* ── Tab: Rubriques view ─────────────────────────────────────────────── */
    if (activeTab === "rubriques") {
        return (
            <div className="flex flex-col h-full bg-white">
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">
                                Vue Rubriques
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Progression globale
                            </p>
                        </div>
                        <span className="text-2xl font-black text-sonatel-orange">
                            {stats.percent}%
                        </span>
                    </div>
                    {/* Global progress bar */}
                    <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-sonatel-orange to-orange-400 rounded-full transition-all duration-700"
                            style={{ width: `${stats.completion}%` }}
                        />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 text-right">
                        {stats.answered} / {stats.total} points
                    </p>
                </div>

                {/* Rubrique list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                    {rubriques.map((r, idx) => {
                        const qCount =
                            Object.keys(answers).filter((k) =>
                                k.startsWith(r.id + "-")
                            ).length || 0;
                        const aCount = Object.entries(answers)
                            .filter(([k]) => k.startsWith(r.id + "-"))
                            .filter(([, v]) => v?.status).length;
                        const done = qCount > 0 && aCount === qCount;
                        const isActive = idx === currentRubriqueIdx;
                        const prog = qCount > 0 ? (aCount / qCount) * 100 : 0;

                        return (
                            <button
                                key={r.id}
                                onClick={() => {
                                    onRubriqueChange(idx);
                                    setCurrentQuestionIdx(0);
                                    onTabChange("questionnaire");
                                }}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${isActive
                                        ? "bg-sonatel-orange/5 ring-2 ring-sonatel-orange/25"
                                        : "bg-gray-50"
                                    }`}
                            >
                                {/* Icon */}
                                <div
                                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isActive
                                            ? "bg-sonatel-orange text-white"
                                            : done
                                                ? "bg-emerald-500 text-white"
                                                : "bg-white border-2 border-gray-100 text-gray-300"
                                        }`}
                                >
                                    {done && !isActive ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <r.icon className="w-5 h-5" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 text-left min-w-0">
                                    <p
                                        className={`text-sm font-black uppercase tracking-tight truncate ${isActive
                                                ? "text-sonatel-orange"
                                                : done
                                                    ? "text-emerald-700"
                                                    : "text-gray-700"
                                            }`}
                                    >
                                        {r.label}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${done ? "bg-emerald-500" : "bg-sonatel-orange"
                                                    }`}
                                                style={{ width: `${prog}%` }}
                                            />
                                        </div>
                                        <span
                                            className={`text-[11px] font-black tabular-nums shrink-0 ${done
                                                    ? "text-emerald-600"
                                                    : isActive
                                                        ? "text-sonatel-orange"
                                                        : "text-gray-400"
                                                }`}
                                        >
                                            {aCount}/{qCount}
                                        </span>
                                    </div>
                                </div>

                                {done && (
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                    </div>
                                )}
                                {isActive && !done && (
                                    <ChevronRight className="w-4 h-4 text-sonatel-orange shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer CTA */}
                <div className="p-4 border-t border-gray-100">
                    <Button
                        onClick={onCloseSummary}
                        className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest gap-2"
                    >
                        <Save className="w-4 h-4" /> Clôturer l'Inspection
                    </Button>
                </div>
            </div>
        );
    }

    /* ── Tab: Questionnaire (one question per screen) ────────────────────── */
    return (
        <div
            className="flex flex-col bg-[#FDFDFD]"
            style={{ height: "calc(100dvh - 56px)" }}
        >
            {/* ── Top bar: rubrique + progress + nav ── */}
            <div className="bg-white border-b border-gray-100 px-3 py-2 shrink-0">
                {/* Progress line */}
                <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                        className="h-full bg-sonatel-orange rounded-full transition-all duration-700"
                        style={{ width: `${stats.completion}%` }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Prev — 44px */}
                    <button
                        onClick={gotoPrev}
                        disabled={isFirst}
                        aria-label="Question précédente"
                        className="min-w-[44px] min-h-[44px] rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-25 active:scale-95 transition-all shrink-0"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Rubrique pill — tap → vue rubriques */}
                    <button
                        onClick={() => onTabChange("rubriques")}
                        aria-label="Voir toutes les rubriques"
                        className="flex-1 flex items-center gap-2 min-w-0 bg-orange-50/60 rounded-xl px-2.5 py-2 active:bg-orange-100/60 transition-colors"
                    >
                        {currentRubrique && (
                            <div className="w-7 h-7 rounded-lg bg-sonatel-orange flex items-center justify-center shrink-0">
                                <currentRubrique.icon className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                            <div className="text-[9px] font-black text-sonatel-orange uppercase tracking-widest leading-none">
                                {currentRubriqueIdx + 1}/{rubriques.length} rubriques ·{" "}
                                {stats.completion}%
                            </div>
                            <div className="text-xs font-black text-gray-900 truncate leading-tight mt-0.5">
                                {currentRubrique?.label ?? "—"}
                            </div>
                        </div>
                        <ListChecks className="w-4 h-4 text-sonatel-orange shrink-0" />
                    </button>

                    {/* Question counter */}
                    <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg px-2 py-1 shrink-0">
                        <span className="text-[11px] font-black text-sonatel-orange">
                            {currentQuestionIdx + 1}
                        </span>
                        <span className="text-[11px] text-gray-300 font-black">/</span>
                        <span className="text-[11px] font-black text-gray-400">
                            {totalQuestions}
                        </span>
                    </div>

                    {/* Next — 44px */}
                    <button
                        onClick={gotoNext}
                        disabled={isLast}
                        aria-label="Question suivante"
                        className="min-w-[44px] min-h-[44px] rounded-xl bg-sonatel-orange flex items-center justify-center text-white disabled:opacity-25 active:scale-95 transition-all shrink-0"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ── Question area — swipeable ── */}
            <div
                className="flex-1 overflow-hidden relative"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {isLoadingQuestions ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-12 h-12 border-4 border-sonatel-orange border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-bold text-gray-400 animate-pulse">
                            Chargement...
                        </p>
                    </div>
                ) : totalQuestions === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <Check className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
                            Aucune question dans cette rubrique
                        </p>
                    </div>
                ) : (
                    <div
                        className={`absolute inset-0 transition-transform duration-200 ease-out ${animating
                                ? slideDir === "left"
                                    ? "-translate-x-6 opacity-0"
                                    : "translate-x-6 opacity-0"
                                : "translate-x-0 opacity-100"
                            }`}
                        style={{ transition: "transform 0.2s ease-out, opacity 0.2s" }}
                    >
                        <QuestionCard
                            question={questions[currentQuestionIdx]}
                            questionKey={questionKey}
                            index={currentQuestionIdx}
                            total={totalQuestions}
                            answer={currentAnswer}
                            onUpdate={(patch) => onAnswerUpdate(questionKey, patch)}
                            onPhotoUpload={(photos) => onPhotoUpload(questionKey, photos)}
                            onPhotoDelete={onPhotoDelete}
                            onOpenActionPlan={() => setActionSheetOpen(true)}
                            rubrique={currentRubrique}
                        />
                    </div>
                )}
            </div>

            {/* ── Dots / progress indicator ── */}
            {totalQuestions > 0 && currentRubrique && (
                <div className="bg-white border-t border-gray-50 py-1 shrink-0">
                    <DotsIndicator
                        total={totalQuestions}
                        current={currentQuestionIdx}
                        answered={stats.answered}
                        answers={answers}
                        rubriqueId={currentRubrique.id}
                    />
                    <p className="text-center text-[9px] font-bold text-gray-300 uppercase tracking-widest pb-1">
                        ← glisser pour naviguer →
                    </p>
                </div>
            )}

            {/* ── Action Plan Bottom Sheet ── */}
            {questions[currentQuestionIdx] && (
                <ActionPlanSheet
                    open={actionSheetOpen}
                    onClose={() => setActionSheetOpen(false)}
                    onConfirm={() => setActionSheetOpen(false)}
                    answer={currentAnswer}
                    onUpdate={(patch) => onAnswerUpdate(questionKey, patch)}
                    origines={originesAction}
                    avancement={avancementAction}
                    statuts={statutAction}
                    questionText={questions[currentQuestionIdx]?.text ?? ""}
                />
            )}
        </div>
    );
}
