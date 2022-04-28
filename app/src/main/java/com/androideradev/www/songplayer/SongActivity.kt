package com.androideradev.www.songplayer

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import com.androideradev.www.songplayer.databinding.ActivitySongBinding
import com.google.android.exoplayer2.C
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.analytics.AnalyticsListener
import com.google.android.exoplayer2.text.Cue
import com.google.android.exoplayer2.util.MimeTypes
import com.google.android.exoplayer2.util.Util
import com.google.common.collect.ImmutableList


class SongActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySongBinding

    private var playWhenReady = true
    private var currentWindow = 0
    private var playbackPosition = 0L

    private var player: ExoPlayer? = null
    private var player2: ExoPlayer? = null
    private var isMute: Boolean = true

    private var SONG_TITLE = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySongBinding.inflate(layoutInflater)
        setContentView(binding.root)
        SONG_TITLE = intent.getStringExtra("title").toString()
        binding.textView2.text = SONG_TITLE

        binding.txtCaption.setBackgroundColor(Color.TRANSPARENT)
        binding.txtCaption.settings.javaScriptEnabled = true
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        binding.imageMic.setOnClickListener {
            isMute = !isMute
            updateMicResource()
        }
    }
    private fun updateMicResource() {
        var resource = R.drawable.ic_mic_on
        if(isMute) {
            resource = R.drawable.ic_mic_off
            player2?.volume = 0f
        } else {
            player2?.volume = 1f
        }
        binding.imageMic.setImageResource(resource)
    }

    private fun initializePlayer() {
        val audio = Uri.parse("asset:///${SONG_TITLE}_acc.m4a")
        val caption = Uri.parse("asset:///${SONG_TITLE}_ass.ass")
        val vocals = Uri.parse("asset:///${SONG_TITLE}_voc.m4a")

        val captionsString = application.assets.open("${SONG_TITLE}_ass.ass").bufferedReader().use { it.readLines() }
        val captionUtils = SubtitleUtils(captionsString)

        val subtitle = MediaItem.SubtitleConfiguration.Builder(caption)
            .setMimeType(MimeTypes.TEXT_SSA)
            .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
            .build()

        val audioItem = MediaItem.Builder()
            .setUri(audio)
            .setSubtitleConfigurations(ImmutableList.of(subtitle))
            .build()
        val vocalMediaItem = MediaItem.Builder()
            .setUri(vocals)
            .build()

        player = ExoPlayer.Builder(this)
            .build()
            .also { exoPlayer ->
                binding.playerView.subtitleView?.isVisible = false
                binding.playerView.player = exoPlayer
                exoPlayer.setMediaItem(audioItem)
            }
        player?.addAnalyticsListener(object: AnalyticsListener {
            override fun onCues(eventTime: AnalyticsListener.EventTime, cues: MutableList<Cue>) {
                super.onCues(eventTime, cues)
                if(player != null) {
                    val html = captionUtils.getHtml(eventTime.currentPlaybackPositionMs, player!!.isPlaying)
                    binding.txtCaption.loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
                }
            }

            override fun onIsPlayingChanged(
                eventTime: AnalyticsListener.EventTime,
                isPlaying: Boolean
            ) {
                super.onIsPlayingChanged(eventTime, isPlaying)
                if(isPlaying) {
                    player2?.play()
                } else {
                    player2?.pause()
                }
                if(player?.isPlaying != isPlaying) {
                    togglePlayer(isPlaying)
                }
            }


            override fun onSeekProcessed(eventTime: AnalyticsListener.EventTime) {
                super.onSeekProcessed(eventTime)
                player2?.seekTo(eventTime.currentPlaybackPositionMs)
                if(player != null) {
                    val html = captionUtils.getHtml(eventTime.currentPlaybackPositionMs, player!!.isPlaying)
                    binding.txtCaption.loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
                }
            }
        })
        player?.playWhenReady = playWhenReady
        player?.seekTo(currentWindow, playbackPosition)

        player2 = ExoPlayer.Builder(this)
            .build()
            .also { exoPlayer ->
                exoPlayer.setMediaItem(vocalMediaItem)
            }
        player2?.playWhenReady = playWhenReady
        player2?.seekTo(currentWindow, playbackPosition)
        player?.prepare()
        player2?.prepare()
        updateMicResource()
    }
    private fun togglePlayer(isPlaying:Boolean) {
       val status = if(isPlaying) "running" else "paused"
        val script ="javascript:window.document.head.appendChild(document.createElement('style')).innerHTML = '.word::after {animation-play-state: $status;}';\n"
        binding.txtCaption.evaluateJavascript(script, null)
    }
    public override fun onStart() {
        super.onStart()
        if (Util.SDK_INT >= 24) {
            initializePlayer()
        }
    }

    public override fun onResume() {
        super.onResume()
        if ((Util.SDK_INT < 24 || player == null)) {
            initializePlayer()
        }
    }

    public override fun onPause() {
        super.onPause()
        if (Util.SDK_INT < 24) {
            releasePlayer()
        }
    }


    public override fun onStop() {
        super.onStop()
        if (Util.SDK_INT >= 24) {
            releasePlayer()
        }
    }

    private fun releasePlayer() {
        player?.run {
            playbackPosition = this.currentPosition
            currentWindow = this.currentMediaItemIndex
            playWhenReady = this.playWhenReady
            release()
        }
        player = null
        player2?.release()
        player2 = null
    }
}