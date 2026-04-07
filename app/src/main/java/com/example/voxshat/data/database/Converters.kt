package com.example.voxshat.data.database

import androidx.room.TypeConverter

class Converters {
    @TypeConverter
    fun fromTimestamp(value: Long?): Long? = value

    @TypeConverter
    fun dateToTimestamp(value: Long?): Long? = value
}
