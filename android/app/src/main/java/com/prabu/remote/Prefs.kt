package com.prabu.remote

import android.content.Context

class Prefs(context: Context) {
    private val p = context.getSharedPreferences("prabu_remote", Context.MODE_PRIVATE)

    var deviceUuid: String
        get() = p.getString("deviceUuid", "") ?: ""
        set(v) = p.edit().putString("deviceUuid", v).apply()

    var deviceToken: String
        get() = p.getString("deviceToken", "") ?: ""
        set(v) = p.edit().putString("deviceToken", v).apply()

    var deviceName: String
        get() = p.getString("deviceName", "") ?: ""
        set(v) = p.edit().putString("deviceName", v).apply()

    var lastRegisterError: String
        get() = p.getString("lastRegisterError", "") ?: ""
        set(v) = p.edit().putString("lastRegisterError", v).apply()

    fun clearAuth() {
        p.edit().remove("deviceToken").apply()
    }
}
