package com.example.voxshat.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.tasks.await

class AuthRepository {
    private val auth = FirebaseAuth.getInstance()

    suspend fun sendVerificationCode(phoneNumber: String, callbacks: PhoneAuthProvider.OnVerificationStateChangedCallbacks) {
        PhoneAuthProvider.getInstance().verifyPhoneNumber(
            phoneNumber,
            60,
            java.util.concurrent.TimeUnit.SECONDS,
            null,
            callbacks
        )
    }

    suspend fun signInWithCredential(credential: PhoneAuthProvider.ForceResendingToken): Boolean {
        return try {
            auth.signInWithCredential(credential).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    fun getCurrentUser() = auth.currentUser

    fun signOut() {
        auth.signOut()
    }
}
