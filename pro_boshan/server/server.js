const PORT = process.env.PORT || 9070
const os = require('os');

const { app, initializeStorage, debugLog } = require('./app');

// 获取本机IPv4
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 只找 IPv4、非内环（非 127.0.0.1）、且已启用的接口
      if (
        iface.family === 'IPv4' && 
        !iface.internal && 
        iface.address.startsWith('192.168.') ||
        iface.address.startsWith('10.') ||
        iface.address.startsWith('172.')
      ) {
        return iface.address;
      }
    }
  }
  // 如果没找到私有 IP，回退到 127.0.0.1
  return '127.0.0.1';
}

// 启动服务器
const startServer = async () => {
  try {
    // 初始化存储目录
    await initializeStorage();
    debugLog('Stroage directories initialized');

    // 启动服务器
    app.listen(PORT, '0.0.0.0', () => {
        const localIP = getLocalIP();
        console.log(`✅ Server running at:`);
        console.log(`   Local:   http://localhost:${PORT}`);
        console.log(`   Network: http://${localIP}:${PORT}`);
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