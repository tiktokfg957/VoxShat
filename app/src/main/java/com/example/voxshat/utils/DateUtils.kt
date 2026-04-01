package com.example.voxshat.utils

import java.text.SimpleDateFormat
import java.util.*

object DateUtils {
    private val todayFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
    private val yesterdayFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
    private val dateFormat = SimpleDateFormat("dd.MM.yyyy", Locale.getDefault())

    fun formatMessageTime(timestamp: Long): String {
        val calendar = Calendar.getInstance()
        val today = calendar.timeInMillis
        calendar.add(Calendar.DAY_OF_YEAR, -1)
        val yesterday = calendar.timeInMillis

        return when {
            timestamp >= today -> todayFormat.format(Date(timestamp))
            timestamp >= yesterday -> "вчера ${yesterdayFormat.format(Date(timestamp))}"
            else -> dateFormat.format(Date(timestamp))
        }
    }

    fun formatChatTime(timestamp: Long): String {
        val calendar = Calendar.getInstance()
        val today = calendar.timeInMillis
        calendar.add(Calendar.DAY_OF_YEAR, -1)
        val yesterday = calendar.timeInMillis

        return when {
            timestamp >= today -> SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))
            timestamp >= yesterday -> "вчера"
            else -> SimpleDateFormat("dd.MM", Locale.getDefault()).format(Date(timestamp))
        }
    }
}
