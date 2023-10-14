function error(str)  {
    document.getElementById("status").innerText = str;
}

function getCanvasImageData() {
    const srcImg = document.getElementById("imgPreview")
    if (! srcImg.src) {
        error("Image not selected")
        return null;
    }
    var canvas = document.createElement('canvas');
    canvas.width = srcImg.width;
    canvas.height = srcImg.height;
    canvas.getContext('2d').drawImage(srcImg, 0, 0, srcImg.width, srcImg.height);    

    const pixelData = canvas.getContext('2d').getImageData(0, 0, srcImg.width, srcImg.height);
    return pixelData
}

function setBnWImageData(pixelData) {
    const srcImg = document.getElementById("imgPreview")
    const canvas = document.getElementById("canvasBnW")
    canvas.width = srcImg.width;
    canvas.height = srcImg.height;
    canvas.getContext('2d').putImageData(pixelData, 0, 0)
}

class ImageScannerLtrV {
    constructor(imageData) {
        this.imageData = imageData;
        this.x = 0
        this.y = 0
        this.width = imageData.width
        this.height = imageData.height
        this.empty = [0, 0, 0, 0]
    }

    nextByte() {
        if (this.y >= this.height) {
            return null
        }
        const currChunk = this.getCurrentChunk()
        let byte = 0
        for (let i = 1, idx = 0; i <= 128; i = i << 1, idx++) {
            if (currChunk[idx][0] == 255) {
                byte += i
            }
        }

        this.x ++;
        if (this.x >= this.width) {
            this.x = 0;
            this.y ++;
        }

        return byte
    }

    getCurrentChunk() {
        const x = this.x; const y = this.y;
        const res = []
        for (let i = 0; i < 8; i++) {
            res.push(this.getPixel(x, y + i))
        }
        return res
    }

    getPixel(x, y) {
        if (x > this.width || y > this.height) {
            return this.empty
        }
        const d = this.imageData.data
        let ptr = x * 4 + y * this.imageData.width * 4
        return [d[ptr++], d[ptr++], d[ptr++], d[ptr]]
    }
}

function convertImageToBytes(imageData) {
    const scanner = new ImageScannerLtrV(imageData);
    const arr = []
    let curr
    do {
        curr = scanner.nextByte()
        arr.push(curr)
    } while(curr != null)
    return arr
}

function convertToArray() {
    const inverted = document.getElementById("checkboxInvert").checked == true
    
    function computeBrightness(imageData, comparison, initial) {
        const pixelData = imageData.data
        const l = pixelData.length;
        let res = initial
        for (let i = 0; i < l; i++) {
            const test = (pixelData[i++] + pixelData[i++] + pixelData[i++]) / 3; //skip alpha channel
            res = comparison(test, res) ? test : res;
        }
        return res
    }

    function createBnWPixelData(imageData, brightnessThr) {
        const pixelData = imageData.data
        const newImageData = new ImageData(imageData.width, imageData.height)        
        const newPixels = newImageData.data
        const l = pixelData.length;
        for (let i = 0; i < l; i++) {
            const curr = (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3; 
            let currPixel
            let v = curr > brightnessThr ^ inverted
            currPixel = v ? 255 : 0;
            newPixels[i] = currPixel
            newPixels[i + 1] = currPixel
            newPixels[i + 2] = currPixel
            newPixels[i + 3] = pixelData[i + 3]
            i += 3 //3 rgb + 1 a
        }
        return newImageData
    }
    
    const imageData = getCanvasImageData()
    const minBrightness = computeBrightness(imageData, (a, b) => a < b, 255)
    const maxBrightness = computeBrightness(imageData, (a, b) => a > b, 0)
    const brightnessThr = (minBrightness + maxBrightness) / 2
    const bnwPixelData = createBnWPixelData(imageData, brightnessThr)
    
    setBnWImageData(bnwPixelData)

    const bytes = convertImageToBytes(bnwPixelData)
    const str = bytes.join(", ")
    document.getElementById("textareaResult").textContent = str
}

document.getElementById('convert').onclick = convertToArray;
document.getElementById('checkboxInvert').onchange = convertToArray;

document.getElementById('inputFile').onchange = function (evt) {
    var tgt = evt.target || window.event.srcElement,
        files = tgt.files;
    
    // FileReader support
    if (FileReader && files && files.length) {
        var fr = new FileReader();
        fr.onload = function () {
            document.getElementById("imgPreview").src = fr.result;
        }
        fr.readAsDataURL(files[0]);
    } else {
        error("Not supported by the b")
    }
}