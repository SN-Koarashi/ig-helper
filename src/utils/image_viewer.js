import { SVG } from "../settings";
/*! ESLINT IMPORT END !*/

var detectMovingViewerTimer = null;

export function openImageViewer(imageUrl) {
    removeImageViewer();

    $('body').append(
        `<div id="imageViewer">
	<div id="iv_header">
		<div style="flex:1;">Image Viewer</div>
		<div style="display: flex;filter: invert(1);gap: 8px;margin-right: 8px;">
            <div id="rotate_left" style="cursor: pointer;">${SVG.TURN_DEG}</div>
            <div id="rotate_right" style="transform: scaleX(-1);cursor: pointer;">${SVG.TURN_DEG}</div>
        </div>
		<div id="iv_close">${SVG.CLOSE}</div>
	</div>
    <section>
        <div id="iv_transform">
            <div id="iv_rotate">
                <img id="iv_image" src="" />
            </div>
        </div>
    </section>
</div>`);

    const $container = $('#imageViewer');
    const $section = $('#imageViewer > section');
    const $wrapT = $('#iv_transform');
    const $wrapR = $('#iv_rotate');
    const $header = $('#iv_header');
    const $closeIcon = $('#iv_close');
    const $image = $('#iv_image');
    const $rotateLeft = $('#rotate_left');
    const $rotateRight = $('#rotate_right');

    $image.attr('src', imageUrl);
    $container.css('display', 'flex');
    $wrapT.css('transform-origin', '0 0');
    $wrapT.css('transition', `transform 0.15s ease`);
    $wrapR.css('transform-origin', 'center');
    $wrapR.css('transition', `transform 0.15s ease`);
    $wrapT.css('will-change', 'transform');
    $wrapR.css('will-change', 'transform');

    let rotate = 0;
    let scale = 1;
    let posX = 0, posY = 0;
    let isDragging = false;
    let isMovingPhoto = false;
    let startX, startY;
    var previousPosition = {
        x: 0,
        y: 0
    };

    detectMovingViewerTimer = setInterval(() => {
        const currentPosition = {
            x: posX,
            y: posY
        };
        if (currentPosition.x !== previousPosition.x || currentPosition.y !== previousPosition.y) {
            isMovingPhoto = true;
        } else {
            isMovingPhoto = false;
        }
        previousPosition = currentPosition;
    }, 100);


    $image.on('load', () => {
        posX = 0;
        posY = 0;
        updateImageStyle();
    });

    $image.on('dragstart drop', (e) => {
        e.preventDefault();
    });

    $image.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isMovingPhoto) {
            if (scale <= 1) {
                makeZoomAction(e, Math.min(Math.max(1, scale + 1.25), 5));
            }
            else {
                scale = 1;
                posX = 0;
                posY = 0;
            }

            updateImageStyle();
        }
    });

    $section.on('wheel', (e) => {
        e.preventDefault();
        makeZoomAction(e);
    });

    $container.on('wheel', (e) => {
        e.preventDefault();
    });

    $image.on('mousedown', (e) => {
        if (scale == 1) return;

        isDragging = true;

        startX = e.pageX - posX;
        startY = e.pageY - posY;
        $image.css('cursor', 'grabbing');
    });

    $image.on('mouseup', () => {
        if (scale == 1) return;

        isDragging = false;
        $image.css('cursor', 'grab');
    });

    $rotateLeft.on('click', function () {
        rotate -= 90;
        updateImageStyle();
    });

    $rotateRight.on('click', function () {
        rotate += 90;
        updateImageStyle();
    });

    $(document).on('mousemove.igHelper', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        posX = e.pageX - startX;
        posY = e.pageY - startY;

        updateImageStyle();
    });

    $container.on('click', () => {
        removeImageViewer();
    });

    $closeIcon.on('click', () => {
        removeImageViewer();
    });

    $header.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    function updateImageStyle() {
        $wrapT.css('transition', isMovingPhoto ? "none" : `transform 0.15s ease`);
        $wrapT.css('transform', `translate(${posX}px, ${posY}px) scale(${scale})`);
        $wrapR.css('transform', `rotate(${rotate}deg)`);

        if (scale == 1) {
            $image.css('cursor', 'zoom-in');
        }
        else {
            $image.css('cursor', 'grabbing');
        }
    }


    function makeZoomAction(e, newScale) {
        e.preventDefault();

        let prevScale = scale;

        // newScale should be null when passing by wheel event
        if (newScale == null) {
            let factor = 0.1;
            let delta = e.originalEvent.deltaY < 0 ? 1 : -1;
            scale = Math.min(5, Math.max(1, scale + delta * factor * scale));
        }
        else {
            scale = newScale;
        }


        let rect = $section[0].getBoundingClientRect();
        let mx = e.clientX - rect.left;
        let my = e.clientY - rect.top;

        let zoomTargetX = (mx - posX) / prevScale;
        let zoomTargetY = (my - posY) / prevScale;

        posX = -zoomTargetX * scale + mx;
        posY = -zoomTargetY * scale + my;

        updateImageStyle();
    }
}

export function removeImageViewer() {
    clearInterval(detectMovingViewerTimer);
    $('#imageViewer').remove();
    $(document).off('mousemove.igHelper');
}