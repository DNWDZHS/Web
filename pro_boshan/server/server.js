const PORT = process.env.PORT || 907

const { app, initializeStorage, debugLog } = require('./app');

// 启动服务器
const startServer = async () => {
  try {
    // 初始化存储目录
    await initializeStorage();
    debugLog('Stroage directories initialized');

    // 启动服务器
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        debugLog(`Available endpoints:`);
        debugLog(` GET /api/resources/:type (background, images, audio, Jing)`);
        debugLog(` POST /api/save-text`);
    });
    } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// 启动应用
startServer();