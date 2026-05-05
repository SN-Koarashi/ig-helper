// ==UserScript==
// @name               IG Helper
// @name:zh-TW         IG小精靈
// @name:zh-CN         IG小助手
// @name:ja            IG助手
// @name:ko            IG조수
// @name:ro            Asistent IG
// @name:es            Ayudante de IG
// @name:pt-BR         Assistente do IG
// @name:fr            Assistant IG
// @name:de            IG-Helfer
// @name:tr            IG Yardımcısı
// @name:id            Asisten IG
// @name:th            ตัวช่วย IG
// @name:vi            Trợ lý IG
// @name:ru            Помощник IG
// @name:ar            أداة IG
// @namespace          https://github.snkms.com/
// @version            3.18.3
// @description        Download photos and videos from Instagram posts in one click, including Stories, Reels, and profile pictures.
// @description:zh-TW  一鍵下載 Instagram 貼文中的照片、影片，還包含限時動態、Reels 與大頭貼。
// @description:zh-CN  一键下载 Instagram 帖子中的照片和视频，还包括快拍、Reels 和头像。
// @description:ja     投稿の写真や動画をワンクリックでダウンロード。ストーリー、リール、プロフィール画像にも対応。
// @description:ko     한 번의 클릭으로 Instagram 게시물의 사진과 동영상을 다운로드하고, 스토리, 릴, 프로필 사진도 지원합니다.
// @description:ro     Descarcă cu un singur click fotografii și videoclipuri din postările Instagram, inclusiv story-uri, reels și poze de profil.
// @description:es     Descarga fotos y videos de publicaciones de Instagram con un clic, incluyendo Stories, Reels y fotos de perfil.
// @description:pt-BR  Baixe fotos e vídeos de publicações do Instagram com um clique, incluindo Stories, Reels e fotos de perfil.
// @description:fr     Téléchargez en un clic les photos et vidéos des publications Instagram, y compris les Stories, les Reels et les photos de profil.
// @description:de     Lade Fotos und Videos aus Instagram-Beiträgen mit einem Klick herunter, einschließlich Stories, Reels und Profilbildern.
// @description:tr     Instagram gönderilerindeki fotoğraf ve videoları tek tıkla indirin; Hikayeler, Reels ve profil fotoğrafları da dahildir.
// @description:id     Unduh foto dan video dari postingan Instagram dalam satu klik, termasuk Stories, Reels, dan foto profil.
// @description:th     ดาวน์โหลดรูปภาพและวิดีโอจากโพสต์ Instagram ได้ในคลิกเดียว รวมถึง Stories, Reels และรูปโปรไฟล์
// @description:vi     Tải xuống ảnh và video từ bài viết trên Instagram chỉ với một cú nhấp, bao gồm Stories, Reels và ảnh đại diện.
// @description:ru     Скачивайте фото и видео из публикаций Instagram в один клик, включая Stories, Reels и фото профиля.
// @description:ar     نزّل صور ومقاطع فيديو من منشورات Instagram بنقرة واحدة، بما في ذلك القصص وReels وصور الملف الشخصي.
// @author             SN-Koarashi (5026)
// @match              https://*.instagram.com/*
// @grant              GM_info
// @grant              GM_addStyle
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_xmlhttpRequest
// @grant              GM_registerMenuCommand
// @grant              GM_unregisterMenuCommand
// @grant              GM_getResourceText
// @grant              GM_notification
// @grant              GM_openInTab
// @connect            i.instagram.com
// @connect            cdn.jsdelivr.net
// @connect            raw.githubusercontent.com
// @require            https://cdn.jsdelivr.net/npm/mediabunny@1.34.5/dist/bundles/mediabunny.min.cjs#sha256-wUFR+x2bDvpqgMAVGy2CvGvULyjTGvGy4UUAm8rae5U=
// @require            https://code.jquery.com/jquery-3.7.1.min.js#sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=
// @resource           INTERNAL_CSS https://cdn.jsdelivr.net/gh/SN-Koarashi/ig-helper@master/style.css
// @resource           LOCALE_MANIFEST https://cdn.jsdelivr.net/gh/SN-Koarashi/ig-helper@master/locale/manifest.json
// @supportURL         https://github.com/SN-Koarashi/ig-helper/
// @contributionURL    https://ko-fi.com/snkoarashi
// @icon               https://www.google.com/s2/favicons?domain=www.instagram.com&sz=32
// @compatible         firefox >= 100
// @compatible         chrome >= 100
// @compatible         edge >= 100
// @license            GPL-3.0-only
// @run-at             document-idle
// ==/UserScript==
