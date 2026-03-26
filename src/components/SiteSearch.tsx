import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { siteService, SiteQuickSearch } from '@/services/SiteService';
import { useToast } from '@/hooks/use-toast';

interface SiteSearchProps {
  onSelect: (site: SiteQuickSearch) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SiteSearch({ onSelect, placeholder = 'Rechercher un site...', disabled = false }: SiteSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SiteQuickSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await siteService.quickSearch(query, 10);
        if (response.data) {
          setResults(response.data);
          setOpen(true);
        } else {
          toast({
            title: 'Erreur',
            description: response.error || 'Erreur lors de la recherche',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de rechercher les sites',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, toast]);

  const handleSelect = useCallback((site: SiteQuickSearch) => {
    setOpen(false);
    setQuery('');
    onSelect(site);
  }, [onSelect]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          onFocus={() => query.trim() && setOpen(true)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((site) => (
            <button
              key={site.id}
              onClick={() => handleSelect(site)}
              className="w-full px-4 py-3 text-left hover:bg-accent flex items-start gap-3 border-b last:border-b-0 transition-colors"
            >
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{site.nom}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {site.code} • {site.zone} • {site.localisation}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
          Aucun site trouvé pour "{query}"
        </div>
      )}
    </div>
  );
}

export default SiteSearch;
