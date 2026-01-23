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
};

// 获取资源列表的API
app.get('/api/resources/:type', async (req, res) => {
    try {
        const resourceType = req.params.type;
        const validTypes = ['audio', 'background', 'images', 'Jing'];

        if (!validTypes.includes(resourceType)){
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

        debugLog("resourceType: ", resourceType, "visibleFiles: ", visibleFiles);
        res.json(visibleFiles);
    } catch (error) {
        console.error('Error reading resources:', error);
        res.status(500).json({ message: 'Error reading resources' });
    }
});


// 添加获取文件内容的API
app.get('/api/resources/:type/:filename', async (req, res) => {
    try {
        const { type, filename } = req.params;
        console.log("type: "+type+", filename: "+filename);
        const validTypes = ['audio', 'background', 'images', 'Jing'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid resource type' });
        }
        
        // 防止路径遍历攻击
        const safeFilename = path.basename(filename);
        const filePath = path.join(__dirname, '../public', type, safeFilename);
        
        // 检查文件是否存在
        try {
            await fs.access(filePath);
        } catch (error) {
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
    }
});

// 保存文本的API
app.post('/api/save-text', async(req,res) => {
    try {
        const { filename, content } = req.body;

        if(!filename || !content) {
            return res.status(400).json({ message: 'Filename and content are required' });
        }

        // 简单的文件名安全验证
        if (!/^[a-zA-Z0-9_-]+\.txt$/.test(filename)) {
            return res.status(400).json({ message: 'Invalid filename' });
        }

        const filePath = path.join(__dirname, 'storage/texts', filename);
        await fs.writeFile(filePath, content);

        res.json({ success: true, message: 'Text saved successfully' });
    } catch (error) {
        console.error('Error saving text:', error);
        res.status(500).json({ message: 'Error saving text' });
    }
});

// 保存阅读进度的API
app.post('/api/save-reading-progress', async (req, res) => {
    try {
        const { filename, currentIndex } = req.body;

        if (!filename || currentIndex === undefined) {
            return res.status(400).json({ message: 'Filename and currentIndex are required' });
        }

        // 简单的文件名安全验证
        if (!/^[a-zA-Z0-9_-]+\.txt$/.test(filename)) {
            return res.status(400).json({ message: 'Invalid filename' });
        }

        // 创建元数据文件名（原文件名 + .meta.json）
        const metaFilename = filename.replace(/\.txt$/, '.meta.json');
        const metaFilePath = path.join(__dirname, '../public/Jing/savedata', metaFilename);
        
        // 准备元数据
        const metaData = {
            lastIndex: currentIndex,
            lastReadTime: new Date().toISOString(),
            fileName: filename
        };
        
        // 保存元数据文件
        await fs.writeFile(metaFilePath, JSON.stringify(metaData, null, 2));
        
        console.log(`Saved reading progress for ${filename}: line ${currentIndex}`);
        res.json({ success: true, message: 'Reading progress saved successfully' });
        
    } catch (error) {
        console.error('Error saving reading progress:', error);
        res.status(500).json({ message: 'Error saving reading progress' });
    }
});

// 获取阅读进度的API
app.get('/api/get-reading-progress/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        // 验证文件名
        if (!/^[a-zA-Z0-9_-]+\.txt$/.test(filename)) {
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
    }
});

// 导出app和初始化函数
module.exports = { app, initializeStorage, debugLog };