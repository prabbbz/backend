package com.prabu.remote.net

import android.content.Context
import android.os.Build
import com.prabu.remote.AppConfig
import com.prabu.remote.Prefs
import org.json.JSONObject
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

object Api {
    private fun request(
        urlString: String,
        method: String,
        headers: Map<String, String> = emptyMap(),
        body: JSONObject? = null
    ): JSONObject {
        val c = URL(urlString).openConnection() as HttpURLConnection
        c.requestMethod = method
        c.connectTimeout = 15_000
        c.readTimeout = 15_000
        c.setRequestProperty("Accept", "application/json")
        headers.forEach { (k, v) -> c.setRequestProperty(k, v) }
        if (body != null) {
            c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            OutputStreamWriter(c.outputStream).use { it.write(body.toString()) }
        }
        val code = c.responseCode
        val stream = if (code in 200..299) c.inputStream else c.errorStream
        val text = stream?.let { BufferedReader(it.reader()).use { r -> r.readText() } } ?: ""
        if (code !in 200..299) throw IllegalStateException("HTTP $code: $text")
        return if (text.isBlank()) JSONObject() else JSONObject(text)
    }

    private fun ensureUuid(prefs: Prefs): String {
        if (prefs.deviceUuid.isBlank()) prefs.deviceUuid = UUID.randomUUID().toString()
        return prefs.deviceUuid
    }

    private fun defaultName(prefs: Prefs): String {
        if (prefs.deviceName.isNotBlank()) return prefs.deviceName
        val model = (Build.MANUFACTURER + " " + Build.MODEL)
            .replace(Regex("\s+"), " ")
            .trim()
        val suffix = prefs.deviceUuid.replace("-", "").takeLast(4).uppercase()
        val generated = if (model.isNotBlank()) "$model · $suffix" else "Android · $suffix"
        prefs.deviceName = generated
        return generated
    }

    /** Registers the installation automatically. There is no pairing step. */
    fun register(context: Context): String {
        val prefs = Prefs(context)
        val uuid = ensureUuid(prefs)
        val battery = DeviceInfo.battery(context)
        val body = JSONObject().apply {
            put("deviceUuid", uuid)
            put("deviceName", defaultName(prefs))
            put("model", Build.MANUFACTURER + " " + Build.MODEL)
            put("androidVersion", Build.VERSION.RELEASE ?: Build.VERSION.SDK_INT.toString())
            put("battery", battery.level)
            put("isCharging", battery.charging)
        }
        val json = request(
            AppConfig.SERVER_URL.trimEnd('/') + "/api/devices/register",
            "POST",
            mapOf("X-Install-Key" to AppConfig.INSTALL_KEY),
            body
        )
        prefs.deviceToken = json.getString("deviceToken")
        prefs.lastRegisterError = ""
        return json.getString("deviceId")
    }

    /** Makes a best-effort auto-enrollment before the background bridge starts. */
    fun ensureRegistered(context: Context): Boolean {
        val prefs = Prefs(context)
        if (prefs.deviceToken.isNotBlank()) return true
        return try {
            register(context)
            true
        } catch (e: Exception) {
            prefs.lastRegisterError = e.message ?: "Register failed"
            false
        }
    }

    fun heartbeat(context: Context): Boolean {
        val prefs = Prefs(context)
        if (!ensureRegistered(context)) return false
        val b = DeviceInfo.battery(context)
        return try {
            request(
                AppConfig.SERVER_URL.trimEnd('/') + "/api/devices/heartbeat",
                "POST",
                mapOf("X-Device-Token" to prefs.deviceToken),
                JSONObject().apply {
                    put("deviceName", defaultName(prefs))
                    put("model", Build.MANUFACTURER + " " + Build.MODEL)
                    put("androidVersion", Build.VERSION.RELEASE ?: Build.VERSION.SDK_INT.toString())
                    put("battery", b.level)
                    put("isCharging", b.charging)
                }
            )
            true
        } catch (e: Exception) {
            if (e.message?.contains("401") == true || e.message?.contains("404") == true) {
                prefs.clearAuth()
            }
            false
        }
    }

    fun notifications(
        context: Context,
        packageName: String?,
        appName: String?,
        title: String?,
        content: String?,
        postedAt: Long
    ) {
        val prefs = Prefs(context)
        if (!ensureRegistered(context)) return
        request(
            AppConfig.SERVER_URL.trimEnd('/') + "/api/devices/notifications",
            "POST",
            mapOf("X-Device-Token" to prefs.deviceToken),
            JSONObject().apply {
                put("packageName", packageName ?: JSONObject.NULL)
                put("appName", appName ?: JSONObject.NULL)
                put("title", title ?: JSONObject.NULL)
                put("content", content ?: JSONObject.NULL)
                put("postedAt", java.time.Instant.ofEpochMilli(postedAt).toString())
            }
        )
    }

    fun pollCommands(context: Context): List<Pair<Long, String>> {
        val prefs = Prefs(context)
        if (!ensureRegistered(context)) return emptyList()
        return try {
            val json = request(
                AppConfig.SERVER_URL.trimEnd('/') + "/api/devices/commands",
                "GET",
                mapOf("X-Device-Token" to prefs.deviceToken)
            )
            val array = json.optJSONArray("commands") ?: return emptyList()
            buildList {
                for (i in 0 until array.length()) {
                    val o = array.getJSONObject(i)
                    add(o.getLong("id") to o.getString("action"))
                }
            }
        } catch (e: Exception) {
            if (e.message?.contains("401") == true || e.message?.contains("404") == true) {
                prefs.clearAuth()
            }
            emptyList()
        }
    }

    fun ack(context: Context, id: Long, status: String) {
        val prefs = Prefs(context)
        if (prefs.deviceToken.isBlank()) return
        request(
            AppConfig.SERVER_URL.trimEnd('/') + "/api/devices/commands",
            "POST",
            mapOf("X-Device-Token" to prefs.deviceToken),
            JSONObject().apply {
                put("commandId", id)
                put("status", status)
            }
        )
    }
}
