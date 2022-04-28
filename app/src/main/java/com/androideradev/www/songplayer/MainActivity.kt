package com.androideradev.www.songplayer

import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout

class MainActivity : AppCompatActivity() {

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        findViewById<ConstraintLayout>(R.id.constraint_layout)
            .setOnClickListener {
                goSongActivity("Morir por Vivir")
            }
        findViewById<ConstraintLayout>(R.id.constraint_layout1)
            .setOnClickListener {
                goSongActivity("Hongos")
            }
    }
    fun goSongActivity(param: String) {
        var intent = Intent(this, SongActivity::class.java)
        intent.putExtra("title", param)
        startActivity(intent)
    }
}