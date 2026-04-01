package com.example.voxshat.ui.profile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
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

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            val prefs = getSharedPreferences("user_prefs", MODE_PRIVATE)
            prefs.edit().putString("avatar_uri", uri.toString()).apply()
            binding.ivAvatar.setImageURI(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = getString(R.string.profile)

        // Получаем ID пользователя из Intent
        currentUserId = intent.getLongExtra("current_user_id", 0)
        if (currentUserId == 0L) {
            Toast.makeText(this, "Ошибка: пользователь не авторизован", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        repository = Repository((application as VoxShatApplication).database)

        loadUserData()

        binding.ivAvatar.setOnClickListener {
            pickImageLauncher.launch("image/*")
        }

        binding.btnChangeStatus.setOnClickListener {
            showStatusDialog()
        }

        binding.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        binding.btnLogout.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }

    private fun loadUserData() {
        lifecycleScope.launch {
            val user = repository.getUserById(currentUserId)
            if (user != null) {
                binding.tvUsername.text = user.name
                binding.tvStatus.text = user.status
                val savedUri = getSharedPreferences("user_prefs", MODE_PRIVATE).getString("avatar_uri", null)
                savedUri?.let {
                    binding.ivAvatar.setImageURI(Uri.parse(it))
                }
            } else {
                Toast.makeText(this@ProfileActivity, "Пользователь не найден", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    private fun showStatusDialog() {
        val statuses = arrayOf(
            getString(R.string.online),
            getString(R.string.offline),
            getString(R.string.do_not_disturb),
            getString(R.string.back_soon)
        )
        android.app.AlertDialog.Builder(this)
            .setTitle("Выберите статус")
            .setItems(statuses) { _, which ->
                val newStatus = statuses[which]
                lifecycleScope.launch {
                    val user = repository.getUserById(currentUserId)
                    user?.let {
                        it.status = newStatus
                        repository.updateUser(it)
                        binding.tvStatus.text = newStatus
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
