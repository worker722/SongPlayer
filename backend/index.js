import fetch from "node-fetch"
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from "fs"

const _DEBUGGING = false

const KEY = `MwQtoiwQQpdrQrHvOPFQfQtt`
const style = "Primer cantante"

const _SEND_REQUEST = (url, method = 'GET', body = '') => {
    const headers = { "Authorization": `Bearer ${KEY}` }
    return fetch(`https://api.sonix.ai/v1/${url}`, {
        headers, method, ...(method == "POST" && { body })
    })
}
const padTo2Digits = (num) => {
    return Math.floor(num).toString().padStart(2, '0');
}
const convertDate = (sec) => {
    let ms = (sec - Math.floor(sec)) * 100
    let secs = Math.floor(sec)
    let mins = Math.floor(sec / 60)
    let hours = Math.floor(mins / 60);

    secs = secs % 60;
    mins = mins % 60;
    hours = hours % 24;

    return `${padTo2Digits(hours)}:${padTo2Digits(mins)}:${padTo2Digits(secs)}.${padTo2Digits(ms)}`;
}
const getResult = (title, content) => {
    return `[Script Info]\n` +
        `; This is an Advanced Sub Station Alpha v4+ script.\n` +
        `Title: ${title}\n` +
        `ScriptType: v4.00+\n` +
        `Collisions: Normal\n` +
        `PlayDepth: 0\n\n` +
        `[V4+ Styles]\n` +
        `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
        `Style: Primer cantante,arial bold,32,&H00FF8300,&H03F7FEFF,&H00000000,&H02FFFFFF,-1,0,0,0,100,100,0,0,1,3.0,0.0,2,10,10,30,1\n` +
        `Style: Segundo cantante,arial bold,32,&H0000169E,&H03F0F6FF,&H00000000,&H02FFFFFF,-1,0,0,0,100,100,0,0,1,3.0,0.0,2,10,10,30,1\n` +
        `Style: Ambos,arial bold,32,&H00CB00FF,&H03F7FEFF,&H00000000,&H02FFFFFF,-1,0,0,0,100,100,0,0,1,3.0,0.0,2,10,10,30,1\n\n` +
        `[Events]\n` +
        `Format: Layer, Start, End, Style, Actor, MarginL, MarginR, MarginV, Effect, Text\n` +
        content
}
const getTextContent = (elements, colorOnly = false) => {
    var string = ""
    elements.forEach(word => {
        if (colorOnly) {
            string += `{\\c&HFFFFFF}${word.text || ''} `
        } else {
            string += `${word.pending > 0 ? `{\\K${word.pending}}` : ""}{\\K${word.delay || 0}}${word.text || ''} `
        }
    })
    return string
}
// const initial_time = 33.10 //seconds

const generateASS = (title, transcriptions, initial_time) => {
    var ass_lines = []

    var first_time = transcriptions[0].start_time

    ass_lines.push({ start: (first_time + initial_time - 3), end: (first_time + initial_time), word_items: [{ pending: 0, delay: 180, text: '1...2...3...' }] })

    transcriptions.forEach((element, tranIndex) => {
        var word_items = []

        element.words.forEach((el2, index) => {
            const duration = parseInt((el2.end_time - el2.start_time) * 100)

            var tmp = { pending: 0, delay: duration, text: el2.text.trim() }

            if (index > 0) {
                if (el2.start_time - element.words[index - 1].end_time > 0) {
                    const delay = parseInt((el2.start_time - element.words[index - 1].end_time) * 100)
                    tmp.pending = delay
                }
            }
            word_items.push(tmp)
        });

        const start = (element.start_time + initial_time)
        const end = (element.end_time + initial_time)

        ass_lines.push({ start, end, word_items })

    });

    var ass_content = ""

    ass_lines.forEach((element, assIndex) => {
        var string = getTextContent(element.word_items)

        const isLast = ass_lines.length - 1 == assIndex
        const start = convertDate(element.start)
        const end = convertDate(element.end)

        const isFront = assIndex % 2 == 1

        var additional_text = ''
        if (!isLast) {
            additional_text = getTextContent(ass_lines[assIndex + 1].word_items, true)
            string = `${isFront ? `${additional_text}\\N` : ''}${string}${!isFront ? `\\N${additional_text}` : ''}`
        }

        ass_content += `Dialogue: 0,${start},${end},${style},,0,0,0,,${string}\n`
    })

    const last_time = transcriptions[transcriptions.length - 1].end_time

    const start = convertDate(last_time)
    const end = convertDate(last_time + 540)

    ass_content += `Dialogue: 0,${start},${end},${style},,0,0,0,,{\\c&H00FF8300&}*Karamato*\n`
    return getResult(title, ass_content)
}

const main = async (title, lyrics, song, file_url, initial_time, selectedSong) => {
    try {
        initial_time = parseFloat(initial_time)
    } catch (error) {
        initial_time = 10
    }

    const start_time = new Date()
    var id = selectedSong
    if (!selectedSong || selectedSong == "" || selectedSong == "null" || selectedSong == "NULL") {
        var form = new URLSearchParams();
        form.append('language', 'es');
        form.append('name', `${title || ''} - ${song || ''}`);
        form.append('file_url', file_url);
        form.append('transcript_text', lyrics)

        console.log("Uploading file...")
        var send_res = await _SEND_REQUEST("media", "POST", form)
        send_res = await send_res.json()
        console.log("Uploaded.")
        id = send_res.id
    }
    // var id = "vDl8AAev"
    while (true) {
        var get_status = await _SEND_REQUEST(`media/${id}`)
        get_status = await get_status.json()
        console.log(`Get status => ${get_status.status}`)
        if (get_status.status == 'completed') break
        else if (get_status.status == 'duplicate') {
            _SEND_REQUEST(`media/${id}`, 'DELETE').catch(console.error)
            id = get_status.duplicate_media_id
            console.log(`Duplicated ${id}`)
        } else if (get_status.status == 'failed') {
            console.log("failed", get_status)
            return { success: false }
        }
        await new Promise((resolve, _) => setTimeout(resolve, 1000))
    }
    console.log(`Getting transcript...`)
    var transcript = await _SEND_REQUEST(`media/${id}/transcript.json`)
    transcript = await transcript.json()
    const result = generateASS(title, transcript.transcript, initial_time)
    const end_time = new Date()
    console.log("Done", (end_time.getTime() - start_time.getTime()) / 1000)
    if (_DEBUGGING) {
        fs.writeFileSync('./result.ass', result)
    }
    return { data: result, success: true }
}


const app = express();

const server = http.createServer(app);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.get('/', (req, res) => res.send(`Service running: ${process.pid}`));
app.post('/ass-gen', async (req, res) => {
    const { name, lyrics, song, file_url, start_time, init_id } = req.body
    console.log(req.body)
    const data = await main(name, lyrics, song, file_url, start_time, init_id)
    res.send(data)
});
const SERVER_PORT = process.env.PORT || 8000;
server.listen(SERVER_PORT, () => {
    console.log(`listening on port ${SERVER_PORT} `);
});
if (_DEBUGGING) {
    // const file_url = `https://firebasestorage.googleapis.com/v0/b/karamato.appspot.com/o/Ricardo%20Arjona%20-%20Morir%20por%20Vivir%20-%20Vocals.m4a?alt=media&token=84c0e1d7-cf0d-4b55-b393-e7b748e3a828`
    // const name = "Morir por Vivir"
    // const lyrics = `Sabes que estamos de paso ...`
    // main(name, lyrics, file_url)
    const id = "vYk4a1qx" //hongos
    // const id = "2zZ0JW12" //minior
    main("name", "", "", "0", id)
}