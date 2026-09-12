import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Set global notification handler behavior (required for local notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useRideNotifications = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [fiveMinWarningId, setFiveMinWarningId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      setHasPermission(finalStatus === 'granted');

      // Android 8.0+ requires a notification channel
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('rides', {
          name: 'Ride Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
        });
      }
    })();
  }, []);

  const triggerBackgroundSummary = async (destination: string, etaMins: number, fare: number, hasPaid: boolean) => {
    if (!hasPermission) return;
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Ride to ${destination} 🚌`,
        body: `${etaMins} mins away • Fare: GHC ${fare.toFixed(2)} (${hasPaid ? 'Paid' : 'Unpaid'})`,
        sound: true,
      },
      trigger: null, // trigger immediately
    });
  };

  const scheduleFiveMinuteWarning = async (etaMins: number) => {
    if (!hasPermission) return;

    // If already under or exactly at 5 mins, don't schedule for the future
    if (etaMins <= 5) return;

    // Schedule for exactly (etaMins - 5) minutes from now
    const triggerInSeconds = (etaMins - 5) * 60;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Approaching Destination 🛑',
        body: 'You are 5 minutes away. Please ensure your fare is paid!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: triggerInSeconds,
      },
    });

    setFiveMinWarningId(id);
  };

  const cancelFiveMinuteWarning = async () => {
    if (fiveMinWarningId) {
      await Notifications.cancelScheduledNotificationAsync(fiveMinWarningId);
      setFiveMinWarningId(null);
    }
  };

  return {
    hasPermission,
    triggerBackgroundSummary,
    scheduleFiveMinuteWarning,
    cancelFiveMinuteWarning,
  };
};
