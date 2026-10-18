export interface CategoryDefinition {
  id: 'marmitex' | 'bebidas' | 'porcoes' | 'sobremesas' | 'outros';
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  color: string;
  bgLight: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
}

export const PRODUCT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'marmitex',
    label: 'Marmitex & Pratos Feitos',
    shortLabel: 'Marmitex',
    icon: '🍱',
    description: 'Marmitex P/M/G, PF, Almoço no KG, Executivos',
    color: 'emerald',
    bgLight: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    id: 'bebidas',
    label: 'Bebidas & Refrigerantes',
    shortLabel: 'Bebidas',
    icon: '🥤',
    description: 'Refrigerantes, Sucos, Águas, Cervejas, Latas',
    color: 'blue',
    bgLight: 'bg-blue-50',
    borderClass: 'border-blue-300',
    textClass: 'text-blue-800',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    id: 'porcoes',
    label: 'Porções & Petiscos',
    shortLabel: 'Porções',
    icon: '🍟',
    description: 'Batata frita, Calabresa, Mandioca, Petiscos',
    color: 'amber',
    bgLight: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-800',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  {
    id: 'sobremesas',
    label: 'Sobremesas & Doces',
    shortLabel: 'Sobremesas',
    icon: '🍰',
    description: 'Pudim, Mousse, Bolos, Doces caseiros',
    color: 'rose',
    bgLight: 'bg-rose-50',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-800',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  {
    id: 'outros',
    label: 'Outros / Diversos',
    shortLabel: 'Outros',
    icon: '🏷️',
    description: 'Embalagens extras, Café, Balas, Confeitaria',
    color: 'purple',
    bgLight: 'bg-purple-50',
    borderClass: 'border-purple-300',
    textClass: 'text-purple-800',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
  },
];

export function getCategoryMeta(catId: string): CategoryDefinition {
  const found = PRODUCT_CATEGORIES.find((c) => c.id === catId);
  if (found) return found;

  return {
    id: 'outros',
    label: catId,
    shortLabel: catId,
    icon: '🏷️',
    description: 'Diversos',
    color: 'slate',
    bgLight: 'bg-slate-50',
    borderClass: 'border-slate-300',
    textClass: 'text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  };
}
