import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export const sendPushOnNotification = onDocumentCreated(
  'notifications/{notifId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { uid, title, body, link } = data;

    // Look up user's FCM tokens
    const tokenDoc = await getFirestore().doc(`fcmTokens/${uid}`).get();
    const tokenData = tokenDoc.data();
    if (!tokenData?.token) return;

    const token = tokenData.token;

    try {
      await getMessaging().send({
        token,
        notification: {
          title: title || 'STand',
          body: body || 'You have a new notification',
        },
        data: {
          url: link || '/',
        },
        webpush: {
          fcmOptions: {
            link: link || '/',
          },
          notification: {
            icon: '/icon-512.png',
            badge: '/icon-192.png',
          },
        },
      });
    } catch (err: any) {
      // Token might be invalid — remove it
      if (err.code === 'messaging/registration-token-not-registered' ||
          err.code === 'messaging/invalid-registration-token') {
        await getFirestore().doc(`fcmTokens/${uid}`).delete();
      }
    }
  }
);
