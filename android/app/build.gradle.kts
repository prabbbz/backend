plugins {
    id("com.android.application")
}

fun quoteForBuildConfig(value: String): String =
    "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

val serverUrl = providers.gradleProperty("prabuServerUrl")
    .orElse(providers.environmentVariable("PRABU_SERVER_URL"))
    .orElse("https://YOUR-PRABU-REMOTE.vercel.app")
    .get()

val installKey = providers.gradleProperty("prabuInstallKey")
    .orElse(providers.environmentVariable("PRABU_INSTALL_KEY"))
    .orElse("CHANGE_THIS_TO_A_LONG_RANDOM_INSTALL_KEY")
    .get()

android {
    namespace = "com.prabu.remote"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.prabu.remote"
        minSdk = 29
        targetSdk = 36
        versionCode = 2
        versionName = "0.2.0"
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            buildConfigField("String", "PRABU_SERVER_URL", quoteForBuildConfig(serverUrl))
            buildConfigField("String", "PRABU_INSTALL_KEY", quoteForBuildConfig(installKey))
        }
        release {
            buildConfigField("String", "PRABU_SERVER_URL", quoteForBuildConfig(serverUrl))
            buildConfigField("String", "PRABU_INSTALL_KEY", quoteForBuildConfig(installKey))
        }
    }
}
