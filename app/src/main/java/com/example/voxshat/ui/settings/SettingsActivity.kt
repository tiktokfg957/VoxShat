package com.example.voxshat.ui.settings

import android.content.SharedPreferences
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import com.example.voxshat.R
import com.example.voxshat.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var sharedPrefs: SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Настройки"

        sharedPrefs = getSharedPreferences("settings", MODE_PRIVATE)

        val isDark = sharedPrefs.getBoolean("dark_theme", false)
        binding.switchDarkTheme.isChecked = isDark
        binding.switchDarkTheme.setOnCheckedChangeListener { _, isChecked ->
            sharedPrefs.edit().putBoolean("dark_theme", isChecked).apply()
            setTheme(isChecked)
        }

        binding.btnChangePassword.setOnClickListener {
            Toast.makeText(this, "Смена пароля будет доступна после подключения Firebase", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setTheme(isDark: Boolean) {
        if (isDark) {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
        } else {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
        }
        recreate()
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}
