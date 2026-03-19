import { X, Trophy } from 'lucide-react';
import { useGoalNotification, GoalNotification } from '@/hooks/useGoalNotification';

interface GoalNotificationBannerProps {
  notification: GoalNotification;
  onDismiss: () => void;
}

export function GoalNotificationBanner({
  notification,
  onDismiss,
}: GoalNotificationBannerProps) {
  const bgColor = notification.type === 'monthly'
    ? 'bg-green-50 border-green-200'
    : 'bg-blue-50 border-blue-200';

  const textColor = notification.type === 'monthly'
    ? 'text-green-800'
    : 'text-blue-800';

  const iconColor = notification.type === 'monthly'
    ? 'text-green-600'
    : 'text-blue-600';

  return (
    <div
      className={`
        fixed left-0 right-0 z-50 flex items-center justify-between border-b-2 px-4 py-3 shadow-lg
        ${bgColor}
      `}
    >
      <div className="flex items-center space-x-3">
        <div className={`rounded-full p-2 ${iconColor}`}>
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${textColor}`}>
            {notification.title}
          </h3>
          <p className={`mt-1 text-xs ${textColor}`}>
            {notification.message}
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="rounded-full p-1 transition-colors hover:bg-black hover:bg-opacity-10"
      >
        <X className={`h-4 w-4 ${textColor}`} />
      </button>
    </div>
  );
}

export function GoalNotificationBanners() {
  const {
    notifications,
    showNotifications,
    dismissNotification,
    dismissAllNotifications,
  } = useGoalNotification();

  if (!showNotifications || notifications.length === 0) {
    return null;
  }

  return (
    <>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{ top: `${index * 80}px` }}
        >
          <GoalNotificationBanner
            notification={notification}
            onDismiss={() => dismissNotification(notification.id)}
          />
        </div>
      ))}

      {notifications.length > 1 && (
        <div
          className="fixed right-4 z-50"
          style={{ top: `${notifications.length * 80 + 20}px` }}
        >
          <button
            onClick={dismissAllNotifications}
            className="rounded-md bg-gray-600 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-700"
          >
            Descartar Todas
          </button>
        </div>
      )}
    </>
  );
}
