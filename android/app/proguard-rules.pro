# ==============================================================================
# R8 / ProGuard Configuration for Student OS
# ==============================================================================

# Preserve generic type signatures for Retrofit coroutine suspend functions
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

# Keep Kotlin Coroutines & Continuation types
-keep class kotlin.coroutines.Continuation { *; }
-keep class kotlinx.coroutines.** { *; }

# Keep all Retrofit API Service Interfaces
-keep interface com.studentos.app.data.api.** { *; }
-keepclassmembers interface com.studentos.app.data.api.** { *; }
-keepclassmembers interface * {
    @retrofit2.http.* <methods>;
}

# Keep all Data Models and Serializers
-keep class com.studentos.app.data.model.** { *; }
-keepclassmembers class com.studentos.app.data.model.** { *; }

# Kotlinx Serialization
-keepclassmembers class * {
    *** Companion;
}
-keepclasseswithmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep class * implements kotlinx.serialization.KSerializer { *; }
-keepclassmembers class * implements kotlinx.serialization.KSerializer {
    <fields>;
    <methods>;
}
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}
-keepclassmembers class * {
    @kotlinx.serialization.SerialName <fields>;
}

# JakeWharton Retrofit Kotlinx Serialization Converter
-dontwarn com.jakewharton.retrofit2.converter.kotlinx.serialization.**
-keep class com.jakewharton.retrofit2.converter.kotlinx.serialization.** { *; }
-keepclassmembers class com.jakewharton.retrofit2.converter.kotlinx.serialization.** { *; }

# Google Credential Manager & Identity
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }

# Suppress non-critical warnings
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
