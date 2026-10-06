package com.prabu.remote

/**
 * Build-time configuration.
 * The GitHub Actions workflow can inject the values from GitHub Secrets,
 * so the source repository does not need to contain the production URL/key.
 */
object AppConfig {
    const val SERVER_URL: String = BuildConfig.PRABU_SERVER_URL
    const val INSTALL_KEY: String = BuildConfig.PRABU_INSTALL_KEY
}
