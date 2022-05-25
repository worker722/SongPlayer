package com.androideradev.www.songplayer

import android.app.ProgressDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.view.View
import android.widget.AdapterView
import android.widget.AdapterView.OnItemSelectedListener
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import com.androideradev.www.songplayer.databinding.ActivityGenerateBinding
import com.google.firebase.storage.FirebaseStorage
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder
import java.util.concurrent.TimeUnit


@RequiresApi(Build.VERSION_CODES.O)
class GenerateActivity : AppCompatActivity() {
    private lateinit var binding: ActivityGenerateBinding
    private var REQ_CODE_PICK_SOUNDFILE = 1
    private var filePath = ""
    private var fileName: String = ""
    private lateinit var dialog: ProgressDialog
    private var title: String = ""
    private var song: String = ""
    private var start_time: Float = 0f
    private lateinit var client: OkHttpClient
    private var selectedId: String = ""
    private var selectedName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        dialog = ProgressDialog(this)
        super.onCreate(savedInstanceState)
        binding = ActivityGenerateBinding.inflate(layoutInflater)
        setContentView(binding.root)
//        binding.edtTitle.setText("Hongos")
//        binding.edtSong.setText("Ricardo Arjona")
//        binding.edtStartTime.setText("33.10")

        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.MINUTES)
            .writeTimeout(15, TimeUnit.MINUTES)
            .readTimeout(15, TimeUnit.MINUTES)
            .build().also { client = it }
        initSpinner()

        binding.btnChooseFile.setOnClickListener {
            val intentUpload = Intent()
            intentUpload.type = "audio/*"
            intentUpload.action = Intent.ACTION_GET_CONTENT
            startActivityForResult(intentUpload, REQ_CODE_PICK_SOUNDFILE)
        }
        binding.btnProcess.setOnClickListener {
            title = binding.edtTitle.text.toString()
            song = binding.edtSong.text.toString()
            val tmpStart = binding.edtStartTime.text.toString()
            when {
                title.isEmpty() && selectedId.isEmpty() -> {
                    Toast.makeText(applicationContext, "Input the title", Toast.LENGTH_LONG).show()
                }
                song.isEmpty() && selectedId.isEmpty() -> {
                    Toast.makeText(applicationContext, "Input the song", Toast.LENGTH_LONG).show()
                }
                filePath.isEmpty() && selectedId.isEmpty() -> {
                    Toast.makeText(applicationContext, "Select the file", Toast.LENGTH_LONG).show()
                }
                tmpStart.isEmpty() -> {
                    Toast.makeText(
                        applicationContext,
                        "Input the start time of vocal",
                        Toast.LENGTH_LONG
                    ).show()
                }
//                tmpStart.toFloat() <= 10f -> {
//                    Toast.makeText(applicationContext, "Minimum is 10 seconds", Toast.LENGTH_LONG)
//                        .show()
//                }
                else -> {
                    start_time = tmpStart.toFloat()
                    uploadFile()
                }
            }
        }
    }

    private var mediaIdList: List<String> = emptyList()
    private var mediaNameList: List<String> = emptyList()

    private fun initSpinner() {
        val list = emptyList<String>().toMutableList()
        dialog.setTitle("Loading...")
        dialog.show()
        list += "Create New"
        Thread {
            try {
                val lyricsUrl = "https://api.sonix.ai/v1/media"
                val lyricsRequest = Request.Builder()
                    .url(lyricsUrl)
                    .get()
                    .addHeader("Authorization", "Bearer MwQtoiwQQpdrQrHvOPFQfQtt")
                    .build()

                val lyricsResponse = client.newCall(lyricsRequest).execute()
                val lyricsJsonData = lyricsResponse.body()?.string()
                val lyricsObject = lyricsJsonData?.let { JSONObject(it) }
                val medias = lyricsObject!!.getJSONArray("media")

                for (i in 0 until medias.length()) {
                    val media = medias.getJSONObject(i)
                    val id = media.get("id").toString()
                    val name = media.get("name").toString()
                    list += name
                    mediaIdList = mediaIdList + id
                    mediaNameList = mediaNameList + name
                }

                runOnUiThread {
                    val adapter: ArrayAdapter<String> =
                        ArrayAdapter<String>(this, R.layout.spinner_item, list)
                    binding.spinner.adapter = adapter
                    binding.spinner.onItemSelectedListener = object : OnItemSelectedListener {
                        override fun onNothingSelected(parent: AdapterView<*>?) {

                        }

                        override fun onItemSelected(
                            parent: AdapterView<*>?,
                            view: View?,
                            position: Int,
                            id: Long
                        ) {
                            updateUI(position)
                        }
                    }
                    dialog.dismiss()
                }
            } catch (e: java.lang.Exception) {
                e.printStackTrace()
                dialog.dismiss()
            }
        }.start()

    }

    private fun updateUI(position: Int) {
        var visible = View.GONE
        if (position > 0) {
            selectedId = mediaIdList[position - 1]
            selectedName = mediaNameList[position - 1]
        } else {
            visible = View.VISIBLE
            selectedId = ""
            selectedName = ""
        }
        binding.textView3.visibility = visible
        binding.edtTitle.visibility = visible

        binding.textView5.visibility = visible
        binding.edtSong.visibility = visible

        binding.textView6.visibility = visible
        binding.btnChooseFile.visibility = visible
    }

    private fun uploadFile() {
        dialog.setTitle("Uploading...")
        dialog.show()
        if (selectedId.isNotEmpty()) {
            genAss("")
            return
        }
        try {
            val storage = FirebaseStorage.getInstance()
            val storageRef = storage.reference
            val fileRef = storageRef.child(fileName)
            val file = File(filePath)
            val uploadTask = fileRef.putFile(Uri.fromFile(file))
            uploadTask.addOnProgressListener {
                println("UPLOAD => " + it.totalByteCount + "/" + it.bytesTransferred)
            }.addOnCompleteListener {
                fileRef.downloadUrl
                    .addOnCompleteListener { downloadIt ->
                        dialog.setTitle("Generating...")
                        val url = downloadIt.result.toString()
                        if (url.isNotEmpty()) {
                            genAss(url)
                            return@addOnCompleteListener
                        }
                    }
            }
        } catch (e: Exception) {
            dialog.hide()
            Toast.makeText(applicationContext, e.message, Toast.LENGTH_LONG).show()
            e.printStackTrace()
        }
    }

    private fun genLyrics(lyrics: JSONArray): String {
        var lyric = ""
        for (i in 0 until lyrics.length()) {
            val item: JSONObject = lyrics.getJSONObject(i)
            lyric += "${item.getString("words")}\n"
        }
        return lyric
    }

    private fun genAss(url: String) {
        Thread {
            try {
                var lyric = ""
                try {
                    if(selectedId.isEmpty()) {
                        val lyricsUrl = "https://timestamp-lyrics.p.rapidapi.com/extract-lyrics?name=${
                            URLEncoder.encode(
                                "$title-$song",
                                "UTF-8"
                            )
                        }"
                        val lyricsRequest = Request.Builder()
                            .url(lyricsUrl)
                            .get()
                            .addHeader("X-RapidAPI-Host", "timestamp-lyrics.p.rapidapi.com")
                            .addHeader(
                                "X-RapidAPI-Key",
                                "47c807821fmsh5454e9c8735adb5p159f17jsn91ed64e41132"
                            )
                            .build()

                        val lyricsResponse = client.newCall(lyricsRequest).execute()
                        val lyricsJsonData = lyricsResponse.body()?.string()
                        val lyricsObject = lyricsJsonData?.let { JSONObject(it) }
                        val lyrics = lyricsObject!!.getJSONArray("lyrics")
                        lyric = genLyrics(lyrics)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    runOnUiThread {
                        Toast.makeText(applicationContext, e.message, Toast.LENGTH_LONG).show()
                    }
                }

                println("$selectedId | $start_time")
                val formBody = FormBody.Builder()
                    .add("name", title)
                    .add("song", song)
                    .add("lyrics", lyric)
                    .add("file_url", url)
                    .add("start_time", start_time.toString())
                    .add("init_id", selectedId)
                    .build()

                val request = Request.Builder()
//                    .url("http://10.0.2.2:8000/ass-gen")
                    .url("https://karamato.herokuapp.com/ass-gen")
                    .post(formBody)
                    .build()
                val response = client.newCall(request).execute()

                val jsonData = response.body()?.string()
                val jObject = jsonData?.let { JSONObject(it) }
                val success = jObject!!.getBoolean("success")
                val data = jObject.getString("data")
                if (success) {
                    val filePath =
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path +
                                if (selectedName.isNotEmpty()) {
                                    "/$selectedName.ass"
                                } else {
                                    "/$title $song.ass"
                                }
                    val file = File(filePath)
                    file.writeText(data)
                    runOnUiThread {
                        Toast.makeText(
                            applicationContext,
                            "Successfully save to download folder.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }

                runOnUiThread {
                    dialog.dismiss()
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(applicationContext, e.message, Toast.LENGTH_LONG).show()
                    dialog.dismiss()
                }
                return@Thread
            }
        }.start()
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_CODE_PICK_SOUNDFILE && resultCode == RESULT_OK) {
            if (data != null && data.data != null) {
                val wholeID = DocumentsContract.getDocumentId(data.data!!)
                val id = wholeID.split(":").toTypedArray()[1]
                val column = arrayOf(MediaStore.Audio.Media.DATA)
                val sel = MediaStore.Audio.Media._ID + "=?"
                val cursor = contentResolver.query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, column, sel, arrayOf(id), null)
                val columnIndex = cursor!!.getColumnIndex(column[0])
                if (cursor.moveToFirst()) {
                    filePath = cursor.getString(columnIndex)
                }
                cursor.close()

                val nameCursor = contentResolver.query(data.data!!, null, null, null, null)
                val nameIndex = nameCursor!!.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if(nameCursor.moveToFirst()) {
                    val name = nameCursor.getString(nameIndex)
                    fileName = name
                }
                fileName = fileName.ifEmpty { "song.wav" }

                binding.btnChooseFile.text = fileName
                nameCursor.close()
                return
            }
        }
        binding.btnChooseFile.text = "Choose file"
    }
}