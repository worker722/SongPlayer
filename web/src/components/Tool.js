import styled from 'styled-components';
import { t, Translate } from 'react-i18nify';
import React, { useState, useCallback } from 'react';
import { getExt, download } from '../utils';
import { file2sub, sub2vtt, sub2srt, sub2txt } from '../libs/readSub';
import FFmpeg from '@ffmpeg/ffmpeg';
import SimpleFS from '@forlagshuset/simple-fs';
import { decompile } from 'ass-compiler';

const Style = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 20px;
    position: relative;
    overflow: hidden;
    background-color: rgb(0 0 0 / 100%);
    border-left: 1px solid rgb(255 255 255 / 20%);

    .file {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
    }
    .burn {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        border-bottom: 1px solid rgb(255 255 255 / 20%);

        .btn {
            position: relative;
            opacity: 0.85;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 35px;
            width: 100%;
            border-radius: 3px;
            color: #fff;
            cursor: pointer;
            font-size: 13px;
            background-color: #673ab7;
            transition: all 0.2s ease 0s;

            &:hover {
                opacity: 1;
            }
        }
    }

    .export {
        padding: 10px;
        border-bottom: 1px solid rgb(255 255 255 / 20%);

        .btn {
            position: relative;
            opacity: 0.85;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 35px;
            width: 100%;
            margin-top:5px;
            border-radius: 3px;
            color: #fff;
            cursor: pointer;
            font-size: 13px;
            background-color: #009688;
            transition: all 0.2s ease 0s;

            &:hover {
                opacity: 1;
            }
        }
    }

    .operate {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        border-bottom: 1px solid rgb(255 255 255 / 20%);

        .btn {
            position: relative;
            opacity: 0.85;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 35px;
            width: 48%;
            border-radius: 3px;
            color: #fff;
            cursor: pointer;
            font-size: 13px;
            background-color: #009688;
            transition: all 0.2s ease 0s;

            &:hover {
                opacity: 1;
            }
        }
    }

    .hotkey {
        padding: 10px;

        span {
            width: 100%;
            height:20px;
            font-size: 13px;
            padding: 5px;
            border-radius: 3px;
            text-align: center;
            color: rgb(255 255 255 / 75%);
            background-color: rgb(255 255 255 / 20%);
        }
    }

    .bottom {
        padding: 10px;
        a {
            display: flex;
            flex-direction: column;
            border: 1px solid rgb(255 255 255 / 30%);
            text-decoration: none;

            .title {
                color: #ffeb3b;
                padding: 5px 10px;
                animation: animation 3s infinite;
                border-bottom: 1px solid rgb(255 255 255 / 30%);
            }

            @keyframes animation {
                50% {
                    color: #00bcd4;
                }
            }

            img {
                max-width: 100%;
            }
        }
    }

    .progress {
        position: fixed;
        left: 0;
        top: 0;
        right: 0;
        z-index: 9;
        height: 2px;
        background-color: rgb(0 0 0 / 50%);

        span {
            display: inline-block;
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 0;
            height: 100%;
            background-color: #ff9800;
            transition: all 0.2s ease 0s;
        }
    }
`;

FFmpeg.createFFmpeg({ log: true }).load();
const fs = new SimpleFS.FileSystem();

export default function Header({
    player,
    waveform,
    newSub,
    undoSubs,
    clearSubs,
    subtitle,
    assOrigin,
    setLoading,
    setSubtitle,
    setAssOrigin,
    setProcessing,
    notify,
}) {
    const [videoFile, setVideoFile] = useState(null);

    const decodeAudioData = useCallback(
        async (file) => {
            try {
                const { createFFmpeg, fetchFile } = FFmpeg;
                const ffmpeg = createFFmpeg({ log: true });
                ffmpeg.setProgress(({ ratio }) => setProcessing(ratio * 100));
                setLoading(t('LOADING_FFMPEG'));
                await ffmpeg.load();
                ffmpeg.FS('writeFile', file.name, await fetchFile(file));
                setLoading('');
                notify({
                    message: t('DECODE_START'),
                    level: 'info',
                });
                const output = `${Date.now()}.mp3`;
                await ffmpeg.run('-i', file.name, '-ac', '1', '-ar', '8000', output);
                const uint8 = ffmpeg.FS('readFile', output);
                // download(URL.createObjectURL(new Blob([uint8])), `${output}`);
                await waveform.decoder.decodeAudioData(uint8);
                waveform.drawer.update();
                setProcessing(0);
                ffmpeg.setProgress(() => null);
                notify({
                    message: t('DECODE_SUCCESS'),
                    level: 'success',
                });
            } catch (error) {
                setLoading('');
                setProcessing(0);
                notify({
                    message: t('DECODE_ERROR'),
                    level: 'error',
                });
            }
        },
        [waveform, notify, setProcessing, setLoading],
    );

    const burnSubtitles = useCallback(async () => {
        try {
            const { createFFmpeg, fetchFile } = FFmpeg;
            const ffmpeg = createFFmpeg({ log: true });
            ffmpeg.setProgress(({ ratio }) => setProcessing(ratio * 100));
            setLoading(t('LOADING_FFMPEG'));
            await ffmpeg.load();
            setLoading(t('LOADING_FONT'));

            await fs.mkdir('/fonts');
            const fontExist = await fs.exists('/fonts/Microsoft-YaHei.ttf');
            if (fontExist) {
                const fontBlob = await fs.readFile('/fonts/Microsoft-YaHei.ttf');
                ffmpeg.FS('writeFile', `tmp/Microsoft-YaHei.ttf`, await fetchFile(fontBlob));
            } else {
                const fontUrl = 'https://cdn.jsdelivr.net/gh/zhw2590582/SubPlayer/docs/Microsoft-YaHei.ttf';
                const fontBlob = await fetch(fontUrl).then((res) => res.blob());
                await fs.writeFile('/fonts/Microsoft-YaHei.ttf', fontBlob);
                ffmpeg.FS('writeFile', `tmp/Microsoft-YaHei.ttf`, await fetchFile(fontBlob));
            }
            setLoading(t('LOADING_VIDEO'));
            ffmpeg.FS(
                'writeFile',
                videoFile ? videoFile.name : 'sample.m4a',
                await fetchFile(videoFile || 'sample.m4a'),
            );
            setLoading(t('LOADING_SUB'));
            const subtitleFile = new File([new Blob([decompile({ ...assOrigin, dialogues: subtitle })])], 'subtitle.ass');
            ffmpeg.FS('writeFile', subtitleFile.name, await fetchFile(subtitleFile));
            setLoading('');
            notify({
                message: t('BURN_START'),
                level: 'info',
            });
            const output = `${Date.now()}.mp4`;
            await ffmpeg.run(
                '-i',
                videoFile ? videoFile.name : 'sample.m4a',
                '-vf',
                `ass=${subtitleFile.name}:fontsdir=/tmp`,
                '-preset',
                videoFile ? 'fast' : 'ultrafast',
                output,
            );
            const uint8 = ffmpeg.FS('readFile', output);
            download(URL.createObjectURL(new Blob([uint8])), `${output}`);
            setProcessing(0);
            ffmpeg.setProgress(() => null);
            notify({
                message: t('BURN_SUCCESS'),
                level: 'success',
            });
        } catch (error) {
            setLoading('');
            setProcessing(0);
            notify({
                message: t('BURN_ERROR'),
                level: 'error',
            });
        }
    }, [notify, setProcessing, setLoading, videoFile, assOrigin, subtitle]);

    const onVideoChange = useCallback(
        (event) => {
            const file = event.target.files[0];
            if (file) {
                const ext = getExt(file.name);
                const canPlayType = player.canPlayType(file.type);
                if (canPlayType === 'maybe' || canPlayType === 'probably') {
                    setVideoFile(file);
                    decodeAudioData(file);
                    const url = URL.createObjectURL(new Blob([file]));
                    waveform.decoder.destroy();
                    waveform.drawer.update();
                    waveform.seek(0);
                    player.currentTime = 0;
                    clearSubs();
                    setSubtitle([
                        newSub({
                            start: 0,
                            end: 100,
                            text: t('SUB_TEXT'),
                        }),
                    ]);
                    player.src = url;
                } else {
                    notify({
                        message: `${t('VIDEO_EXT_ERR')}: ${file.type || ext}`,
                        level: 'error',
                    });
                }
            }
        },
        [newSub, notify, player, setSubtitle, waveform, clearSubs, decodeAudioData],
    );

    const onSubtitleChange = useCallback(
        (event) => {
            const file = event.target.files[0];
            if (file) {
                const ext = getExt(file.name);
                if (['ass', 'vtt', 'srt', 'json'].includes(ext)) {
                    file2sub(file)
                        .then((res) => {
                            // clearSubs();
                            setSubtitle(res.dialogues);
                            setAssOrigin(res.ass_origin)
                        })
                        .catch((err) => {
                            notify({
                                message: err.message,
                                level: 'error',
                            });
                        });
                } else {
                    notify({
                        message: `${t('SUB_EXT_ERR')}: ${ext}`,
                        level: 'error',
                    });
                }
            }
        },
        [notify, setSubtitle, setAssOrigin, clearSubs],
    );

    const onInputClick = useCallback((event) => {
        event.target.value = '';
    }, []);

    const downloadSub = useCallback(
        (type) => {
            let text = '';
            const name = `${Date.now()}.${type}`;
            switch (type) {
                case 'vtt':
                    text = sub2vtt(subtitle);
                    break;
                case 'srt':
                    text = sub2srt(subtitle);
                    break;
                case 'ass':
                    text = decompile({ ...assOrigin, dialogues: subtitle });
                    break;
                case 'txt':
                    text = sub2txt(subtitle);
                    break;
                case 'json':
                    text = JSON.stringify(subtitle);
                    break;
                default:
                    break;
            }
            const url = URL.createObjectURL(new Blob([text]));
            download(url, name);
        },
        [subtitle, assOrigin],
    );

    return (
        <Style className="tool">
            <div className="top">
                <div className="burn">
                    <div className="btn">
                        <Translate value="OPEN_VIDEO" />
                        <input className="file" type="file" onChange={onVideoChange} onClick={onInputClick} />
                    </div>
                </div>
                <div className="burn">
                    <div className="btn">
                        <Translate value="OPEN_SUB" />
                        <input className="file" type="file" onChange={onSubtitleChange} onClick={onInputClick} />
                    </div>
                </div>
                {window.crossOriginIsolated ? (
                    <div className="burn" onClick={burnSubtitles}>
                        <div className="btn">
                            <Translate value="EXPORT_VIDEO" />
                        </div>
                    </div>
                ) : null}
                <div className="export">
                    <div className="btn" onClick={() => downloadSub('ass')}>
                        <Translate value="EXPORT_ASS" />
                    </div>
                    {/* <div className="btn" onClick={() => downloadSub('srt')}>
                        <Translate value="EXPORT_SRT" />
                    </div>
                    <div className="btn" onClick={() => downloadSub('vtt')}>
                        <Translate value="EXPORT_VTT" />
                    </div> */}
                </div>
                <div className="operate">
                    <div
                        className="btn"
                        onClick={() => {
                            if (window.confirm(t('CLEAR_TIP')) === true) {
                                clearSubs();
                                window.location.reload();
                            }
                        }}
                    >
                        <Translate value="CLEAR" />
                    </div>
                    <div className="btn" onClick={undoSubs}>
                        <Translate value="UNDO" />
                    </div>
                </div>
                <br />
                <div className="hotkey">
                    <span>
                        <Translate value="HOTKEY_01" />
                    </span>
                    <br />
                    <br />
                    <span>
                        <Translate value="HOTKEY_02" />
                    </span>
                </div>
            </div>
        </Style>
    );
}
