const axios = require('axios')
const fs = require('fs');
const exiftool = require('exiftool-vendored').exiftool
const { error } = require('console')

exports.handler = async (event) => {

    /**
     * Check it the imageURL has been passed to the Lambda
     * Get image url and download image to temp
     * Check if the url points to an image if not return JSON response error
     * Read exif data tags from image
     * Add image url as sourcefile
     * Delete image from temp file
     * Stringify tags to JSON
     * Return the response as JSON
    * */
    let data;   

    if(event){
        //For local testing event.body is not a string and doesn't need parsing
        data = typeof event.body === 'string' ? JSON.parse(event.body) : event

    }else {
        const response = {
            statusCode: "200",
            body: "You did not pass an image url",
        };
        return JSON.stringify(response)
    }
   
    if(!data.imageURL){
        const response = {
            statusCode: "200",
            body: "No imageURL was passed",
        };
        return JSON.stringify(response);
    }

    //Write data in imageURL into 'tmp/file.dat'
    await downloadImage(data.imageURL)
    
        try {                  
            const tags = await exiftool.read('/tmp/file.dat')        
    
            //Check if the file downloaded is an image
            if(isImageUrl(tags.FileType)){
                tags.SourceFile = data.imageURL        
              
                //Delete file to prevent storage from filling   
                fs.unlink('/tmp/file.dat', (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                        throw err
                    } 
                });
    
                const response = {
                    statusCode: "200",
                    body: tags,
                };
                return JSON.stringify(response);    
    
            }else{
    
                //Delete file to prevent storage from filling 
                fs.unlink('/tmp/file.dat', (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                        throw err
                    } else {
                        console.log('File deleted successfully');
                    }
                }); 
    
                const response = {
                    statusCode: "200",
                    body: 'The url you passed does not contain an image',
                };
    
                return JSON.stringify(response)
            }  
    
        } catch (error) {
    
            const response = {
                statusCode: "200",
                body: `Reading exif data failed with ${error}. This might be due to a invalid file format or corrupted image`
            };
            return JSON.stringify(response);
        }
}


async function downloadImage(url) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    // Pipe the image data to a file stream
    response.data.pipe(fs.createWriteStream('/tmp/file.dat'));

    return new Promise((resolve, reject) => {
        response.data.on('end', () => {
            console.log('Image downloaded successfully.');
            resolve();
        });

        response.data.on('error', (err) => {
            console.error('Error downloading image:', err);
            const resp = {
                statusCode: "200",
                body: JSON.stringify(err),
            };
            reject(JSON.stringify(resp));
        });
    });   
}


///Check if image is URl
function isImageUrl(fileType){
    const imageFormats = ['JPG','PNG','GIF','WEBP','FLIF','CR2','TIF','BMP','JXR','PSD','ICO','BPG','JP2','JPM','JPX','HEIC','CUR','DCM', 'SVG', 'JPEG', 'TIFF'];
    if(imageFormats.includes(fileType)){
        return true        
    }
    else{        
        console.log( 'The url you passed does not contain an image')
        return false        
    }
}