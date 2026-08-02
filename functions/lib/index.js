"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushOnNotification = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
exports.sendPushOnNotification = (0, firestore_1.onDocumentCreated)('notifications/{notifId}', async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const { uid, title, body, link } = data;
    // Look up user's FCM tokens
    const tokenDoc = await (0, firestore_2.getFirestore)().doc(`fcmTokens/${uid}`).get();
    const tokenData = tokenDoc.data();
    if (!(tokenData === null || tokenData === void 0 ? void 0 : tokenData.token))
        return;
    const token = tokenData.token;
    try {
        await (0, messaging_1.getMessaging)().send({
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
    }
    catch (err) {
        // Token might be invalid — remove it
        if (err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token') {
            await (0, firestore_2.getFirestore)().doc(`fcmTokens/${uid}`).delete();
        }
    }
});
//# sourceMappingURL=index.js.map