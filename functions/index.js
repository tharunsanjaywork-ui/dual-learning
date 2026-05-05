const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 1. Send Background Notification for New Messages
exports.sendMessageNotification = functions.firestore
  .document('messages/{chatId}/msgs/{msgId}')
  .onCreate(async (snap, context) => {
    const msg = snap.data();
    if (!msg.senderId) return;
    
    // Get chat to find the other participant (recipient)
    const chatId = context.params.chatId;
    const chatDoc = await admin.firestore().doc(`chats/${chatId}`).get();
    const chat = chatDoc.data();
    if (!chat || !chat.participants) return;
    
    const recipientId = chat.participants.find(id => id !== msg.senderId);
    if (!recipientId) return;
    
    // Get recipient's FCM token
    const recipientDoc = await admin.firestore().doc(`users/${recipientId}`).get();
    const fcmToken = recipientDoc.data()?.fcmToken;
    
    if (!fcmToken) return;
    
    // Send DATA-ONLY push notification to trigger the Service Worker
    // The service worker will show the disguised notification
    try {
      await admin.messaging().send({
        token: fcmToken,
        data: {
          type: 'message',
          title: 'Dual Zone',
          body: 'Update, there is an update',
          url: '/study/jee-mains' // Direct redirect to education page
        }
      });
      console.log('Successfully sent message notification to:', recipientId);
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  });

// 2. Send Background Notification for Incoming Calls
exports.sendCallNotification = functions.firestore
  .document('calls/{callId}')
  .onCreate(async (snap, context) => {
    const call = snap.data();
    if (!call.calleeId || call.status !== 'ringing') return;
    
    // Get recipient's FCM token
    const recipientDoc = await admin.firestore().doc(`users/${call.calleeId}`).get();
    const fcmToken = recipientDoc.data()?.fcmToken;
    
    if (!fcmToken) return;
    
    // Send DATA-ONLY push notification for the call
    try {
      await admin.messaging().send({
        token: fcmToken,
        data: {
          type: 'call',
          title: 'Life is going on',
          body: 'Join us on live.',
          url: '/study/jee-mains' // Direct redirect to education page
        }
      });
      console.log('Successfully sent call notification to:', call.calleeId);
    } catch (error) {
      console.error('Error sending call notification:', error);
    }
  });
