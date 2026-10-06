package com.prabu.remote.service

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import java.lang.ref.WeakReference

class PrabuAccessibilityService : AccessibilityService() {
    override fun onServiceConnected() { super.onServiceConnected(); instance = WeakReference(this) }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}
    override fun onDestroy(){ instance?.clear(); super.onDestroy() }
    companion object {
        private var instance: WeakReference<PrabuAccessibilityService>? = null
        fun performGlobal(action: Int): Boolean = instance?.get()?.performGlobalAction(action) ?: false
    }
}
