import styled from 'styled-components';
import React, { useState, useCallback, useEffect } from 'react';
import { Table } from 'react-virtualized';
import debounce from 'lodash/debounce';
import SubwordsItem from "./SubWordsItem"

const Style = styled.div`
    position: relative;
    box-shadow: 0px 5px 25px 5px rgb(0 0 0 / 80%);
    background-color: rgb(0 0 0 / 100%);
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

export default function Subwords({ currentIndex, subtitle, player }) {
    const [height, setHeight] = useState(100);

    const resize = useCallback(() => {
        setHeight(document.body.clientHeight - 170);
    }, [setHeight]);

    useEffect(() => {
        resize();
        if (!resize.init) {
            resize.init = true;
            const debounceResize = debounce(resize, 500);
            window.addEventListener('resize', debounceResize);
        }
    }, [resize]);

    const slices = subtitle[currentIndex]?.slices

    return (
        <Style className="subwords">
            {slices?.length > 0 ?
                <>
                    <div className='details'>
                        <p>Duration: {Math.floor((subtitle[currentIndex].endTime - subtitle[currentIndex].startTime) * 100)}</p>
                        <p>Style: {subtitle[currentIndex].style}</p>
                    </div>
                    {
                        slices.map((item, index) => (
                            item.fragments.map((fragment, frag_index) => (
                                <SubwordsItem key={`${index}_${frag_index}`} data={fragment} />
                            ))
                            // <Table
                            //     key={index}
                            //     headerHeight={40}
                            //     width={300}
                            //     height={height}
                            //     rowHeight={80}
                            //     scrollToIndex={currentIndex}
                            //     rowCount={item.fragments?.length || 0}
                            //     rowGetter={({ index }) => item.fragments[index]}
                            //     headerRowRenderer={() => null}
                            //     rowRenderer={(props) => <SubwordsItem {...props} />}
                            // />
                        ))
                    }
                </>
                :
                <></>
            }
        </Style>
    );
}
