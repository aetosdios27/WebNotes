// Extend concepts here. Match accessible names as words, not CSS classes.
export const concepts = {
  theme: ['theme', 'dark', 'light'],
  home: ['home'],
  'sign out': ['sign out', 'log out'],
};
// Selector -> reason. Keep exceptions narrow; title-bar targets cannot be exempted.
export const smallTargetAllowlist: Record<string, string> = {};
// Label -> reason. Title-bar controls whose whole purpose is to navigate.
export const navigationAllowlist: Record<string, string> = {
  'Sign in': 'Opens the sign-in page; leaving the wall is what it is for.',
};
