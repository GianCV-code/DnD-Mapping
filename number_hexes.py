import os
import math
from PIL import Image, ImageDraw, ImageFont

def number_map():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_dir, "MAPS - Chult 2.0 PC.png")
    output_path = os.path.join(base_dir, "MAPS - Chult 2.0 PC - Numerado.png")
    overlay_path = os.path.join(base_dir, "MAPS - Chult 2.0 PC - Overlay_Numeros.png")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"No se encontró la imagen base: {input_path}")

    print(f"Cargando imagen: {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size

    # Crear capa transparente para los números
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)

    # Configuración de fuente y estilo (Alto contraste Wargame: Blanco con contorno negro)
    font_path = "C:/Windows/Fonts/georgiab.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/arialbd.ttf"
    font = ImageFont.truetype(font_path, 16)

    text_fill = (255, 255, 255, 255)
    stroke_fill = (0, 0, 0, 255)
    stroke_width = 2

    # Parámetros geométricos calculados con precisión milimétrica sobre la cuadrícula original
    col_dx = 110.85125168440817  # 192 / sqrt(3)
    col_0_x = 36.5
    total_cols = 26

    hex_count = 0

    for col_idx in range(total_cols):
        col_num = col_idx + 1
        cx = col_0_x + col_idx * col_dx

        # Columnas impares (01, 03, 05...): 16 hexágonos completos
        if col_idx % 2 == 0:
            for r in range(16):
                row_num = r + 1
                cy = 63 + r * 128
                pos_y = cy - 46
                text = f"{col_num:02d}{row_num:02d}"

                bbox = font.getbbox(text)
                tw = bbox[2] - bbox[0]
                pos_x = min(max(cx - tw / 2, 8), w - tw - 8)

                draw_overlay.text(
                    (pos_x, pos_y),
                    text,
                    font=font,
                    fill=text_fill,
                    stroke_width=stroke_width,
                    stroke_fill=stroke_fill
                )
                hex_count += 1

        # Columnas pares (02, 04, 06...): fila 1 en borde superior, filas 2-16 intermedias, fila 17 en borde inferior
        else:
            # Fila 01 (borde superior)
            text_01 = f"{col_num:02d}01"
            bbox_01 = font.getbbox(text_01)
            tw_01 = bbox_01[2] - bbox_01[0]
            pos_x_01 = min(max(cx - tw_01 / 2, 8), w - tw_01 - 8)
            draw_overlay.text(
                (pos_x_01, 16),
                text_01,
                font=font,
                fill=text_fill,
                stroke_width=stroke_width,
                stroke_fill=stroke_fill
            )
            hex_count += 1

            # Filas 02 a 16
            for r in range(1, 16):
                row_num = r + 1
                cy = 127 + (r - 1) * 128
                pos_y = cy - 46
                text = f"{col_num:02d}{row_num:02d}"

                bbox = font.getbbox(text)
                tw = bbox[2] - bbox[0]
                pos_x = min(max(cx - tw / 2, 8), w - tw - 8)

                draw_overlay.text(
                    (pos_x, pos_y),
                    text,
                    font=font,
                    fill=text_fill,
                    stroke_width=stroke_width,
                    stroke_fill=stroke_fill
                )
                hex_count += 1

            # Fila 17 (borde inferior)
            text_17 = f"{col_num:02d}17"
            bbox_17 = font.getbbox(text_17)
            tw_17 = bbox_17[2] - bbox_17[0]
            pos_x_17 = min(max(cx - tw_17 / 2, 8), w - tw_17 - 8)
            draw_overlay.text(
                (pos_x_17, 1995),
                text_17,
                font=font,
                fill=text_fill,
                stroke_width=stroke_width,
                stroke_fill=stroke_fill
            )
            hex_count += 1

    # Guardar overlay transparente
    overlay.save(overlay_path)
    print(f"Overlay transparente guardado: {overlay_path}")

    # Combinar con mapa base y guardar imagen completa
    final_img = Image.alpha_composite(img, overlay)
    final_img.save(output_path)
    print(f"Mapa numerado guardado: {output_path}")
    print(f"Total de hexágonos numerados: {hex_count}")

if __name__ == "__main__":
    number_map()
