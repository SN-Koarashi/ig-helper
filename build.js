const fs = require("fs");
const path = require("path");
const readline = require("readline");

const inputFilePath = "./entry.js";
const outputFilePath = "./main.js";

const inputStream = fs.createReadStream(inputFilePath);
const outputStream = fs.createWriteStream(outputFilePath);

const rl = readline.createInterface({
    input: inputStream,
    output: null, // 設為null，因為我們不需要輸出到控制台
    terminal: false,
});

const processImportedFile = (full_path) => {
    return new Promise((resolve) => {
        const importedStream = fs.createReadStream(full_path);
        const importedRl = readline.createInterface({
            input: importedStream,
            output: null,
            terminal: false,
        });

        importedRl.on("line", (importedLine) => {
            if (!importedLine.startsWith("import ")) {
                if (importedLine.trim() === "") {
                    outputStream.write("\n");
                }
                else {
                    var prefix = "";
                    if (path.basename(full_path) !== "metadata.js") {
                        prefix = "    ";
                    }
                    outputStream.write(prefix + importedLine.replace(/^(export )/i, "") + "\n");
                }
            }
        });

        importedRl.on("close", () => {
            resolve();
        });
    });
};

// 逐行讀取並處理檔案
const processLines = async () => {
    for await (const line of rl) {
        if (line.trim().startsWith("FS_IMPORT")) {
            const filter_path = line.trim().match(/^FS_IMPORT\(['"]?(.*?)['"]?\);?$/i);
            if (filter_path !== null && filter_path.length > 0) {
                const full_path = path.join(__dirname, filter_path[1]);

                await processImportedFile(full_path);
            }
        }
        else {
            outputStream.write(line + "\n");
        }
    }
};

// 開始逐行處理檔案
processLines().then(() => {
    outputStream.end(); // 完成所有處理後關閉輸出流
    console.log("File concat done.");
}).catch(err => {
    console.error("Error processing lines:", err);
});