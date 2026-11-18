export const queryKeys = {
  dashboard: (userId: string, year: number, month: number) =>
    ["dashboard", userId, year, month] as const,
  dashboardAll: (userId: string) => ["dashboard", userId] as const,
  todos: (userId: string) => ["todos", userId] as const,
  goals: (userId: string) => ["goals", userId] as const,
  habits: (userId: string, start: string, end: string) =>
    ["habits", userId, start, end] as const,
  loans: (userId: string) => ["loans", userId] as const,
  loanRepayments: (userId: string) => ["loan-repayments", userId] as const,
  recurring: (userId: string) => ["recurring", userId] as const,
  gym: (userId: string) => ["gym", userId] as const,
};
