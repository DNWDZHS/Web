const debugMode = process.env.DEBUG == 'true' || process.argv.includes('--debug');
debugLog("DEBUG = ", process.env.DEBUG, "debugMode = ", debugMode);

function debugLog(...args){
    if(debugMode){
        console.log('[DEBUG]', ...args);
    }
}

const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app =express();

// 中间件配置
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 确保存储目录存在的工具函数
const ensureDirExits = async (dirPath) => {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true});
    }
};

// 初始化存储目录
const initializeStorage = async () => {
    await ensureDirExits(path.join(__dirname, '../public/audio'));
    await ensureDirExits(path.join(__dirname, '../public/background'));
    await ensureDirExits(path.join(__dirname, '../public/images'));
    await ensureDirExits(path.join(__dirname, '../public/Jing'));
    debugLog('Storage Directory initialized');
};

// 校验文件名
function IsValidFilename(filename, caller) {
    const filenameRegex = /^[a-zA-Z0-9_-]+\.txt$/;
    if (!filenameRegex.test(filename)) {
        debugLog(`${caller} failed, filename "${filename}" is invalid`);
        return false;
    }
    return true;
}

// 获取资源列表的API
app.get('/api/resources/:type', async (req, res) => {
    debugLog('Getting resources for type:', req.params.type);
    try {
        const resourceType = req.params.type;
        const validTypes = ['audio', 'background', 'images', 'Jing'];

        if (!validTypes.includes(resourceType)){
            debugLog('app.get/api/resources list failed, Filetype is invalid :', resourceType);
            return res.status(400).json({ message: 'Invalid resource type' });
        }
        
        const resourcePath = path.join(__dirname, '../public', resourceType);
        const files = await fs.readdir(resourcePath);

        // 过滤隐藏文件
        let visibleFiles = files.filter(file => !file.startsWith('.'));

        // 如果资源类型是 'Jing'，只保留 .txt 文件
        if (resourceType === 'Jing') {
            visibleFiles = visibleFiles.filter(file => path.extname(file).toLowerCase() === '.txt');
        }

        res.json(visibleFiles);
    } catch (error) {
        debugLog('Error reading resources:', error);
        res.status(500).json({ message: 'Error reading resources' });
    } finally{
        debugLog('');
    }
});


// 添加获取文件内容的API
app.get('/api/resources/:type/:filename', async (req, res) => {
    try {
        const { type, filename } = req.params;
        debugLog("type: "+type+", filename: "+filename);
        const validTypes = ['audio', 'background', 'images', 'Jing'];

        if (!validTypes.includes(type)) {
            debugLog('app.get/api/resources content failed, Filetype is invalid :', resourceType);
            return res.status(400).json({ message: 'Invalid resource type' });
        }
        
        // 防止路径遍历攻击
        const safeFilename = path.basename(filename);
        const filePath = path.join(__dirname, '../public', type, safeFilename);
        
        // 检查文件是否存在
        try {
            await fs.access(filePath);
        } catch (error) {
            debugLog('File not found, app.get/api/resources/ file content error:', error);
            return res.status(404).json({ message: 'File not found' });
        }
        
        // 如果是文本文件，直接返回内容
        if (type === 'Jing') {
            const content = await fs.readFile(filePath, 'utf8');
            // 按行分割内容
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            return res.json({ 
                filename: safeFilename,
                content: lines 
            });
        }
        
        // 其他类型文件的处理...
        res.status(400).json({ message: 'Unsupported operation for this file type' });
        
    } catch (error) {
        console.error('Error reading file content:', error);
        res.status(500).json({ message: 'Error reading file content' });
    } finally{
        debugLog('');
    }
});

// 保存阅读进度的API
app.post('/api/save-reading-progress', async (req, res) => {
    try {
        const { filename, currentIndex } = req.body;

        if (!filename || currentIndex === undefined) {
            return res.status(400).json({ message: 'Filename and currentIndex are required' });
        }

        // 验证文件名格式
        if (!IsValidFilename(filename, 'app.post/api/save-reading-progress')){
            return res.status(400).json({ message: 'Invalid filename' });
        }

        // 创建元数据文件名（原文件名 + .meta.json）
        const metaFilename = filename.replace(/\.txt$/, '.meta.json');
        const metaFilePath = path.join(__dirname, '../public/Jing/savedata', metaFilename);
        
        // 准备元数据(行号, 时间, 文件名)
        const metaData = {
            lastIndex: currentIndex,
            lastReadTime: new Date().toISOString(),
            fileName: filename
        };
        
        // 保存元数据文件
        await fs.writeFile(metaFilePath, JSON.stringify(metaData, null, 2));
        
        debugLog(`Saved reading progress for ${filename}: line ${currentIndex}`);
        res.json({ success: true, message: 'Reading progress saved successfully' });
        
    } catch (error) {
        console.error('Error saving reading progress:', error);
        res.status(500).json({ message: 'Error saving reading progress' });
    } finally{
        debugLog('');
    }
});

// 获取阅读进度的API
app.get('/api/get-reading-progress/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        // 验证文件名格式
        if (!IsValidFilename(filename, 'app.get/api/get-reading-progress/:filename')){
            return res.status(400).json({ message: 'Invalid filename' });
        }
        
        // 构建元数据文件路径
        const metaFilename = filename.replace(/\.txt$/, '.meta.json');
        const metaFilePath = path.join(__dirname, '../public/Jing/savedata', metaFilename);
        
        // 检查文件是否存在
        try {
            await fs.access(metaFilePath);
            const metaData = JSON.parse(await fs.readFile(metaFilePath, 'utf8'));
            res.json({ success: true, lastIndex: metaData.lastIndex, lastReadTime: metaData.lastReadTime });
        } catch (err) {
            // 文件不存在，返回默认值
            res.json({ success: true, lastIndex: 0, message: 'No reading progress found' });
        }
        
    } catch (error) {
        console.error('Error getting reading progress:', error);
        res.status(500).json({ message: 'Error getting reading progress' });
    } finally{
        debugLog('');
    }
});

// 保存评论的API
app.post('/api/save-comment', async (req, res) => {
    try {
        const { filename, lineNumber, lineContent, comment, timestamp } = req.body;

        // 验证必需参数
        if (!filename || lineNumber === undefined || !lineContent || !comment) {
            return res.status(400).json({ message: '缺少必需参数' });
        }

        // 验证文件名格式
        if (!IsValidFilename(filename, '/api/save-comment')){
            return res.status(400).json({ message: 'Invalid filename' });
        }

        // 验证评论长度
        if (comment.length > 300) {
            return res.status(400).json({ message: '评论内容超过300字符限制' });
        }

        // 创建评论文件名（原文件名 + .comments.json）
        const commentFilename = filename.replace(/\.txt$/, '.comments.json');
        const commentFilePath = path.join(__dirname, '../public/Jing/savedata', commentFilename);
        
        // 准备评论数据
        const newComment = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5), // 生成唯一ID
            timestamp: timestamp || new Date().toISOString(),
            lineNumber: parseInt(lineNumber),
            lineContent: lineContent.trim(),
            comment: comment.trim(),
            createdAt: new Date().toISOString()
        };
        
        // 读取现有评论（如果存在）
        let existingComments = [];
        try {
            await fs.access(commentFilePath);
            const fileContent = await fs.readFile(commentFilePath, 'utf8');
            existingComments = JSON.parse(fileContent);
            
            // 确保是数组格式
            if (!Array.isArray(existingComments)) {
                existingComments = [];
            }
        } catch (err) {
            // 文件不存在或解析错误，创建新数组
            debugLog(`Creating new comment file for ${filename}`);
        }
        
        // 添加新评论
        existingComments.push(newComment);
        
        // 保存更新后的评论
        await fs.writeFile(commentFilePath, JSON.stringify(existingComments, null, 2));
        
        debugLog(`Saved comment for ${filename} at line ${lineNumber}`);
        res.json({ 
            success: true, 
            message: '评论保存成功',
            comment: newComment
        });
        
    } catch (error) {
        console.error('Error saving comment:', error);
        res.status(500).json({ message: '保存评论时出错' });
    } finally{
        debugLog('');
    }
});

// 获取特定文件的评论
app.get('/api/get-comments/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        debugLog("filename: "+filename);

        // 验证文件名格式
        if (!IsValidFilename(filename, 'app.get/api/get-comments')){
            return res.status(400).json({ message: 'Invalid filename' });
        }
        
        debugLog(`Getting comments for ${filename}`);
        // 构建评论文件路径
        const commentFilename = filename.replace(/\.txt$/, '.comments.json');
        const commentFilePath = path.join(__dirname, '../public/Jing/savedata', commentFilename);
        
        // 检查文件是否存在
        try {
            await fs.access(commentFilePath);
            const fileContent = await fs.readFile(commentFilePath, 'utf8');
            const comments = JSON.parse(fileContent);
            
            // 确保返回的是数组
            if (Array.isArray(comments)) {
                // 按时间排序（最新在前）
                comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                res.json({ success: true, comments });
            } else {
                res.json({ success: true, comments: [] });
            }
        } catch (err) {
            // 文件不存在
            res.json({ success: true, comments: [] });
        }
        
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({ message: '获取评论时出错' });
    } finally{
        debugLog('');
    }
});

// 导出app和初始化函数
module.exports = { app, initializeStorage, debugLog };