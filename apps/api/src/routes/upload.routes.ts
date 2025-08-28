import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { handleUpload } from '../middleware/upload';
import path from 'path';
import fs from 'fs';

const router = Router();

// Upload thumbnail endpoint
router.post('/thumbnail', authenticate, handleUpload, async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }

    // Get the public URL for the uploaded file
    const fileUrl = `/uploads/thumbnails/${req.file.filename}`;
    
    console.log('File uploaded:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      url: fileUrl
    });

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload do arquivo'
    });
  }
});

// Delete thumbnail endpoint
router.delete('/thumbnail/:filename', authenticate, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(process.cwd(), 'uploads', 'thumbnails', filename);
    
    // Check if file exists
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('File deleted:', filename);
    }

    res.json({
      success: true,
      message: 'Arquivo removido com sucesso'
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover arquivo'
    });
  }
});

export default router;