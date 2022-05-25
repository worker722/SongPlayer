import styled from 'styled-components';
import React, { useState, useCallback, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { AiFillCheckCircle, AiFillCloseCircle } from "react-icons/ai";

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
`;

export default function SubwordsItem({ data, onSave }) {

    const [isUpdated, setIsUpdated] = useState(false)
    const [subWord, setSubWord] = useState('')
    const [subTag, setSubTag] = useState({})
    useEffect(() => {
        const txt = data.text?.replace("\\N", "\n")
        setSubWord(txt)
        setSubTag(data.tag)
    }, [data])

    const saveItem = useCallback(() => {
        onSave()
    }, [onSave])

    const discardItem = useCallback(() => {
        const txt = data.text?.replace("\\N", "\n")
        setSubWord(txt)
        setSubTag(data.tag)
    }, [data])

    return (
        <Style className="subwords-item">
            <div className="item">
                <div style={{ flex: 1 }}>
                    <TextareaAutosize
                        className={`textarea`}
                        value={subWord}
                        spellCheck={false}
                        onChange={(event) => setSubWord(event.target.value)}
                    />
                    <input type='number' value={subTag.kf || 0} style={{ width: 80, height: 20 }} onChange={console.log} />
                    {/* #{tag.c1} */}
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
