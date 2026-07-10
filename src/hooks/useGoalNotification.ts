import { useState, useEffect, useCallback } from 'react';
import { calendarService } from '../services/calendarService';
import accountService, { APIAccount } from '../services/accountService';

export interface GoalNotification {
  id: string;
  type: 'monthly' | 'biweekly';
  title: string;
  message: string;
  amount: number;
  percentage: number;
  achieved_at: string;
  dismissed: boolean;
}

interface UseGoalNotificationReturn {
  notifications: GoalNotification[];
  showNotifications: boolean;
  dismissNotification: (id: string) => void;
  dismissAllNotifications: () => void;
  checkGoals: () => Promise<void>;
}

const dismissedGoalsMemory = new Set<string>();

export function useGoalNotification(): UseGoalNotificationReturn {
  const [notifications, setNotifications] = useState<GoalNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [accounts, setAccounts] = useState<APIAccount[]>([]);

  const loadAccounts = useCallback(async () => {
    try {
      const accountsList = await accountService.listAccounts();
      setAccounts(accountsList);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  }, []);

  const checkGoals = useCallback(async () => {
    if (accounts.length === 0) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const newNotifications: GoalNotification[] = [];

    for (const account of accounts) {
      try {
        const monthlyGoal = await calendarService.checkGoalReached(
          currentYear,
          currentMonth,
          account.id
        );

        if (monthlyGoal.monthly && monthlyGoal.monthly.achieved) {
          const notificationId = `monthly_${account.id}_${currentYear}_${currentMonth}`;
          if (!dismissedGoalsMemory.has(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'monthly',
              title: 'Meta Mensal Atingida!',
              message: `Parabéns! Você atingiu sua meta mensal de ${monthlyGoal.monthly.goal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
              amount: monthlyGoal.monthly.goal,
              percentage: monthlyGoal.monthly.percentage,
              achieved_at: new Date().toISOString(),
              dismissed: false,
            });
          }
        }

        if (monthlyGoal.biweekly && monthlyGoal.biweekly.achieved) {
          const notificationId = `biweekly_${account.id}_${currentYear}_${currentMonth}_${Math.ceil(currentMonth / 2)}`;
          if (!dismissedGoalsMemory.has(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'biweekly',
              title: 'Meta Quinzenal Atingida!',
              message: `Excelente! Você atingiu sua meta quinzenal de ${monthlyGoal.biweekly.goal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
              amount: monthlyGoal.biweekly.goal,
              percentage: monthlyGoal.biweekly.percentage,
              achieved_at: new Date().toISOString(),
              dismissed: false,
            });
          }
        }
      } catch (error) {
        console.error('Error checking goals for account:', account.id, error);
      }
    }

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...prev, ...newNotifications]);
      setShowNotifications(true);
    }
  }, [accounts]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void checkGoals();
    const interval = setInterval(() => {
      void checkGoals();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkGoals]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    dismissedGoalsMemory.add(id);
  }, []);

  const dismissAllNotifications = useCallback(() => {
    notifications.forEach((n) => dismissedGoalsMemory.add(n.id));
    setNotifications([]);
    setShowNotifications(false);
  }, [notifications]);

  return {
    notifications,
    showNotifications,
    dismissNotification,
    dismissAllNotifications,
    checkGoals,
  };
}
