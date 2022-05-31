import styled from 'styled-components';
import React, { useState, useCallback, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { AiFillCheckCircle, AiFillCloseCircle } from "react-icons/ai";
import ColorPicker from './ColorPicker'

const Style = styled.div`
    padding: 10px;
    margin-top: 10px;
    border: none;
    width: 100%;
    color: #fff;
    font-size: 12px;
    padding: 10px;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display:inline-block;

    .item {
        display: inline-flex;
    }

    .textarea {
        width: 80%;
        outline: none;
        resize: none;
        border: none;
        color: #fff;
        font-size: 14px;
        background-color: rgb(0 0 0 / 0);
    }
    .action {
        cursor: pointer;
        margin:2px;
    }
    .duration-input {
        width: 80px;
        height: 30px;
        background-color:transparent;
        border-bottom:1px solid white;
        margin-bottom:15px;
        color:#fff;
    }
`;

export default function SubwordsItem({ data, onSave, slice_index, frag_index }) {
    const [isUpdated, setIsUpdated] = useState(false)
    const [subWord, setSubWord] = useState('')
    const [subTag, setSubTag] = useState({})
    useEffect(() => {
        const txt = data.text?.replace("\\N", "\n")
        setSubWord(txt)

        var { c1: color, kf: duration } = data.tag
        if (color && !color.includes('#')) {
            color = `#${color}`;
        }
        if (!duration || duration < 0) {
            duration = 0
        }
        setSubTag({ ...data.tag, kf: duration, c1: color })
    }, [data])

    const saveItem = useCallback(() => {
        var reg = /^#([0-9a-f]{3}){1,2}$/i;

        var tag = { ...subTag }
        if (tag.c1) {
            if (!reg.test(tag.c1)) {
                alert("Put correct color");
                return;
            } else {
                tag = { ...tag, c1: tag.c1.replace("#", "") };
            }
        }

        setIsUpdated(false)
        onSave({
            ...data,
            text: subWord?.replace("\n", "\\N"),
            tag
        }, slice_index, frag_index);
    }, [subWord, subTag, onSave])

    const discardItem = useCallback(() => {
        setIsUpdated(false)
        const txt = data.text?.replace("\\N", "\n")
        setSubWord(txt)
        setSubTag(data.tag)
    }, [data])

    const onChangeSubWord = useCallback(event => {
        setSubWord(event.target.value)
        setIsUpdated(true)
    })

    const onChangeDuration = useCallback((event) => {
        setSubTag({
            ...subTag,
            kf: parseInt(event.target.value)
        })
        setIsUpdated(true)
    }, [subTag, setIsUpdated])
    const onChangeColor = useCallback((hexColor) => {
        setSubTag({
            ...subTag,
            c1: hexColor
        })
        setIsUpdated(true)
    }, [subTag, setIsUpdated])

    return (
        <Style className="subwords-item">
            <div className="item">
                <div style={{ flex: 1 }}>
                    <TextareaAutosize
                        className={`textarea`}
                        value={subWord}
                        spellCheck={false}
                        onChange={onChangeSubWord}
                    />
                    <input type='number' value={subTag.kf} className={'duration-input'} onChange={onChangeDuration} />
                    <ColorPicker color={subTag.c1} onChange={onChangeColor} />
                </div>
                {isUpdated &&
                    <>
                        <AiFillCheckCircle className='action' size={25} color={'#22bb33'} onClick={saveItem} />
                        <AiFillCloseCircle className='action' size={25} color={'#bb2124'} onClick={discardItem} />
                    </>
                }
            </div>
        </Style>
    );
}
