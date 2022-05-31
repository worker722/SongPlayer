import styled from 'styled-components';
import React, { useState, useCallback, useEffect } from 'react';
import _ from 'lodash';
import SubwordsItem from "./SubWordsItem"

const Style = styled.div`
    position: relative;
    box-shadow: 0px 5px 25px 5px rgb(0 0 0 / 80%);
    background-color: rgb(0 0 0 / 100%);
    overflow:scroll;
    .color-picker {
        position:absolute;
    }
    .details {
        padding:10px;
        p {
            font-size:16px;
        }
    }

    .ReactVirtualized__Table {
        .ReactVirtualized__Table__Grid {
            outline: none;
        }

        .ReactVirtualized__Table__row {
            .item {
                height: 100%;
                padding: 10px;
                border: none;
                width: 100%;
                height: 100%;
                color: #fff;
                font-size: 12px;
                padding: 10px;
                text-align: center;
                background-color: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.2s ease;
                resize: none;
                outline: none;
            }
        }
    }
`;

export default function Subwords(props) {
    // { currentIndex, subtitle, updateSub }
    const [subItem, setSubItem] = useState({ slices: [] })
    useEffect(() => {
        const subItem = props.subtitle[props.currentIndex] || { slices: [] }
        setSubItem(subItem)
    }, [props.subtitle, props.currentIndex])

    const OnSaveWords = useCallback((res_fragment, index, frag_index) => {
        var tmpSlices = [...subItem.slices]
        tmpSlices[index].fragments[frag_index] = res_fragment
        props.updateSub(subItem, { slices: tmpSlices }, true)
    }, [subItem, props.updateSub])

    return (
        <Style className="subwords">
            {subItem.slices.length > 0 ?
                <>
                    <div className='details'>
                        <p>Duration: {Math.floor((subItem.endTime - subItem.startTime) * 100)}</p>
                        <p>Style: {subItem.style}</p>
                    </div>
                    {subItem.slices.map((item, index) => (
                        item.fragments.map((fragment, frag_index) => (
                            <SubwordsItem
                                key={`${index}_${frag_index}`}
                                data={fragment}
                                slice_index={index}
                                frag_index={frag_index}
                                onSave={OnSaveWords} />
                        ))
                    ))}
                </>
                :
                <></>
            }
        </Style>
    );
}
