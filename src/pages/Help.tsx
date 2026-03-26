import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    ArrowLeft,
    Mail,
    MessageCircle,
    Phone,
    HelpCircle,
    ExternalLink,
    ShieldCheck,
    Zap,
    Clock,
} from "lucide-react";

const Help = () => {
    const navigate = useNavigate();

    const faqs = [
        {
            question: "Comment effectuer une inspection de site ?",
            answer: "Rendez-vous sur la page 'Sites', sélectionnez le site concerné, puis cliquez sur 'Nouvelle Inspection'. Suivez les différentes rubriques du questionnaire (Vidéosurveillance, Accès, etc.) et validez chaque point avant de soumettre le rapport.",
        },
        {
            question: "Comment créer et suivre un plan d'action ?",
            answer: "En cas de non-conformité, un plan d'action peut être généré automatiquement ou manuellement. Vous pouvez suivre l'avancement des tâches assignées dans l'onglet 'Actions', mettre à jour leur statut et ajouter des commentaires.",
        },
        {
            question: "Puis-je utiliser l'application hors-ligne ?",
            answer: "Oui, l'application est une PWA (Progressive Web App). Vous pouvez remplir vos inspections sur le terrain sans connexion Internet. Les données seront synchronisées avec le serveur dès que vous retrouverez du réseau.",
        },
        {
            question: "Comment ajouter des preuves photos ?",
            answer: "Pour chaque question du questionnaire, vous avez la possibilité de prendre une photo en direct ou d'en importer une depuis votre galerie. Ces preuves sont indispensables pour justifier la conformité ou signaler un incident.",
        },
        {
            question: "Qui valide les inspections soumises ?",
            answer: "Une fois soumise, l'inspection est transmise aux administrateurs ou superviseurs de zone pour validation. Vous recevrez une notification en temps réel dès que l'audit est validé ou rejeté.",
        },
    ];

    const contactOptions = [
        {
            icon: MessageCircle,
            label: "Support Technique",
            value: "WhatsApp Business",
            href: "https://wa.me/221770000000",
            color: "bg-orange-500/10 text-sonatel-orange border-sonatel-orange/20",
        },
        {
            icon: Phone,
            label: "Assistance",
            value: "+221 33 800 00 00",
            href: "tel:+221338000000",
            color: "bg-orange-500/10 text-sonatel-orange border-sonatel-orange/20",
        },
        {
            icon: Mail,
            label: "Contact Email",
            value: "support.audit@sonatel.com",
            href: "mailto:support.audit@sonatel.com",
            color: "bg-orange-500/20 text-sonatel-orange border-sonatel-orange/30",
        },
    ];

    return (
        <div className="pb-20">
            <header className="px-4 py-6 border-b border-border/10 bg-background/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/parametres")}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                        Aide & Support
                    </h1>
                </div>
            </header>

            <div className="px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Hero Section */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-2">
                        <HelpCircle className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">Comment pouvons-nous vous aider ?</h2>
                    <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed">
                        Consultez nos questions fréquentes ou contactez notre équipe de support disponible 24h/24.
                    </p>
                </div>

                {/* Quick Support Stats */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { icon: Zap, label: "Rapide", color: "text-amber-500" },
                        { icon: ShieldCheck, label: "Sécurisé", color: "text-emerald-500" },
                        { icon: Clock, label: "24h/7j", color: "text-primary" },
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-2xl border border-white/5">
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Contact Methods */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold px-1">Nous contacter</h3>
                    <div className="grid gap-3">
                        {contactOptions.map((option, i) => (
                            <a
                                key={i}
                                href={option.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-4 p-4 rounded-2xl border ${option.color} transition-all active:scale-[0.98] group`}
                            >
                                <div className={`p-3 rounded-xl bg-background/50`}>
                                    <option.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-0.5">{option.label}</p>
                                    <p className="font-bold text-foreground group-hover:underline">{option.value}</p>
                                </div>
                                <ExternalLink className="w-4 h-4 opacity-30" />
                            </a>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold px-1">Questions fréquentes</h3>
                    <Accordion type="single" collapsible className="w-full space-y-3">
                        {faqs.map((faq, i) => (
                            <AccordionItem
                                key={i}
                                value={`item-${i}`}
                                className="border border-white/5 bg-muted/20 rounded-2xl overflow-hidden px-4"
                            >
                                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-4 text-left leading-relaxed">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-muted-foreground leading-extended pb-4">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>

                {/* Commitment Card */}
                <div className="p-6 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl relative overflow-hidden group">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/20 blur-[60px] rounded-full transition-all group-hover:scale-125 duration-700"></div>
                    <div className="relative z-10 space-y-3">
                        <h4 className="text-lg font-bold flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            Notre engagement
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Notre équipe s'engage à traiter vos remontées terrain et vos besoins de support dans les plus brefs délais. La sécurité de nos sites et l'intégrité de nos infrastructures sont notre priorité absolue.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer info */}
            <div className="px-4 text-center mt-8 cursor-default">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em]">
                    SMARTINSPECT 360 © 2026 - Sonatel Audit Sécurité
                </p>
            </div>
        </div>
    );
};

export default Help;
