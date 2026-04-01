package com.example.voxshat.utils

import com.example.voxshat.R

fun getVerifiedIcon(type: String): Int {
    return when (type) {
        "support" -> R.drawable.ic_verified_support
        else -> R.drawable.ic_verified_default
    }
}
