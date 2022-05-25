package com.androideradev.www.songplayer

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.app.ActivityCompat
import com.google.android.material.floatingactionbutton.FloatingActionButton

class MainActivity : AppCompatActivity() {

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE), 1)
        findViewById<ConstraintLayout>(R.id.constraint_layout)
            .setOnClickListener {
                goSongActivity("Morir por Vivir")
            }
        findViewById<ConstraintLayout>(R.id.constraint_layout1)
            .setOnClickListener {
                goSongActivity("Hongos")
            }
        findViewById<ConstraintLayout>(R.id.constraint_layout2)
            .setOnClickListener {
                goSongActivity("Tini")
            }
        findViewById<FloatingActionButton>(R.id.fab_generate)
            .setOnClickListener{
                startActivity(Intent(this, GenerateActivity::class.java))
            }
    }
    fun goSongActivity(param: String) {
        val intent = Intent(this, SongActivity::class.java)
        intent.putExtra("title", param)
        startActivity(intent)
    }
}