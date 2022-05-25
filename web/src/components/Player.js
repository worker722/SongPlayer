import React, { useState, useEffect, createRef, useCallback, useMemo, memo } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import styled from 'styled-components';
import backlight from '../libs/backlight';
import { isPlaying } from '../utils';

const Style = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    padding: 20px;

    .video {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        position: relative;

        video {
            position: relative;
            z-index: 10;
            outline: none;
            max-height: 100%;
            max-width: 100%;
            box-shadow: 0px 5px 25px 5px rgb(0 0 0 / 80%);
            background-color: #000;
            cursor: pointer;
            display:none;
        }
        img {
            width:100%;
            height:100%;
            object-fit: contain;
        }

        .subtitle {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: absolute;
            z-index: 20;
            left: 0;
            right: 0;
            bottom: 5%;
            width: 100%;
            padding: 0 20px;
            user-select: none;
            pointer-events: none;

            .operate {
                padding: 5px 15px;
                color: #fff;
                font-size: 13px;
                border-radius: 3px;
                margin-bottom: 5px;
                background-color: rgb(0 0 0 / 75%);
                border: 1px solid rgb(255 255 255 / 20%);
                cursor: pointer;
                pointer-events: all;
            }

            .textarea {
                width: 100%;
                outline: none;
                resize: none;
                text-align: center;
                line-height: 1.2;
                border: none;
                color: #fff;
                font-size: 20px;
                padding: 5px 10px;
                user-select: all;
                pointer-events: all;
                background-color: rgb(0 0 0 / 0);
                text-shadow: rgb(0 0 0) 1px 0px 1px, rgb(0 0 0) 0px 1px 1px, rgb(0 0 0) -1px 0px 1px,
                    rgb(0 0 0) 0px -1px 1px;

                &.pause {
                    background-color: rgb(0 0 0 / 50%);
                }
            }
        }
    }
`;

const VideoWrap = memo(
    ({ setPlayer, setCurrentTime, setPlaying }) => {
        const $video = createRef();

        useEffect(() => {
            setPlayer($video.current);
            (function loop() {
                window.requestAnimationFrame(() => {
                    if ($video.current) {
                        setPlaying(isPlaying($video.current));
                        setCurrentTime($video.current.currentTime || 0);
                    }
                    loop();
                });
            })();
        }, [setPlayer, setCurrentTime, setPlaying, $video]);

        const onClick = useCallback(() => {
            if ($video.current) {
                if (isPlaying($video.current)) {
                    $video.current.pause();
                } else {
                    $video.current.play();
                }
            }
        }, [$video]);

        return (
            <>
                <video onClick={onClick} src="/sample.m4a?t=1" ref={$video} />
                <img src="/ricardo_arjona_blanco_portada.jpg" alt="" />
            </>
        )
    },
    () => true,
);

export default function Player(props) {
    const [currentSub, setCurrentSub] = useState(null);
    const $player = createRef();

    useEffect(() => {
        if ($player.current && props.player && !backlight.state) {
            backlight.state = true;
            backlight($player.current, props.player);
        }
    }, [$player, props.player]);

    useMemo(() => {
        setCurrentSub(props.subtitle[props.currentIndex]);
    }, [props.subtitle, props.currentIndex]);

    const onClick = useCallback(
        (event) => {
            if (props.playing) {
                props.player.pause();
            } else {
                props.player.play();
            }
        },
        [props],
    );


    var sub_text = currentSub?.slices?.map?.(item => item.fragments?.map(tmp => tmp.text)?.join(""))?.join?.("")
    sub_text = sub_text?.replace("\\N", "\n")
    return (
        <Style className="player">
            <div className="video" ref={$player} onClick={onClick}>
                <VideoWrap {...props} />
                {props.player && currentSub ? (
                    <div className="subtitle">
                        <TextareaAutosize
                            className={`textarea ${!props.playing ? 'pause' : ''}`}
                            value={sub_text}
                            spellCheck={false}
                            disabled={true}
                        />
                    </div>
                ) : null}
            </div>
        </Style>
    );
}
