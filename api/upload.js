const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

// Configure Next.js API route
module.exports.config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll handle it manually
  },
};

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Upload request received');
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join('/tmp', 'audio_clips'); // Use /tmp for Vercel
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Created upload directory:', uploadDir);
    }

    // Parse the form data
    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      filter: function ({name, originalFilename, mimetype}) {
        console.log('File filter check:', { name, originalFilename, mimetype });
        // Only allow audio files
        return mimetype && mimetype.startsWith('audio/');
      }
    });

    console.log('Parsing form data...');
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });
    console.log('Form parsed successfully');
    
    const uploadedFiles = [];
    
    // Handle multiple files
    const fileList = Array.isArray(files.file) ? files.file : [files.file];
    console.log('Processing files:', fileList.length);
    
    for (const file of fileList) {
      if (file) {
        console.log('Processing file:', file.originalFilename);
        
        // Generate unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const ext = path.extname(file.originalFilename);
        const baseName = path.basename(file.originalFilename, ext);
        const newFilename = `${timestamp}_${baseName}${ext}`;
        const newPath = path.join(uploadDir, newFilename);
        
        console.log('Moving file from', file.filepath, 'to', newPath);
        
        // Rename file to unique name
        fs.renameSync(file.filepath, newPath);
        
        uploadedFiles.push({
          filename: newFilename,
          originalName: file.originalFilename,
          size: file.size,
          uploadTime: new Date().toISOString()
        });
        
        console.log('File processed successfully:', newFilename);
      }
    }

    console.log('Upload completed, files:', uploadedFiles.length);
    
    // Return format compatible with Flask backend
    if (uploadedFiles.length === 1) {
      res.status(200).json({
        message: 'File uploaded successfully',
        filename: uploadedFiles[0].filename,
        file_path: path.join('/tmp/audio_clips', uploadedFiles[0].filename)
      });
    } else {
      res.status(200).json({
        message: 'Files uploaded successfully',
        files: uploadedFiles
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
