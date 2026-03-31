<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:padding="16dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:gravity="center_horizontal">

        <de.hdodenhof.circleimageview.CircleImageView
            android:id="@+id/ivAvatar"
            android:layout_width="100dp"
            android:layout_height="100dp"
            android:src="@drawable/ic_launcher"
            android:layout_marginBottom="16dp"/>

        <TextView
            android:id="@+id/tvUsername"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="24sp"
            android:textStyle="bold"
            android:layout_marginBottom="8dp"/>

        <TextView
            android:id="@+id/tvStatus"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="14sp"
            android:textColor="@android:color/darker_gray"
            android:layout_marginBottom="16dp"/>

        <Button
            android:id="@+id/btnChangeStatus"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Сменить статус"
            style="@style/Widget.MaterialComponents.Button.OutlinedButton"
            android:layout_marginBottom="16dp"/>

        <Button
            android:id="@+id/btnSettings"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="@string/settings"
            style="@style/Widget.MaterialComponents.Button.OutlinedButton"
            android:layout_marginBottom="16dp"/>

        <Button
            android:id="@+id/btnLogout"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="@string/logout"
            android:textColor="@android:color/white"
            android:backgroundTint="@android:color/holo_red_dark"/>
    </LinearLayout>
</ScrollView>
