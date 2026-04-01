package com.example.voxshat.ui.profile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.voxshat.R
import com.example.voxshat.VoxShatApplication
import com.example.voxshat.data.Repository
import com.example.voxshat.data.model.User
import com.example.voxshat.databinding.ActivityProfileBinding
import com.example.voxshat.ui.auth.LoginActivity
import com.example.voxshat.ui.settings.SettingsActivity
import kotlinx.coroutines.launch

class ProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProfileBinding
    private lateinit var repository: Repository
    private var currentUserId: Long = 0
    private var currentUser: User? = null

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            // Сохраняем URI в SharedPreferences
            val prefs = getSharedPreferences("user_prefs", MODE_PRIVATE)
            prefs.edit().putString("avatar_uri_$currentUserId", it.toString()).apply()
            binding.ivAvatar.setImageURI(it)
            // Здесь можно сохранить URI в базу данных, если нужно
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        repository = Repository((application as VoxShatApplication).database)

        // Получаем currentUserId из Intent (можно передать из ChatListActivity)
        currentUserId = intent.getLongExtra("current_user_id", 1) // по умолчанию 1

        lifecycleScope.launch {
            currentUser = repository.getUserById(currentUserId)
            currentUser?.let { user ->
                binding.tvUsername.text = user.name
                binding.tvStatus.text = user.status
                // Загружаем аватар из SharedPreferences
                val prefs = getSharedPreferences("user_prefs", MODE_PRIVATE)
                val savedUri = prefs.getString("avatar_uri_$currentUserId", null)
                savedUri?.let {
                    binding.ivAvatar.setImageURI(Uri.parse(it))
                }
            }
        }

        // Смена статуса
        binding.btnChangeStatus.setOnClickListener {
            showStatusDialog()
        }

        // Смена аватара
        binding.ivAvatar.setOnClickListener {
            pickImageLauncher.launch("image/*")
        }

        // Настройки (кнопка в тулбаре)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Профиль"

        binding.toolbar.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.action_settings -> {
                    startActivity(Intent(this, SettingsActivity::class.java))
                    true
                }
                else -> false
            }
        }

        binding.btnLogout.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }

    private fun showStatusDialog() {
        val statuses = arrayOf("онлайн", "офлайн", "не беспокоить", "скоро вернусь")
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Выберите статус")
            .setItems(statuses) { _, which ->
                val newStatus = statuses[which]
                lifecycleScope.launch {
                    currentUser?.let { user ->
                        user.status = newStatus
                        repository.updateUser(user)
                        binding.tvStatus.text = newStatus
                        Toast.makeText(this@ProfileActivity, "Статус изменён", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}
