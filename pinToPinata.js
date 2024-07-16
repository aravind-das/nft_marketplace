const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const pinataApiKey = '742f5b64733fece091f0';
const pinataSecretApiKey = 'a332d7f801b0cf447c0130fe376e4677da017427a72e7891337ed2508af07135';

const sourcePath = path.join(__dirname, 'build');

const addDirectoryToPinata = async (sourcePath) => {
    const files = fs.readdirSync(sourcePath);

    for (const file of files) {
        const fullPath = path.join(sourcePath, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            await addDirectoryToPinata(fullPath);
        } else {
            const readableStreamForFile = fs.createReadStream(fullPath);
            const form = new FormData();
            form.append('file', readableStreamForFile);

            const options = {
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey,
                },
                maxContentLength: Infinity,
            };

            try {
                const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, options);
                console.log(`Pinned: ${file} -> Hash: ${response.data.IpfsHash}`);
            } catch (error) {
                console.error(`Failed to pin file: ${file}`, error);
            }
        }
    }
};

addDirectoryToPinata(sourcePath).then(() => {
    console.log('Pinning completed.');
}).catch((error) => {
    console.error('Error pinning directory:', error);
});
