import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Default workspace color mappings (fallback when no DB entry exists)
export const DEFAULT_WORKSPACE_COLORS: Record<string, string> = {
  admin: 'red',
  accounting: 'green',
  personnel: 'magenta',
  main: 'cyan',
  data: 'purple',
  security: 'orange',
};

// Color name to hex/rgb mapping
export const COLOR_MAP: Record<string, { primary: string; rgb: string; dark: string; tw: string }> = {
  // Original Core (23) - Removed 'rose'
  cyan: { primary: '#00ffff', rgb: '0,255,255', dark: '#083344', tw: 'cyan' },
  magenta: { primary: '#ff00ff', rgb: '255,0,255', dark: '#701a75', tw: 'fuchsia' },
  green: { primary: '#22c55e', rgb: '34,197,94', dark: '#14532d', tw: 'green' },
  purple: { primary: '#a855f7', rgb: '168,85,247', dark: '#3b0764', tw: 'purple' },
  orange: { primary: '#ff9900', rgb: '255,153,0', dark: '#7c2d12', tw: 'orange' },
  red: { primary: '#ef4444', rgb: '239,68,68', dark: '#991b1b', tw: 'red' },
  blue: { primary: '#3b82f6', rgb: '59,130,246', dark: '#1e3a5f', tw: 'blue' },
  indigo: { primary: '#6366f1', rgb: '99,102,241', dark: '#312e81', tw: 'indigo' },
  violet: { primary: '#8b5cf6', rgb: '139,92,246', dark: '#4c1d95', tw: 'violet' },
  pink: { primary: '#ec4899', rgb: '236,72,153', dark: '#831843', tw: 'pink' },
  amber: { primary: '#f59e0b', rgb: '245,158,11', dark: '#78350f', tw: 'amber' },
  yellow: { primary: '#eab308', rgb: '234,179,8', dark: '#713f12', tw: 'yellow' },
  lime: { primary: '#84cc16', rgb: '132,204,22', dark: '#365314', tw: 'lime' },
  emerald: { primary: '#10b981', rgb: '16,185,129', dark: '#064e3b', tw: 'emerald' },
  teal: { primary: '#14b8a6', rgb: '20,184,166', dark: '#134e4a', tw: 'teal' },
  sky: { primary: '#0ea5e9', rgb: '14,165,233', dark: '#0c4a6e', tw: 'sky' },
  fuchsia: { primary: '#d946ef', rgb: '217,70,239', dark: '#701a75', tw: 'fuchsia' },
  slate: { primary: '#94a3b8', rgb: '148,163,184', dark: '#1e293b', tw: 'slate' },
  zinc: { primary: '#a1a1aa', rgb: '161,161,170', dark: '#27272a', tw: 'zinc' },
  gold: { primary: '#fbbf24', rgb: '251,191,36', dark: '#78350f', tw: 'amber' },
  coral: { primary: '#fb7185', rgb: '251,113,133', dark: '#881337', tw: 'rose' },
  mint: { primary: '#34d399', rgb: '52,211,153', dark: '#064e3b', tw: 'emerald' },
  electric: { primary: '#818cf8', rgb: '129,140,248', dark: '#312e81', tw: 'indigo' },

  // Grays & White (3)
  white: { primary: '#ffffff', rgb: '255,255,255', dark: '#9ca3af', tw: 'gray' },
  platinum: { primary: '#e5e7eb', rgb: '229,231,235', dark: '#4b5563', tw: 'gray' },
  silver: { primary: '#d1d5db', rgb: '209,213,219', dark: '#374151', tw: 'gray' },

  // New Colors (10)
  tangerine: { primary: '#f97316', rgb: '249,115,22', dark: '#7c2d12', tw: 'orange' },
  lavender: { primary: '#c084fc', rgb: '192,132,252', dark: '#581c87', tw: 'purple' },
  ruby: { primary: '#e11d48', rgb: '225,29,72', dark: '#881337', tw: 'rose' },
  peach: { primary: '#fb923c', rgb: '251,146,60', dark: '#7c2d12', tw: 'orange' },
  lilac: { primary: '#d8b4fe', rgb: '216,180,254', dark: '#4c1d95', tw: 'purple' },
  melon: { primary: '#fca5a5', rgb: '252,165,165', dark: '#7f1d1d', tw: 'red' },
  chartreuse: { primary: '#bfff00', rgb: '191,255,0', dark: '#3f6212', tw: 'lime' },
  azure: { primary: '#007fff', rgb: '0,127,255', dark: '#1e3a8a', tw: 'blue' },
  raspberry: { primary: '#e83f6f', rgb: '232,63,111', dark: '#831843', tw: 'pink' },
  sunflower: { primary: '#ffc300', rgb: '255,195,0', dark: '#713f12', tw: 'yellow' },
};

const LS_WORKSPACE_COLORS_KEY = 'workspace-accent-colors';

// Get color values for a workspace
export function getWorkspaceColor(workspaceSlug: string, customColors: Record<string, string>): { primary: string; rgb: string; dark: string; tw: string; colorName: string } {
  const colorName = customColors[workspaceSlug] || DEFAULT_WORKSPACE_COLORS[workspaceSlug] || 'cyan';
  // Fallback to cyan if the DB has an old color name that was removed (like 'rose' or 'ocean')
  const colorValues = COLOR_MAP[colorName] || COLOR_MAP.cyan;
  return { ...colorValues, colorName };
}

// localStorage helpers (kept as a cache for instant loads)
function loadColorsFromLS(): Record<string, string> {
  try {
    const stored = localStorage.getItem(LS_WORKSPACE_COLORS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveColorsToLS(colors: Record<string, string>) {
  try {
    localStorage.setItem(LS_WORKSPACE_COLORS_KEY, JSON.stringify(colors));
  } catch {}
}

interface WorkspaceColorContextType {
  workspaceColors: Record<string, string>; // slug -> color name
  getColor: (slug: string) => { primary: string; rgb: string; dark: string; tw: string; colorName: string };
  setWorkspaceColor: (slug: string, colorName: string, userId?: string) => Promise<void>;
  isLoading: boolean;
}

const WorkspaceColorContext = createContext<WorkspaceColorContextType>({
  workspaceColors: {},
  getColor: (slug) => getWorkspaceColor(slug, {}),
  setWorkspaceColor: async () => {},
  isLoading: false,
});

export const useWorkspaceColor = () => useContext(WorkspaceColorContext);

export const WorkspaceColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaceColors, setWorkspaceColors] = useState<Record<string, string>>(loadColorsFromLS);
  const [isLoading, setIsLoading] = useState(true);

  // Load all workspace colors from DB, parsing the JSONB column
  const loadColors = useCallback(async () => {
    try {
      // ⚡ FETCH 1: Target your actual workspaces table
      const { data, error } = await supabase
        .schema('app_private')
        .from('workspaces')
        .select('slug, settings');

      if (error) throw error;

      if (data) {
        const colors: Record<string, string> = {};
        
        data.forEach((row: any) => {
          // ⚡ Parse the JSONB settings column safely
          const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});
          if (row.slug && settings.accent_color) {
            colors[row.slug] = settings.accent_color;
          }
        });

        if (Object.keys(colors).length > 0) {
          setWorkspaceColors(colors);
          saveColorsToLS(colors);
        }
      }
    } catch (err) {
      console.warn('Error loading workspace colors from DB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Attempt an initial load
    loadColors();

    // ⚡ FIX: Listen for Supabase auth to finish restoring the session!
    // When the session is ready, re-fetch the colors so they bypass RLS.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        loadColors();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadColors]);

  const getColor = useCallback((slug: string) => {
    return getWorkspaceColor(slug, workspaceColors);
  }, [workspaceColors]);

  const setWorkspaceColor = useCallback(async (slug: string, colorName: string, userId?: string) => {
    // 1. Optimistic UI update (feels instant to the user)
    setWorkspaceColors(prev => {
      const updated = { ...prev, [slug]: colorName };
      saveColorsToLS(updated);
      return updated;
    });

    try {
      // 2. Safe Read-Modify-Write pattern for the JSONB settings column
      const { data: wsData, error: fetchError } = await supabase
        .schema('app_private')
        .from('workspaces')
        .select('id, settings')
        .eq('slug', slug)
        .single();

      if (fetchError) throw fetchError;

      const currentSettings = typeof wsData.settings === 'string' 
        ? JSON.parse(wsData.settings) 
        : (wsData.settings || {});

      // Merge the new accent color into existing settings so we don't wipe anything else
      const newSettings = {
        ...currentSettings,
        accent_color: colorName
      };

      // 3. Save the updated JSON object back to Supabase
      const { error: updateError } = await supabase
        .schema('app_private')
        .from('workspaces')
        .update({ settings: newSettings })
        .eq('id', wsData.id);

      if (updateError) throw updateError;

    } catch (err) {
      console.error('Error persisting workspace color to JSONB settings:', err);
    }
  }, []);

  return (
    <WorkspaceColorContext.Provider value={{ workspaceColors, getColor, setWorkspaceColor, isLoading }}>
      {children}
    </WorkspaceColorContext.Provider>
  );
};