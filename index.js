const fs = require('fs');
const exiftool = require('exiftool-vendored').exiftool
exports.handler = async (event) => {

    /**
      * Check for filename and image data in the payload
      * Write the base64 binary into a file
      * Read and return the exif data from the filename
    * */
    let data;

    if(event){
        //For local testing event.body is not a string and doesn't need parsing
        data = typeof event.body === 'string' ? JSON.parse(event.body) : event

    }else {

        const response = {
            statusCode: "200",
            body: "You did not pass any image or file data",
        };
        return response
    }
   
    if(!data.image){
        const response = {
            statusCode: "200",
            body: "No image was passed",
        };
        return response;
    }

    if(!data.fileName){
        const response = {
            statusCode: "200",
            body: "Filename was not passed",
        };
        return response;
    }

    const base64Str = data.image
    const fileName = data.fileName 

    buffer = Buffer.from(base64Str, 'base64')
    //Lambda can only allow write access to the temp directory
    fs.writeFileSync(`/tmp/${fileName}`, buffer)

    try {

        const tags = await exiftool.read(`/tmp/${fileName}`)
        const response = {
            statusCode: "200",
            body: tags,
        };

        //Delete file to prevent storage from filling   
        fs.unlink(`/tmp/${fileName}`, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            } else {
                console.log('File deleted successfully');
            }
        });

        return response;

    } catch (err) {

        const response = {
            statusCode: "200",
            body: "Error while reading exif data. This might be due to a invalid file format or corrupted image",
        };
        return response;
    }
}