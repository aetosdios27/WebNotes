// Extend concepts here. Match accessible names as words, not CSS classes.
export const concepts = {
  theme: ['theme', 'dark', 'light'],
  home: ['home'],
  'sign out': ['sign out', 'log out'],
};
// Selector -> reason. Keep exceptions narrow; title-bar targets cannot be exempted.
export const smallTargetAllowlist: Record<string, string> = {};
