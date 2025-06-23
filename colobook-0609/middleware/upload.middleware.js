const multer = require('multer');
const util = require('util');

// 深度日志存储引擎
const debugStorage = multer.memoryStorage();

// 重写文件处理逻辑以添加日志
debugStorage._handleFile = function (req, file, cb) {
  console.log('[Multer Debug] 开始处理文件:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    encoding: file.encoding
  });

  const chunks = [];
  let fileSize = 0;

  file.stream.on('data', (chunk) => {
    console.log(`[Multer Debug] 收到数据块，大小: ${chunk.length} bytes`);
    chunks.push(chunk);
    fileSize += chunk.length;
  });

  file.stream.on('end', () => {
    console.log('[Multer Debug] 文件接收完成，总大小:', fileSize);
    file.buffer = Buffer.concat(chunks);
    file.size = fileSize;
    cb(null, {
      buffer: file.buffer,
      size: fileSize,
      mimetype: file.mimetype,
      originalname: file.originalname
    });
  });

  file.stream.on('error', (err) => {
    console.error('[Multer Error] 文件流错误:', err);
    cb(err);
  });
};

const upload = multer({
  storage: debugStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('[Multer Filter] 收到文件过滤器调用:', {
      field: file.fieldname,
      name: file.originalname,
      type: file.mimetype,
      size: file.size || 'unknown'
    });
    cb(null, true); // 允许所有文件
  }
});

// 添加中间件包装器记录请求信息
const debugMiddleware = () => {
  console.log('[Upload Debug] 开始处理请求'); 
  return (req, res, next) => {
    console.log('[Upload Debug] 请求头信息:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      authorization: req.headers.authorization?.slice(0, 20) + '...'
    });

    upload.any()(req, res, (err) => {
      if (err) {
        console.error('[Upload Error] 中间件错误:', util.inspect(err, { depth: null }));
        return res.status(400).json({
          status: 'fail',
          message: err.code === 'LIMIT_FILE_SIZE' 
            ? '文件大小超过5MB限制' 
            : '文件上传失败'
        });
      }
      
      console.log('[Upload Debug] 中间件处理结果:', {
        fileCount: req.files ? req.files.length : 0,
        filesInfo: req.files ? req.files.map(file => ({
          originalname: file.originalname,
          size: file.size,
          bufferLength: file.buffer?.length
        })) : null
      });
      next();
    });
  };
};

module.exports = {
  any: debugMiddleware
};