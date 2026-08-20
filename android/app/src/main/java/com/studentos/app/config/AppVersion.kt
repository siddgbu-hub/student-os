package com.studentos.app.config

/**
 * Robust Semantic Version representation and comparison.
 * Supports "major.minor.patch" format with graceful fallbacks.
 */
data class SemanticVersion(
    val major: Int,
    val minor: Int,
    val patch: Int
) : Comparable<SemanticVersion> {

    override fun compareTo(other: SemanticVersion): Int {
        if (this.major != other.major) {
            return this.major.compareTo(other.major)
        }
        if (this.minor != other.minor) {
            return this.minor.compareTo(other.minor)
        }
        return this.patch.compareTo(other.patch)
    }

    override fun toString(): String = "$major.$minor.$patch"

    companion object {
        private val SEMVER_REGEX = Regex("""^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?.*$""")

        fun parse(versionStr: String?): SemanticVersion {
            if (versionStr.isNullOrBlank()) {
                return SemanticVersion(0, 0, 0)
            }
            val match = SEMVER_REGEX.matchEntire(versionStr.trim()) ?: return SemanticVersion(0, 0, 0)
            val major = match.groupValues.getOrNull(1)?.toIntOrNull() ?: 0
            val minor = match.groupValues.getOrNull(2)?.takeIf { it.isNotEmpty() }?.toIntOrNull() ?: 0
            val patch = match.groupValues.getOrNull(3)?.takeIf { it.isNotEmpty() }?.toIntOrNull() ?: 0
            return SemanticVersion(major, minor, patch)
        }
    }
}
