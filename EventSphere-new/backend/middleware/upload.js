// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// A helper function to create storage engine for different upload types
const createStorage = (folder) => {
    const storagePath = path.join(__dirname, `../uploads/${folder}`);

    // Ensure the directory exists
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, storagePath);
        },
        filename: (req, file, cb) => {
            // Create a unique filename to avoid overwrites
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
};

// Define file filters for security
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image file.'), false);
    }
};

const pdfFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Not a PDF! Please upload a PDF file.'), false);
    }
};

// Create multer instances for each upload type
const uploadPoster = multer({ storage: createStorage('posters'), fileFilter: imageFileFilter });
const uploadProfileImage = multer({ storage: createStorage('profiles'), fileFilter: imageFileFilter });
const uploadCertTemplate = multer({ storage: createStorage('cert_templates'), fileFilter: pdfFileFilter });

module.exports = {
    uploadPoster,
    uploadProfileImage,
    uploadCertTemplate
};