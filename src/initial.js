import { initSettings, registerMenuCommand, checkingScriptUpdate, logger } from "./utils/general";
import { getTranslationText, repaintingTranslations } from "./utils/i18n";
import { style, state } from "./settings";
import { purgeCache } from "./utils/image_cache";
/*! ESLINT IMPORT END !*/

// initialization script
initSettings();
GM_addStyle(style);
registerMenuCommand();

getTranslationText(state.lang).then((res) => {
    state.locale[state.lang] = res;
    repaintingTranslations();
    registerMenuCommand();
    checkingScriptUpdate(300);
}).catch((err) => {
    registerMenuCommand();
    checkingScriptUpdate(300);

    if (!state.lang.startsWith('en')) {
        console.error('getTranslationText catch error:', err);
    }
});

logger('Script Loaded', GM_info.script.name, 'version:', GM_info.script.version);
purgeCache();

const ffmpegCode = GM_getResourceText("FFMPEG");
const ffmpegURL = URL.createObjectURL(new Blob([ffmpegCode], { type: 'application/javascript' }));

const iframe = document.createElement('iframe');
iframe.style.display = 'none';
// iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
iframe.setAttribute('csp', 'default-src *; script-src *; connect-src *; worker-src *;');
document.body.appendChild(iframe);

const doc = iframe.contentDocument;

const script1 = doc.createElement('script');
script1.src = ffmpegURL;
doc.head.appendChild(script1);

const scriptMain = doc.createElement('script');

const customScriptURL = URL.createObjectURL(new Blob([
    `
    const { FFmpeg } = FFmpegWASM;

    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
        console.log(message);
    })

    async function fileProcessing(videoURL, audioURL){
        await ffmpeg.load();
        console.log('FFmpeg loaded');

        const videoResponse = await fetch(videoURL);
        const videoData = await videoResponse.arrayBuffer();
        ffmpeg.FS('writeFile', 'input_video.mp4', new Uint8Array(videoData));

        const audioResponse = await fetch(audioURL);
        const audioData = await audioResponse.arrayBuffer();
        ffmpeg.FS('writeFile', 'input_audio.mp4', new Uint8Array(audioData));

        await ffmpeg.run('-i', 'input_video.mp4', '-i', 'input_audio.mp4', '-c:v', 'copy', '-c:a', 'aac', '-strict', 'experimental', 'output.mp4');

        const outputData = ffmpeg.FS('readFile', 'output.mp4');
        const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
        const outputURL = URL.createObjectURL(outputBlob);

        const a = document.createElement('a');
        a.href = outputURL;
        a.download = 'merged_video.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(outputURL);
    }

    window.addEventListener('message', async (e) => {
        console.log('Message received in worker:', e.data);
        if (e.data && e.data.type === 'PROCESS_MEDIA') {
            const { videoURL, audioURL } = e.data.payload;
            try {
                await fileProcessing(videoURL, audioURL);
                window.parent.postMessage({ type: 'PROCESS_COMPLETE', payload: { success: true } }, '*');
            } catch (error) {
                window.parent.postMessage({ type: 'PROCESS_COMPLETE', payload: { success: false, error: error.message } }, '*');
            }
        }
    });
    `
], { type: 'application/javascript' }));

scriptMain.src = customScriptURL;
doc.head.appendChild(scriptMain);

/*******************************/