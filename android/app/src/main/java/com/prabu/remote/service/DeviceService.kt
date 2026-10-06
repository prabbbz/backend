package com.prabu.remote.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import com.prabu.remote.net.Api
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class DeviceService : Service() {
    private val executor = Executors.newScheduledThreadPool(1)

    override fun onCreate() {
        super.onCreate()
        startForeground(1001, notification())
        executor.scheduleAtFixedRate({
            try {
                Api.heartbeat(this)
                Api.pollCommands(this).forEach { (id, action) ->
                    val ok = executeAction(action)
                    Api.ack(this, id, if (ok) "done" else "failed")
                }
            } catch (_: Exception) {
                // Network/device errors are intentionally non-fatal; next cycle retries.
            }
        }, 0, 4, TimeUnit.SECONDS)
    }

    private fun executeAction(action: String): Boolean = when (action) {
        "HOME" -> PrabuAccessibilityService.performGlobal(
            android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_HOME
        )
        "BACK" -> PrabuAccessibilityService.performGlobal(
            android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
        )
        "RECENTS" -> PrabuAccessibilityService.performGlobal(
            android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_RECENTS
        )
        else -> false
    }

    private fun notification(): Notification {
        val id = "prabu_remote"
        if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(
                    id,
                    "PRABU Remote connection",
                    NotificationManager.IMPORTANCE_LOW
                )
            )
        }
        return Notification.Builder(this, id)
            .setContentTitle("PRABU Remote")
            .setContentText("Remote connection active")
            .setSmallIcon(android.R.drawable.stat_sys_data_sync)
            .setOngoing(true)
            .build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }

    override fun onTimeout(startId: Int, fgsType: Int) {
        // Android 15+ dataSync timeout. Stop cleanly; the app can reconnect when the OS permits it.
        stopSelf(startId)
    }

    companion object {
        fun start(context: Context) {
            val i = Intent(context, DeviceService::class.java)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i)
            else context.startService(i)
        }
    }
}
