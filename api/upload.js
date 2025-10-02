import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Configure Next.js API route
export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll handle it manually
  },
};

export default async function handler(req, res) {
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
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'audio_clips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Parse the form data
    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      filter: function ({name, originalFilename, mimetype}) {
        // Only allow audio files
        return mimetype && mimetype.startsWith('audio/');
      }
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFiles = [];
    
    // Handle multiple files
    const fileList = Array.isArray(files.file) ? files.file : [files.file];
    
    for (const file of fileList) {
      if (file) {
        // Generate unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const ext = path.extname(file.originalFilename);
        const baseName = path.basename(file.originalFilename, ext);
        const newFilename = `${timestamp}_${baseName}${ext}`;
        const newPath = path.join(uploadDir, newFilename);
        
        // Rename file to unique name
        fs.renameSync(file.filepath, newPath);
        
        uploadedFiles.push({
          filename: newFilename,
          originalName: file.originalFilename,
          size: file.size,
          uploadTime: new Date().toISOString()
        });
      }
    }

    res.status(200).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
}
