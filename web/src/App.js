import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import NotificationSystem from 'react-notification-system';
import _ from 'lodash';
import styled from 'styled-components';
import Tool from './components/Tool';
import Subtitles from './components/Subtitles';
import Subwords from './components/Subwords';
import Player from './components/Player';
import Footer from './components/Footer';
import Loading from './components/Loading';
import ProgressBar from './components/ProgressBar';
import { getKeyCode } from './utils';

const Style = styled.div`
    height: 100%;
    width: 100%;

    .main {
        display: flex;
        height: calc(100% - 200px);

        .player {
            flex: 1;
        }

        .subtitles {
            width: 250px;
        }

        .subwords {
            width: 300px;
        }

        .tool {
            width: 160px;
        }
    }

    .footer {
        height: 200px;
    }
`;

export default function App({ defaultLang }) {
    const subtitleHistory = useRef([]);
    const notificationSystem = useRef(null);
    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState('');
    const [processing, setProcessing] = useState(0);
    const [language, setLanguage] = useState(defaultLang);
    const [subtitle, setSubtitleOriginal] = useState([]);
    const [assOrigin, setAssOrigin] = useState({});
    const [waveform, setWaveform] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(-1);

    const newSub = useCallback((item) => {
        return {
            layer: 0,
            startTime: item.start, endTime: item.end,
            style: "Primer cantante",
            name: "",
            margin: {
                left: 10,
                right: 10,
                vertical: 30
            },
            effect: null,
            alignment: 2,
            slices: [
                {
                    style: "Primer cantante",
                    fragments: [
                        {
                            "tag": {
                                "kf": ((item.end - item.start) * 100).toFixed(2)
                            },
                            "text": item.text,
                            "drawing": null
                        }
                    ]
                }
            ],
            ...item,
        }
    }, []);
    const hasSub = useCallback((sub) => subtitle.indexOf(sub), [subtitle]);

    const formatSub = useCallback(
        (sub) => {
            if (Array.isArray(sub)) {
                return sub.map((item) => newSub(item));
            }
            return newSub(sub);
        },
        [newSub],
    );

    const setSubtitle = useCallback(
        (newSubtitle, saveToHistory = true) => {
            if (!_.isEqual(newSubtitle, subtitle)) {
                if (saveToHistory) {
                    if (subtitleHistory.current.length >= 1000) {
                        subtitleHistory.current.shift();
                    }
                    subtitleHistory.current.push(subtitle);
                }
                // window.localStorage.setItem('subtitle', JSON.stringify(newSubtitle));
                setSubtitleOriginal(newSubtitle);
            }
        },
        [subtitle, setSubtitleOriginal],
    );

    const undoSubs = useCallback(() => {
        const subs = subtitleHistory.current.pop();
        if (subs) {
            setSubtitle(subs, false);
        }
    }, [setSubtitle, subtitleHistory]);

    const clearSubs = useCallback(() => {
        setSubtitle([]);
        subtitleHistory.current.length = 0;
    }, [setSubtitle, subtitleHistory]);

    const checkSub = useCallback(
        (sub) => {
            const index = hasSub(sub);
            if (index < 0) return false;
            const duration = sub.end - sub.start
            var txt_duration = 0
            sub?.slices?.map((item, index) => (
                item.fragments?.map(tmp => "kf" in tmp.tag ? txt_duration += tmp.tag.kf : null)
            ))
            return (duration * 100) > txt_duration
        },
        [hasSub],
    );

    const notify = useCallback(
        (obj) => {
            // https://github.com/igorprado/react-notification-system
            const notification = notificationSystem.current;
            notification.clearNotifications();
            notification.addNotification({
                position: 'tc',
                dismissible: 'none',
                autoDismiss: 2,
                message: obj.message,
                level: obj.level,
            });
        },
        [notificationSystem],
    );

    const removeSub = useCallback(
        (sub) => {
            const index = hasSub(sub);
            if (index < 0) return;
            const subs = subtitle;
            subs.splice(index, 1);
            setSubtitle(subs);
        },
        [subtitle, hasSub, setSubtitle],
    );

    const addSub = useCallback(
        (index, sub) => {
            const subs = subtitle;
            subs.splice(index, 0, formatSub(sub));
            setSubtitle(subs);
        },
        [subtitle, setSubtitle, formatSub],
    );
    const cvNumber = (v) => Math.ceil(v * 100) / 100

    const updateSub = useCallback(
        (sub, obj, forceUpdate = false) => {
            const index = hasSub(sub);
            if (index < 0) return;
            const subs = _.cloneDeep(subtitle);

            if ('start' in obj) {
                obj.start = cvNumber(obj.start)
                obj.startTime = obj.start
            } else if ('end' in obj) {
                obj.end = cvNumber(obj.end)
                obj.endTime = obj.end
            } else if ('startTime' in obj) {
                obj.startTime = cvNumber(obj.startTime)
                obj.start = obj.startTime
            } else if ('endTime' in obj) {
                obj.endTime = cvNumber(obj.endTime)
                obj.end = obj.endTime
            }
            sub = { ...sub, ...obj }

            if (_.isEqual(subtitle, subs) && forceUpdate) {
                subs[index] = { ...sub, key: Math.ceil(Math.random() * 100) };
            } else {
                subs[index] = sub;
            }
            setSubtitle(subs);
        },
        [hasSub, subtitle, setSubtitle],
    );

    const mergeSub = useCallback(
        (sub) => {
            alert("comming soon")
            return
            const index = hasSub(sub);
            if (index < 0) return;
            const subs = subtitle;
            const next = subs[index + 1];
            if (!next) return;
            const merge = newSub({
                start: sub.start,
                end: next.end,
                text: sub.text.trim() + '\n' + next.text.trim(),
            });
            subs[index] = merge;
            subs.splice(index + 1, 1);
            setSubtitle(subs);
        },
        [hasSub, subtitle, setSubtitle, newSub],
    );

    const splitSub = useCallback(
        (sub, start) => {
            const index = hasSub(sub);
            if (index < 0 || !sub.text || !start) return;
            const subs = subtitle;
            const text1 = sub.text.slice(0, start).trim();
            const text2 = sub.text.slice(start).trim();
            if (!text1 || !text2) return;
            const splitDuration = (sub.duration * (start / sub.text.length)).toFixed(3);
            if (splitDuration < 0.2 || sub.duration - splitDuration < 0.2) return;
            subs.splice(index, 1);
            const middleTime = sub.startTime + parseFloat(splitDuration);
            subs.splice(
                index,
                0,
                newSub({
                    start: sub.start,
                    end: middleTime,
                    text: text1,
                }),
            );
            subs.splice(
                index + 1,
                0,
                newSub({
                    start: middleTime,
                    end: sub.end,
                    text: text2,
                }),
            );
            setSubtitle(subs);
        },
        [hasSub, subtitle, setSubtitle, newSub],
    );

    const onKeyDown = useCallback(
        (event) => {
            const keyCode = getKeyCode(event);
            switch (keyCode) {
                case 32:
                    event.preventDefault();
                    if (player) {
                        if (playing) {
                            player.pause();
                        } else {
                            player.play();
                        }
                    }
                    break;
                case 90:
                    event.preventDefault();
                    if (event.metaKey) {
                        undoSubs();
                    }
                    break;
                default:
                    break;
            }
        },
        [player, playing, undoSubs],
    );

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onKeyDown]);

    useMemo(() => {
        const currentIndex = subtitle.findIndex((item) => item.startTime <= currentTime && item.endTime > currentTime);
        setCurrentIndex(currentIndex);
    }, [currentTime, subtitle]);

    useEffect(() => {
        // const localSubtitleString = window.localStorage.getItem('subtitle');
        const fetchSubtitle = () =>
            fetch('/sample.json')
                .then((res) => res.json())
                .then((res) => {
                    var dialogues = res.dialogues
                    setAssOrigin({ ...res, dialogues: [] })
                    dialogues = dialogues.map(item => {
                        const startTime = item.start
                        const endTime = item.end
                    return { ...item, startTime, endTime }
                    })
                    setSubtitleOriginal(dialogues)
                });

        // if (localSubtitleString) {
        //     try {
        //         const localSubtitle = JSON.parse(localSubtitleString);
        //         if (localSubtitle) {
        //             setSubtitleOriginal(localSubtitle);
        //         } else {
        //             fetchSubtitle();
        //         }
        //     } catch (error) {
        //         fetchSubtitle();
        //     }
        // } else {
        //     fetchSubtitle();
        // }
        fetchSubtitle();
    }, [setSubtitleOriginal]);

    const props = {
        player,
        setPlayer,
        subtitle,
        setSubtitle,
        waveform,
        setWaveform,
        currentTime,
        setCurrentTime,
        currentIndex,
        setCurrentIndex,
        playing,
        setPlaying,
        language,
        setLanguage,
        loading,
        setLoading,
        setProcessing,
        subtitleHistory,
        assOrigin,
        setAssOrigin,

        notify,
        newSub,
        hasSub,
        checkSub,
        removeSub,
        addSub,
        undoSubs,
        clearSubs,
        updateSub,
        formatSub,
        mergeSub,
        splitSub,
    };
    return (
        <Style>
            <div className="main">
                <Player {...props} />
                <Subtitles {...props} />
                <Subwords {...props} />
                <Tool {...props} />
            </div>
            <Footer {...props} />
            {loading ? <Loading loading={loading} /> : null}
            {processing > 0 && processing < 100 ? <ProgressBar processing={processing} /> : null}
            <NotificationSystem ref={notificationSystem} allowHTML={true} />
        </Style>
    );
}
