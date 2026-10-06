package com.prabu.remote.net

import android.content.Context
import android.os.BatteryManager

data class BatteryState(val level: Int, val charging: Boolean)
object DeviceInfo {
    fun battery(context: Context): BatteryState {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).coerceIn(0,100)
        val charging = bm.isCharging
        return BatteryState(level, charging)
    }
}
