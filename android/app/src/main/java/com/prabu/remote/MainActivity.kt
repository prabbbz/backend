package com.prabu.remote

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import com.prabu.remote.net.Api
import com.prabu.remote.service.DeviceService
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private lateinit var prefs: Prefs
    private val io = Executors.newSingleThreadExecutor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = Prefs(this)

        val status = findViewById<TextView>(R.id.status)
        val identity = findViewById<TextView>(R.id.identity)
        identity.text = "Device ID: ${prefs.deviceUuid.ifBlank { "membuat ID…" }}"
        status.text = "Status: menghubungkan ke server…"

        findViewById<Button>(R.id.notificationAccess).setOnClickListener {
            startActivity(Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"))
        }
        findViewById<Button>(R.id.accessibilityAccess).setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        io.execute {
            val ok = Api.ensureRegistered(this)
            if (ok) {
                DeviceService.start(this)
                runOnUiThread {
                    identity.text = "Device ID: ${prefs.deviceUuid}"
                    status.text = "Status: TERHUBUNG ✅\nDevice otomatis terdaftar di dashboard."
                }
            } else {
                runOnUiThread {
                    identity.text = "Device ID: ${prefs.deviceUuid.ifBlank { "belum dibuat" }}"
                    status.text = "Status: server belum dapat dihubungi ❌\n${prefs.lastRegisterError}"
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::prefs.isInitialized && prefs.deviceToken.isNotBlank()) {
            findViewById<TextView>(R.id.status).text = "Status: TERHUBUNG ✅"
        }
    }

    override fun onDestroy() {
        io.shutdownNow()
        super.onDestroy()
    }
}
