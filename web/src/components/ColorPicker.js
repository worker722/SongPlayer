import React from 'react'
import { SketchPicker } from 'react-color'
import reactCSS from 'reactcss'

class ColorPicker extends React.Component {
    state = {
        showPicker: false,
    };

    onClick = () => {
        this.setState({ showPicker: !this.state.showPicker })
    };

    onClose = () => {
        this.setState({ showPicker: false })
    };

    onChange = (color) => {
        this.props.onChange(color.hex);
    };
    onRemoveColor = () => {
        this.onChange({ hex: "" });
    }

    render() {
        const styles = reactCSS({
            'default': {
                color: {
                    width: '30px',
                    cursor: 'pointer',
                    height: '20px',
                    borderRadius: '3px',
                    background: `${this.props.color || '#fff'}`,
                    color: "#000"
                },
                popover: {
                    position: 'absolute',
                    zIndex: '3',
                },
                cover: {
                    position: 'fixed',
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px',
                },
                swatch: {
                    padding: '4px',
                    background: '#ffffff',
                    borderRadius: '2px',
                    display: 'inline-block',
                    position: "relative",
                    boxShadow: '0 0 0 1px rgba(0,0,0,.2)',
                },
                times: {
                    cursor: 'pointer',
                    position: 'absolute',
                    fontSize: 20,
                    top: 0,
                    right: -20
                }
            },
        });

        return (
            <div>
                <div style={styles.swatch}>
                    <div style={styles.color} onClick={this.onClick}>{!this.props.color ? "None" : ""}</div>
                    {this.props.color && <span style={styles.times} onClick={this.onRemoveColor}>x</span>}
                </div>
                {this.state.showPicker ?
                    <div style={styles.popover}>
                        <div style={styles.cover} onClick={this.onClose} />
                        <SketchPicker color={this.props.color} onChange={this.onChange} />
                    </div>
                    :
                    null
                }

            </div>
        )
    }
}

export default ColorPicker