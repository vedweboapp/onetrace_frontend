import React from "react"
import { ColorPicker, useColor } from "react-color-palette";
import "react-color-palette/css";
interface ColorPaletteType { color: any, setColor: (color: any) => void }


const ColorPallete = ({ color, setColor }: ColorPaletteType) => {
    return (
        <div>
            <ColorPicker color={color} onChange={setColor} />
        </div>
    )
}

export default ColorPallete