package com.example.voxshat.utils

import com.example.voxshat.R

fun getVerifiedIcon(type: String): Int {
    return when (type) {
        "support" -> R.drawable.ic_verified_support
        "moderator" -> R.drawable.ic_verified_moderator   // нужно создать отдельно
        "admin" -> R.drawable.ic_verified_admin
        "business" -> R.drawable.ic_verified_business
        "partner" -> R.drawable.ic_verified_partner
        "celebrity" -> R.drawable.ic_verified_celebrity
        else -> R.drawable.ic_verified_default
    }
}
