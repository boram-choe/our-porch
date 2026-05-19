import os
from PIL import Image, ImageDraw

dir_path = "C:/Users/최보람/.gemini/antigravity/brain/1d96dcc9-738b-4e66-ae13-8965dddaad33/.tempmediaStorage"
star_path = os.path.join(dir_path, "media_1d96dcc9-738b-4e66-ae13-8965dddaad33_1778740517018.png")
text_path = os.path.join(dir_path, "media_1d96dcc9-738b-4e66-ae13-8965dddaad33_1778740507389.png")
out_path = os.path.join(dir_path, "final_logo.png")

try:
    img_star = Image.open(star_path).convert("RGBA")
    img_text = Image.open(text_path).convert("RGBA")
except Exception as e:
    print("Error loading images:", e)
    exit(1)

# The original images have a dark navy background (e.g., #0f172a). We want pure black.
# We'll treat very dark pixels as transparent, or just crop carefully.
def remove_dark_bg(img, threshold=30):
    datas = img.getdata()
    new_data = []
    for item in datas:
        # If r,g,b are all dark, make it black/transparent
        if item[0] < threshold and item[1] < threshold and item[2] < threshold:
            new_data.append((0, 0, 0, 255)) # replace with pure black
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img

img_star = remove_dark_bg(img_star, 40)
img_text = remove_dark_bg(img_text, 40)

# The text image might be wide. Let's get its bounding box of non-black pixels to crop tightly
# Actually just resizing is safer.
star_w, star_h = img_star.size
text_w, text_h = img_text.size

# Let's create a 512x512 black canvas
canvas_size = 512
canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 255))
draw = ImageDraw.Draw(canvas)

# House color: we can pick a bright pixel from the star image
color = (250, 190, 0, 255) # approximate yellow/amber

# Draw a house shape (outline)
line_width = 16
# Roof: peak at (256, 40)
points = [
    (256, 40),
    (100, 160),
    (140, 160),
    (140, 360),
    (372, 360),
    (372, 160),
    (412, 160),
    (256, 40)
]
# Draw polygon outline
draw.line([(256, 40), (100, 160)], fill=color, width=line_width)
draw.line([(256, 40), (412, 160)], fill=color, width=line_width)
draw.line([(140, 160), (140, 360)], fill=color, width=line_width)
draw.line([(372, 160), (372, 360)], fill=color, width=line_width)
draw.line([(140, 360), (372, 360)], fill=color, width=line_width)
# Fix corners
draw.line([(100, 160), (140, 160)], fill=color, width=line_width)
draw.line([(372, 160), (412, 160)], fill=color, width=line_width)


# Resize star to fit inside the house
star_target_size = 140
img_star = img_star.resize((star_target_size, star_target_size), Image.Resampling.LANCZOS)
# Paste star inside house (centered around (256, 230))
canvas.paste(img_star, (256 - star_target_size//2, 230 - star_target_size//2), img_star)

# Paste text at the bottom
text_target_w = 400
aspect_ratio = text_h / text_w
text_target_h = int(text_target_w * aspect_ratio)
img_text = img_text.resize((text_target_w, text_target_h), Image.Resampling.LANCZOS)

# Paste text
text_y = 390
canvas.paste(img_text, (256 - text_target_w//2, text_y), img_text)

canvas.save(out_path)
print("Saved to", out_path)
