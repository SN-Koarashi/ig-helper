const path = require('path');

module.exports = {
    entry: './entry.js', // 你的入口文件
    output: {
        filename: './bundle.js', // 輸出檔案名稱
        path: path.resolve(__dirname), // 輸出路徑
    },
};