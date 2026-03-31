package com.example.voxshat.ui.profile

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.voxshat.R
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.data.Repository
import com.example.voxshat.databinding.ActivityProfileBinding
import com.example.voxshat.ui.auth.LoginActivity
import com.example.voxshat.ui.settings.SettingsActivity
import kotlinx.coroutines.launch

class ProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProfileBinding
    private lateinit var repository: Repository
    private var currentUserId: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        repository = Repository((application as VoxShatApplication).database)

        // Здесь нужно передавать currentUserId из SharedPreferences или Intent
        // Для простоты будем считать, что у нас есть текущий пользователь с id 1
        currentUserId = 1

        lifecycleScope.launch {
            val user = repository.getUserById(currentUserId)
            if (user != null) {
                binding.tvUsername.text = user.name
                binding.tvStatus.text = user.status
            }
        }

        binding.btnChangeStatus.setOnClickListener {
            Toast.makeText(this, "Смена статуса пока не реализована", Toast.LENGTH_SHORT).show()
        }

        binding.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        binding.btnLogout.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }
}
