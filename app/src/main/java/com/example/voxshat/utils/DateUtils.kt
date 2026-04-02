package com.example.voxshat.utils

import java.text.SimpleDateFormat
import java.util.*

object DateUtils {
    private val todayFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
    private val dateFormat = SimpleDateFormat("dd.MM.yyyy", Locale.getDefault())

    fun formatMessageTime(timestamp: Long): String {
        val now = Calendar.getInstance()
        val today = now.timeInMillis
        now.add(Calendar.DAY_OF_YEAR, -1)
        val yesterday = now.timeInMillis

        return when {
            timestamp >= today -> {
                todayFormat.format(Date(timestamp))
            }
            timestamp >= yesterday -> {
                "вчера " + todayFormat.format(Date(timestamp))
            }
            else -> {
                dateFormat.format(Date(timestamp))
            }
        }
    }

    fun formatChatTime(timestamp: Long): String {
        val now = Calendar.getInstance()
        val today = now.timeInMillis
        now.add(Calendar.DAY_OF_YEAR, -1)
        val yesterday = now.timeInMillis

        return when {
            timestamp >= today -> {
                SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))
            }
            timestamp >= yesterday -> "вчера"
            else -> {
                SimpleDateFormat("dd.MM", Locale.getDefault()).format(Date(timestamp))
            }
        }
    }
}
