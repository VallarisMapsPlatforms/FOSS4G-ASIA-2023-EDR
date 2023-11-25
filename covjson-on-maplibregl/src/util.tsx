export const hexToRgb = (hex: string) => {
  // Remove the hash character if present
  hex = hex.replace(/^#/, "");

  // Parse the hex values to separate RGB components
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
};

export const resizeImage = (
  base64: string,
  w: number,
  h: number,
  ratio: number
) => {
  return new Promise((resolve, rejects) => {
    const img = new Image();
    const newWidth = w * ratio;
    const newheight = h * ratio;
    img.onload = () => {
      // create an off-screen canvas
      const canvas = document.createElement("canvas"),
        ctx = canvas.getContext("2d");

      // set its dimension to target size
      canvas.width = newWidth;
      canvas.height = newheight;

      // draw source image into the off-screen canvas:
      if (ctx) {
        ctx.drawImage(img, 0, 0, newWidth, newheight);
        const newScale = canvas.toDataURL();
        canvas.remove();
        // encode image to data-uri with base64 version of compressed image
        resolve(newScale);
      } else {
        canvas.remove();
        rejects();
      }
    };
    img.src = base64;
  });
};
