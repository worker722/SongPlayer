package com.androideradev.www.songplayer

import android.graphics.Paint
import android.util.Log
import java.util.*

class SubtitleUtils(assFileContents: List<String>) {

    class SubtitleItem {
        class CaptionItem {
            var caption: String = ""
            var duration: Float = 0f
            var color: String? = null
            var font: String? = null
        }

        var startPosition: Long = 0
        var endPosition: Long = 0
        var captions: List<CaptionItem> = emptyList()
        var layers: String = ""
        var style: String = ""
        var actor: String = ""
        var marginL: String = ""
        var marginR: String = ""
        var marginV: String = ""
        var effect: String = ""
        fun isContains(position: Long): Boolean {
            return position in startPosition until endPosition
        }
    }

    private var captions: List<SubtitleItem> = emptyList()

    private var durTags = listOf(
        "fs", "K", "kf"
    )

    private fun getColor(value: String?): String? {
        if (value == null) return null
        val color =
            "&?H?([0-9a-f]{2})?([0-9a-f]{6})".toRegex(RegexOption.IGNORE_CASE).find(value)?.value
                ?: return null
        return vba2hex(color)
    }

    private fun getDuration(value: String): Float {
        try {
            durTags.forEach {
                val mRegex = "\\\\$it(\\d+)"
                var tmpDuration = mRegex.toRegex().find(value)?.value
                if (tmpDuration != null) {
                    tmpDuration = "(\\d+)".toRegex().find(tmpDuration)?.value
                    if (tmpDuration != null) {
                        val times = if(it == "fs") 100 else 10
                        return tmpDuration.toFloat().times(times)
                    }
                }
            }
        } catch (e: java.lang.Exception) {
            e.printStackTrace()
        }
        return 0f
    }

    private fun getFont(value: String?): String? {
        if (value == null) return null
        var font = "\\\\fn([a-z]|[A-Z])+".toRegex().find(value)?.value
            ?: return null
        font = font.replace("\\fn", "")
        return font.uppercase(Locale.getDefault())
    }

    private fun convertMSeconds(str: String): Long {
        try {
            val timeArr = str.split(":")
            var milliseconds = 0L
            if (timeArr.size >= 3) {
                milliseconds += timeArr[0].toLong() * 24 * 60 * 1000
                milliseconds += timeArr[1].toLong() * 60 * 1000
                milliseconds += (timeArr[2].toFloat() * 1000f).toLong()
                return milliseconds
            }
        } catch (err: java.lang.Exception) {
            err.printStackTrace()
        }
        return 0
    }

    private fun vba2hex(vba: String): String {
        var tmp = vba
        if (tmp.length >= 6) tmp = tmp.substring(tmp.length - 6)
        else return ""
        return "#${tmp[4]}${tmp[5]}${tmp[2]}${tmp[3]}${tmp[0]}${tmp[1]}"
    }

    init {
        try {
            var tmpAss = assFileContents
            val eventIndex = tmpAss.indexOf("[Events]")
            tmpAss = tmpAss.slice(IntRange(eventIndex + 2, tmpAss.size - 1))
            val resArray = tmpAss.map { it.split(": ")[1].split(",") }
            for (it in resArray) {
                val item = SubtitleItem()
                item.layers = it[0]
                item.style = it[3]
                item.actor = it[4]
                item.marginL = it[5]
                item.marginR = it[6]
                item.marginV = it[7]
                item.effect = it[8]

                item.startPosition = convertMSeconds(it[1])
                item.endPosition = convertMSeconds(it[2])

                var caption = it[9]
                caption = caption.replace("{\\K\\2c}", "")

                val mRegex = "\\{.*?\\}".toRegex()
                if (mRegex.find(caption) == null) {
                    val captItem = SubtitleItem.CaptionItem()
                    captItem.caption = caption
                    captItem.duration = (item.endPosition - item.startPosition).toFloat()
                    item.captions += captItem
                    this.captions += item
                    continue
                }
                val captions = mRegex.findAll(caption)
                for (captionItem in captions) {
                    val groupVal = captionItem.groupValues[0]
                    var lastIndex = caption.length

                    if (captionItem.next() != null) lastIndex = captionItem.next()!!.range.first

                    var strSubtitle = caption.substring(captionItem.range.last + 1, lastIndex)
                    strSubtitle = strSubtitle.replace("\\n", "\\N")
                    strSubtitle = strSubtitle.replace("\\N", "<br/>\\N")
                    val subTitleArr = strSubtitle.split("\\N").filter { sub -> sub != "" }

                    val color = getColor(groupVal)
                    val font = getFont(groupVal)
                    val duration = getDuration(groupVal)
//                    if (duration == 0f) {
//                        duration = (item.endPosition - item.startPosition).toFloat()
//                    }
                    val tWidth = txtWidth(strSubtitle)

                    if (subTitleArr.isEmpty()) {
                        val captItem = SubtitleItem.CaptionItem()
                        captItem.caption = ""
                        captItem.duration = duration
                        captItem.color = color
                        captItem.font = font
                        item.captions += captItem
                    } else {
                        subTitleArr.forEach { subtitle ->
                            val captItem = SubtitleItem.CaptionItem()

                            val weight = txtWidth(subtitle).div(tWidth)
                            val subDuration = duration.times(weight)
                            captItem.duration = subDuration
                            captItem.color = color
                            captItem.font = font
                            captItem.caption = subtitle
                            item.captions += captItem
                        }
                    }
                }
                this.captions += item
            }
        } catch (err: Exception) {
            err.printStackTrace()
        }
    }

    private fun txtWidth(tP: String?): Float {
        if (tP == null) return 0f
        var text = tP
        text = text.replace("\\n", "")
        text = text.replace("\\N", "")
        text = text.replace("<br/>", "")
        text = text.replace("<br>", "")
        val paint = Paint()
        paint.textSize = 20f
        return paint.measureText(text, 0, text.length)
    }

    fun getHtml(position: Long?, isPlaying: Boolean): String {
        if (position == null) return ""
        var item = SubtitleItem()
        captions.forEach {
            if (it.isContains(position)) {
                item = it
            }
        }
        if (item.captions.isEmpty()) return ""

        var style = ""
        var content = ""
        val script = ""
        val meta = ""

        var spentDuration = (position - item.startPosition)
        if (position <= item.startPosition) spentDuration = -1

        var totalDelay = 0f
        var animationDelay = 0f
        item.captions.forEachIndexed { index, captionItem ->
            val text = captionItem.caption
            var startWidth = 0
            var color: String? = null

            var duration = captionItem.duration
            if(duration <= 0) {
                color = captionItem.color
            }
            if (spentDuration > 0f && totalDelay < spentDuration) {
                when {
                    totalDelay + duration < spentDuration -> {
                        startWidth = 100
                        duration = 0f
                    }
                    totalDelay < spentDuration  -> {
                        startWidth = ((spentDuration - totalDelay).div(duration) * 100).toInt()
                        duration -= (spentDuration - totalDelay)
                    }
                }
            }

            Log.d( "getHtml: startWidth", startWidth.toString())
            if (startWidth > 100) startWidth = 100

            style += genAnimation(index, duration, animationDelay, startWidth, color)
            totalDelay += captionItem.duration
            animationDelay += duration

            content += genText(index, text, color)
        }
        val status = if (isPlaying) "running" else "paused"
        style += ".word::after {animation-play-state: $status;};\n"

        return genHtml(meta, style, content, script)
    }

    private fun genAnimation(
        index: Int = 0,
        duration: Float = 0f,
        delay: Float = 0f,
        startWidth: Int = 0,
        color:String?
    ): String {
        var customKeyframe = ""
        var customStyle = ""
        if(color != null && color.isNotEmpty()) {
            customStyle = ".word_$index::after {color:$color}\n"
        }
        var animation = "run-text"
        if (startWidth > 0) {
            animation = "run-text-$index"
            customKeyframe = "   @keyframes $animation {\n" +
                    "        from { width: $startWidth% }\n" +
                    "        to { width: 100% }\n" +
                    "    }"
            customStyle += "word_$index::after {width: $startWidth%}\n"

        }
        return "$customKeyframe\n" +
                ".word_$index::after { animation: $animation ${duration}ms 1 linear ${delay}ms forwards; }\n" +
                "$customStyle\n"
    }

    private fun genText(index: Int = 0, text: String = "", color: String?): String {
        var datatext = text.trim()
        if (datatext == "<br/>") {
            return datatext
        }
        val brTag = if (datatext.contains("<br")) "<br/>\n" else ""
        datatext = datatext.replace("<br/>", "")
        datatext = datatext.replace("<br>", "")
        var cStyle = ""
        if (color != null) {
            cStyle = "style='color:$color'"
        }
        return "<span data-text='$datatext' class='word word_$index' $cStyle>$datatext</span>\n$brTag"
    }

    private fun genFonts(): String {
        return "@font-face {\n" +
                "    font-family: 'Arial Black';\n" +
                "    font-style: normal;\n" +
                "    font-weight: normal;\n" +
                "    src: local('Arial Black'), url('file:///android_asset/ARIBLK.woff') format('woff');\n" +
                "}" +
                "@font-face {\n" +
                "    font-family: 'Arial Bold';\n" +
                "    font-style: normal;\n" +
                "    font-weight: normal;\n" +
                "    src: local('Arial Bold'), url('file:///android_asset/ARIALBD.woff') format('woff');\n" +
                "}" +
                "@font-face {\n" +
                "    font-family: 'Arial';\n" +
                "    font-style: normal;\n" +
                "    font-weight: normal;\n" +
                "    src: local('Arial Regular'), url('file:///android_asset/ARIAL.woff') format('woff');\n" +
                "}"
    }

    private fun genHtml(
        meta: String? = "",
        css: String? = "",
        content: String? = "",
        js: String? = ""
    ): String {
        val fonts = genFonts()
        return "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    $meta\n" +
                "</head>\n" +
                "<style>\n" +
                "$fonts\n" +
                "    body {\n" +
                "        font-family:  Arial Bold;\n" +
                "        font-size: 18px;\n" +
                "        text-align: center;\n" +
                "        padding: 27px;\n" +
                "        text-shadow: rgb(0 0 0) -1px -1px 0.5px, rgb(0 0 0) -1px -2px 0.5px, rgb(0 0 0) -2px -1px 0.5px, rgb(0 0 0) -2px -2px 0.5px, rgb(0 0 0) -1px 0px 0.5px, rgb(0 0 0) -1px 0px 0.5px, rgb(0 0 0) -2px 0px 0.5px, rgb(0 0 0) -2px 0px 0.5px, rgb(0 0 0) -1px 1px 0.5px, rgb(0 0 0) -1px 2px 0.5px, rgb(0 0 0) -2px 1px 0.5px, rgb(0 0 0) -2px 2px 0.5px, rgb(0 0 0) 0px -1px 0.5px, rgb(0 0 0) 0px -2px 0.5px, rgb(0 0 0) 0px -1px 0.5px, rgb(0 0 0) 0px -2px 0.5px, rgb(0 0 0) 0px 0px 0.5px, rgb(0 0 0) 0px 1px 0.5px, rgb(0 0 0) 0px 2px 0.5px, rgb(0 0 0) 0px 1px 0.5px, rgb(0 0 0) 0px 2px 0.5px, rgb(0 0 0) 1px -1px 0.5px, rgb(0 0 0) 1px -2px 0.5px, rgb(0 0 0) 2px -1px 0.5px, rgb(0 0 0) 2px -2px 0.5px, rgb(0 0 0) 1px 0px 0.5px, rgb(0 0 0) 1px 0px 0.5px, rgb(0 0 0) 2px 0px 0.5px, rgb(0 0 0) 2px 0px 0.5px, rgb(0 0 0) 1px 1px 0.5px, rgb(0 0 0) 1px 2px 0.5px, rgb(0 0 0) 2px 1px 0.5px, rgb(0 0 0) 2px 2px 1px\n" +
                "    }\n" +
                "    .word {\n" +
                "        position: relative;\n" +
                "        white-space: nowrap;\n" +
                "        color: white;\n" +
                "    }\n" +
                "    .word::after {\n" +
                "        content: attr(data-text);\n" +
                "        position: absolute;\n" +
                "        left: 0;\n" +
                "        top: 0;\n" +
                "        color: #0083ff;\n" +
                "        overflow: hidden;\n" +
                "        width: 0;\n" +
                "    }\n" +
                "    @keyframes run-text {\n" +
                "        from { width: 0 }\n" +
                "        to { width: 100% }\n" +
                "    }" +
                "    $css\n" +
                "</style>\n" +
                "<body>\n" +
                "    $content\n" +
                "</body>\n" +
                "<script type=\"text/javascript\">\n" +
                "$js\n" +
                "</script>\n" +
                "</html>"
    }

}