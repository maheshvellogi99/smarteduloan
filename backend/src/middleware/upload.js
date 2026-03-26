const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'smarteduloan',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    public_id: (req, file) => {
      const ts = Date.now();
      const parts = file.originalname.split('.');
      if (parts.length > 1) {
          parts.pop(); // remove extension
      }
      const cleanName = parts.join('_').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      return `sel-${ts}-${cleanName}`;
    },
    format: async (req, file) => {
      const ext = file.originalname.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'pdf', 'webp'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
      return 'jpg';
    },
    // resource_type handles images and PDFs under the 'image' category in Cloudinary
    resource_type: 'auto'
  }
});

const upload = multer({ storage });

module.exports = { upload, cloudinary };
