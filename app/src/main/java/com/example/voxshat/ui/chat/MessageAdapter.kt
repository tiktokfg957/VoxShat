package com.example.voxshat.ui.chat

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.voxshat.data.model.Message
import com.example.voxshat.databinding.ItemMessageMeBinding
import com.example.voxshat.databinding.ItemMessageOtherBinding
import java.text.SimpleDateFormat
import java.util.*

class MessageAdapter(
    private val currentUserId: String,
    private val onLongClick: (Message) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private var messages = listOf<Message>()
    private val dateFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

    fun submitList(list: List<Message>) {
        messages = list
        notifyDataSetChanged()
    }

    override fun getItemViewType(position: Int): Int {
        return if (messages[position].senderId == currentUserId) TYPE_ME else TYPE_OTHER
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == TYPE_ME) {
            val binding = ItemMessageMeBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            MessageMeViewHolder(binding)
        } else {
            val binding = ItemMessageOtherBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            MessageOtherViewHolder(binding)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val message = messages[position]
        when (holder) {
            is MessageMeViewHolder -> holder.bind(message)
            is MessageOtherViewHolder -> holder.bind(message)
        }
        holder.itemView.setOnLongClickListener {
            onLongClick(message)
            true
        }
    }

    override fun getItemCount() = messages.size

    inner class MessageMeViewHolder(private val binding: ItemMessageMeBinding) :
        RecyclerView.ViewHolder(binding.root) {
        fun bind(message: Message) {
            binding.tvMessage.text = message.text
            binding.tvTime.text = dateFormat.format(Date(message.timestamp))
        }
    }

    inner class MessageOtherViewHolder(private val binding: ItemMessageOtherBinding) :
        RecyclerView.ViewHolder(binding.root) {
        fun bind(message: Message) {
            binding.tvMessage.text = message.text
            binding.tvTime.text = dateFormat.format(Date(message.timestamp))
        }
    }

    companion object {
        private const val TYPE_ME = 0
        private const val TYPE_OTHER = 1
    }
}
