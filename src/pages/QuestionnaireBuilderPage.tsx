import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  GripVertical, 
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  adminQuestionnaireService, 
  Rubrique, 
  Question,
  CreateRubriqueData,
  UpdateRubriqueData,
  CreateQuestionData,
  UpdateQuestionData
} from '@/services/AdminQuestionnaireService';

// Criticite options
const CRITICITE_OPTIONS = [
  { value: 'MINEUR', label: 'Mineur', color: 'bg-green-500' },
  { value: 'MAJEUR', label: 'Majeur', color: 'bg-orange-500' },
  { value: 'CRITIQUE', label: 'Critique', color: 'bg-red-500' },
] as const;

type CriticiteType = 'CRITIQUE' | 'MAJEUR' | 'MINEUR';

const QuestionnaireBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State for modals
  const [isRubriqueDialogOpen, setIsRubriqueDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingRubrique, setEditingRubrique] = useState<Rubrique | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedRubriqueId, setSelectedRubriqueId] = useState<string | null>(null);
  
  // Form state
  const [rubriqueForm, setRubriqueForm] = useState<CreateRubriqueData>({
    nom: '',
    description: '',
    ordre: 0
  });
  
  const [questionForm, setQuestionForm] = useState<CreateQuestionData>({
    texte: '',
    categorieId: '',
    helper: '',
    ponderation: 1,
    criticite: 'MINEUR',
    ordre: 0
  });

  // Fetch rubriques with questions
  const { data: rubriquesData, isLoading, refetch } = useQuery({
    queryKey: ['adminRubriques'],
    queryFn: async () => {
      const response = await adminQuestionnaireService.getRubriques();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    }
  });

  // Mutations
  const createRubriqueMutation = useMutation({
    mutationFn: (data: CreateRubriqueData) => adminQuestionnaireService.createRubrique(data),
    onSuccess: (response) => {
      if (!response.error) {
        toast.success('Rubrique créée avec succès');
        queryClient.invalidateQueries({ queryKey: ['adminRubriques'] });
        setIsRubriqueDialogOpen(false);
        resetRubriqueForm();
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création de la rubrique');
    }
  });

  const updateRubriqueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRubriqueData }) => 
      adminQuestionnaireService.updateRubrique(id, data),
    onSuccess: (response) => {
      if (!response.error) {
        toast.success('Rubrique mise à jour');
        queryClient.invalidateQueries({ queryKey: ['adminRubriques'] });
        setIsRubriqueDialogOpen(false);
        setEditingRubrique(null);
        resetRubriqueForm();
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    }
  });

  const deleteRubriqueMutation = useMutation({
    mutationFn: (id: string) => adminQuestionnaireService.deleteRubrique(id),
    onSuccess: (response) => {
      if (!response.error) {
        toast.success('Rubrique désactivée (soft delete)');
        queryClient.invalidateQueries({ queryKey: ['adminRubriques'] });
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  });

  const createQuestionMutation = useMutation({
    mutationFn: (data: CreateQuestionData) => adminQuestionnaireService.createQuestion(data),
    onSuccess: (response) => {
      if (!response.error) {
        toast.success('Question créée');
        queryClient.invalidateQueries({ queryKey: ['adminRubriques'] });
        setIsQuestionDialogOpen(false);
        resetQuestionForm();
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuestionData }) => 
      adminQuestionnaireService.updateQuestion(id, data),
    onSuccess: (response) => {
      if (!response.error) {
        toast.success('Question mise à jour');
        queryClient.invalidateQueries({ queryKey: ['adminRubriques'] });
        setIsQuestionDialogOpen(false);
        setEditingQuestion(null);
        resetQuestionForm();
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => adminQuestionnaireService.deleteQuestion(id),
    onSuccess: (response) => {
      if (!response.error) {
        toast.success('Question désactivée');
        queryClient.invalidateQueries({ queryKey: ['adminRubriques'] });
      } else {
        toast.error(response.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  });

  const reorderMutation = useMutation({
    mutationFn: ({ categorieId, orderedIds }: { categorieId: string; orderedIds: string[] }) =>
      adminQuestionnaireService.reorderQuestions(categorieId, orderedIds),
    onSuccess: (response) => {
      if (!response.error) {
        toast.success('Ordre mis à jour');
        queryClient.invalidateQueries({ queryKey: ['adminRubriques'] });
      }
    }
  });

  const snapshotMutation = useMutation({
    mutationFn: () => adminQuestionnaireService.createSnapshot(),
    onSuccess: (response) => {
      if (!response.error && response.data) {
        toast.success(`Nouvelle version du questionnaire créée (v${response.data.version})`);
      } else {
        toast.error(response.error || 'Erreur lors de la création de la version');
      }
    }
  });

  const createInitialTemplateMutation = useMutation({
    mutationFn: () => adminQuestionnaireService.createInitialTemplate(),
    onSuccess: (response) => {
      if (!response.error && response.data) {
        toast.success(`Template initial créé (v${response.data.version})`);
        queryClient.invalidateQueries({ queryKey: ['adminRubriques'] });
      } else {
        toast.error(response.error || 'Erreur lors de la création du template');
      }
    }
  });

  // Helper functions
  const resetRubriqueForm = () => {
    setRubriqueForm({ nom: '', description: '', ordre: 0 });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      texte: '',
      categorieId: '',
      helper: '',
      ponderation: 1,
      criticite: 'MINEUR',
      ordre: 0
    });
  };

  const openNewRubriqueDialog = () => {
    setEditingRubrique(null);
    resetRubriqueForm();
    setIsRubriqueDialogOpen(true);
  };

  const openEditRubriqueDialog = (rubrique: Rubrique) => {
    setEditingRubrique(rubrique);
    setRubriqueForm({
      nom:rubrique.nom,
      description:rubrique.description || '',
      ordre:rubrique.ordre
    });
    setIsRubriqueDialogOpen(true);
  };

  const openNewQuestionDialog = (rubriqueId: string) => {
    setEditingQuestion(null);
    setSelectedRubriqueId(rubriqueId);
    resetQuestionForm();
    setQuestionForm(prev => ({ ...prev, categorieId:rubriqueId }));
    setIsQuestionDialogOpen(true);
  };

  const openEditQuestionDialog = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      texte: question.texte,
      categorieId: question.categorieId || '',
      helper: question.helper || '',
      ponderation: question.ponderation,
      criticite: question.criticite,
      ordre: question.ordre
    });
    setIsQuestionDialogOpen(true);
  };

  const handleSaveRubrique = () => {
    if (!rubriqueForm.nom.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }
    
    if (editingRubrique) {
      updateRubriqueMutation.mutate({ 
        id: editingRubrique.id, 
        data:rubriqueForm 
      });
    } else {
      createRubriqueMutation.mutate(rubriqueForm);
    }
  };

  const handleSaveQuestion = () => {
    if (!questionForm.texte.trim() || !questionForm.categorieId) {
      toast.error('Le texte et la catégorie sont requis');
      return;
    }
    
    if (editingQuestion) {
      updateQuestionMutation.mutate({ 
        id: editingQuestion.id, 
        data: questionForm 
      });
    } else {
      createQuestionMutation.mutate(questionForm);
    }
  };

  const handleToggleQuestionActive = (question: Question) => {
    updateQuestionMutation.mutate({
      id: question.id,
      data: { actif: !question.actif }
    });
  };

  const getCriticiteColor = (criticite: CriticiteType) => {
    const option = CRITICITE_OPTIONS.find(o => o.value === criticite);
    return option?.color || 'bg-gray-500';
  };

  const getCriticiteLabel = (criticite: CriticiteType) => {
    const option = CRITICITE_OPTIONS.find(o => o.value === criticite);
    return option?.label || criticite;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sonatel-orange"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Questionnaire Builder</h1>
          <p className="text-muted-foreground">
            Gérez les rubriques et questions du questionnaire d'audit
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button 
            variant="outline"
            onClick={() => createInitialTemplateMutation.mutate()}
            disabled={createInitialTemplateMutation.isPending}
            title="Créer le template initial"
          >
            <Save className="w-4 h-4 mr-2" />
            Init Template
          </Button>
          <Button 
            variant="outline"
            onClick={() => snapshotMutation.mutate()}
            disabled={snapshotMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Créer une version
          </Button>
          <Button onClick={openNewRubriqueDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Rubrique
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rubriques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rubriquesData?.filter((r: Rubrique) => r.actif).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Questions totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rubriquesData?.reduce((acc: number, r: Rubrique) => 
                acc + (r.questions?.length || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Questions actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rubriquesData?.reduce((acc: number, r: Rubrique) => 
                acc + (r.questions?.filter((q: Question) => q.actif).length || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {rubriquesData?.filter((r: Rubrique) => r.actif).map((rubrique: Rubrique) => (
          <Card key={rubrique.id} className={!rubrique.actif ? 'opacity-50' : ''}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{rubrique.nom}</CardTitle>
                <Badge variant="outline">
                  {rubrique.questions?.filter((q: Question) => q.actif).length || 0} questions
                </Badge>
                {!rubrique.actif && (
                  <Badge variant="secondary">Désactivée</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => openNewQuestionDialog(rubrique.id)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => openEditRubriqueDialog(rubrique)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir désactiver cette rubrique?')) {
                      deleteRubriqueMutation.mutate(rubrique.id);
                    }
                  }}
                  disabled={deleteRubriqueMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            {rubrique.description && (
              <CardDescription className="px-6 pb-2">
                {rubrique.description}
              </CardDescription>
            )}
            <CardContent>
              {rubrique.questions &&rubrique.questions.length > 0 ? (
                <div className="space-y-2">
                  {rubrique.questions
                    .sort((a: Question, b: Question) => a.ordre - b.ordre)
                    .map((question: Question) => (
                      <div 
                        key={question.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          question.actif ? 'bg-background' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          <div className="flex-1">
                            <p className={`text-sm ${!question.actif ? 'line-through text-muted-foreground' : ''}`}>
                              {question.texte}
                            </p>
                            {question.helper && (
                              <p className="text-xs text-muted-foreground mt-1">
                                💡 {question.helper}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getCriticiteColor(question.criticite)}>
                            {getCriticiteLabel(question.criticite)}
                          </Badge>
                          <Badge variant="outline">
                            Pondération: {question.ponderation}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={question.actif}
                              onCheckedChange={() => handleToggleQuestionActive(question)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {question.actif ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditQuestionDialog(question)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir désactiver cette question?')) {
                                deleteQuestionMutation.mutate(question.id);
                              }
                            }}
                            disabled={deleteQuestionMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Aucune question dans cette rubrique</p>
                  <Button 
                    variant="link" 
                    onClick={() => openNewQuestionDialog(rubrique.id)}
                  >
                    Ajouter une question
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {(!rubriquesData || rubriquesData.filter((r: Rubrique) => r.actif).length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">Aucune rubrique trouvée</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer votre première catégorie
              </p>
              <Button onClick={openNewRubriqueDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une Rubrique
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rubrique Dialog */}
      <Dialog open={isRubriqueDialogOpen} onOpenChange={setIsRubriqueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRubrique ? 'Modifier la Rubrique' : 'Nouvelle Rubrique'}
            </DialogTitle>
            <DialogDescription>
              {editingRubrique 
                ? 'Modifiez les détails de la catégorie' 
                : 'Créez une nouvelle catégorie pour le questionnaire'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rubrique-nom">Nom de la catégorie *</Label>
              <Input
                id="rubrique-nom"
                value={rubriqueForm.nom}
                onChange={(e) => setRubriqueForm({ ...rubriqueForm, nom: e.target.value })}
                placeholder="Ex: Sécurité Physique"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rubrique-description">Description</Label>
              <Textarea
                id="rubrique-description"
                value={rubriqueForm.description}
                onChange={(e) => setRubriqueForm({ ...rubriqueForm, description: e.target.value })}
                placeholder="Description optionnelle..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rubrique-ordre">Ordre d'affichage</Label>
              <Input
                id="rubrique-ordre"
                type="number"
                value={rubriqueForm.ordre}
                onChange={(e) => setRubriqueForm({ ...rubriqueForm, ordre: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRubriqueDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveRubrique}
              disabled={createRubriqueMutation.isPending || updateRubriqueMutation.isPending}
            >
              {createRubriqueMutation.isPending || updateRubriqueMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Modifier la Question' : 'Nouvelle Question'}
            </DialogTitle>
            <DialogDescription>
              {editingQuestion 
                ? 'Modifiez les détails de la question' 
                : 'Ajoutez une nouvelle question au questionnaire'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question-texte">Question *</Label>
              <Textarea
                id="question-texte"
                value={questionForm.texte}
                onChange={(e) => setQuestionForm({ ...questionForm, texte: e.target.value })}
                placeholder="Entrez le texte de la question..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="question-helper">Aide / Commentaire</Label>
              <Input
                id="question-helper"
                value={questionForm.helper}
                onChange={(e) => setQuestionForm({ ...questionForm, helper: e.target.value })}
                placeholder="Indice pour l'inspecteur..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="question-criticite">Criticité *</Label>
                <Select
                  value={questionForm.criticite}
                  onValueChange={(value: CriticiteType) => 
                    setQuestionForm({ ...questionForm, criticite: value })
                  }
                >
                  <SelectTrigger id="question-criticite">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITICITE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${option.color}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-ponderation">Pondération</Label>
                <Input
                  id="question-ponderation"
                  type="number"
                  value={questionForm.ponderation}
                  onChange={(e) => setQuestionForm({ 
                    ...questionForm, 
                    ponderation: parseInt(e.target.value) || 1 
                  })}
                  min={1}
                  max={10}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="question-ordre">Ordre d'affichage</Label>
              <Input
                id="question-ordre"
                type="number"
                value={questionForm.ordre}
                onChange={(e) => setQuestionForm({ 
                  ...questionForm, 
                  ordre: parseInt(e.target.value) || 0 
                })}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveQuestion}
              disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
            >
              {createQuestionMutation.isPending || updateQuestionMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionnaireBuilderPage;
