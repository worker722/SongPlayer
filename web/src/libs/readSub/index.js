import { getExt } from '../../utils';
import { compile } from 'ass-compiler';

export function file2sub(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            const ext = getExt(file.name);
            if (ext === 'json') {
                try {
                    const sub = JSON.parse(reader.result)
                    resolve(sub);
                } catch (error) {
                    reject(error);
                }
            } else {
                const compiledASS = compile(reader.result);
                const ass_origin = { ...compiledASS, dialogues: [] }
                var dialogues = compiledASS.dialogues
                dialogues = dialogues.map(item => {
                    const startTime = item.start
                    const endTime = item.end
                    return { ...item, startTime, endTime }
                })
                resolve({ ass_origin, dialogues })
            }
        };
        reader.readAsText(file);
    });
}

export function sub2vtt(sub) {
    return (
        'WEBVTT\n\n' +
        sub
            .map((item, index) => {
                return index + 1 + '\n' + item.start + ' --> ' + item.end + '\n' + item.text;
            })
            .join('\n\n')
    );
}

export function sub2srt(sub) {
    return sub
        .map((item, index) => {
            return `${index + 1}\n${item.start.replace('.', ',')} --> ${item.end.replace('.', ',')}\n${item.text}`;
        })
        .join('\n\n');
}

export function sub2txt(sub) {
    return sub.map((item) => item.text).join('\n\n');
}
