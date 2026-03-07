/* eslint-env browser */
export function createController(deps) {
  const { buildEmbedUrl, persistVideos, playerStates, ALLOWED_ORIGIN, requestPlayerSnapshot } =
    deps;

  function toggleZoomPanel(videoEntry) {
    if (videoEntry.zoomPanel) {
      destroyZoomPanel(videoEntry);
    } else {
      createZoomPanel(videoEntry);
    }
  }

  function createZoomPanel(videoEntry) {
    if (videoEntry.zoomPanel) {
      return;
    }

    const diameter = videoEntry.zoomDiameter ?? 250;
    const scale = videoEntry.zoomScale ?? 3;
    const originX = videoEntry.zoomOriginX ?? 50;
    const originY = videoEntry.zoomOriginY ?? 30;
    const shape = videoEntry.zoomShape ?? 'circle';

    const loupe = document.createElement('div');
    loupe.className = 'zoom-loupe';
    loupe.dataset.shape = shape;
    const lx = videoEntry.zoomPanelX ?? window.innerWidth - diameter - 40;
    const ly = videoEntry.zoomPanelY ?? 60;
    loupe.style.left = Math.max(0, Math.min(lx, window.innerWidth - 100)) + 'px';
    loupe.style.top = Math.max(0, Math.min(ly, window.innerHeight - 100)) + 'px';
    loupe.style.width = diameter + 'px';
    loupe.style.height = diameter + 'px';

    const zoomIframe = document.createElement('iframe');
    zoomIframe.src = buildEmbedUrl(videoEntry.id, { mute: 1, controls: 0 });
    zoomIframe.allow = 'autoplay; encrypted-media';
    zoomIframe.loading = 'lazy';
    zoomIframe.setAttribute('referrerpolicy', 'origin');
    zoomIframe.title = `Zoom: ${videoEntry.id}`;
    zoomIframe.style.transform = `scale(${scale})`;
    zoomIframe.style.transformOrigin = `${originX}% ${originY}%`;
    loupe.appendChild(zoomIframe);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'zoom-loupe-close';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      destroyZoomPanel(videoEntry);
    });
    loupe.appendChild(closeBtn);

    const tray = document.createElement('div');
    tray.className = 'zoom-loupe-tray';

    function addSlider(labelText, min, max, step, value, onChange) {
      const row = document.createElement('div');
      row.className = 'zoom-loupe-slider-row';
      const label = document.createElement('label');
      label.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = value;
      input.addEventListener('input', (event) => {
        event.stopPropagation();
        onChange(parseFloat(event.target.value));
      });
      input.addEventListener('mousedown', (event) => event.stopPropagation());
      row.appendChild(label);
      row.appendChild(input);
      tray.appendChild(row);
    }

    addSlider('X', 0, 100, 1, originX, (value) => {
      videoEntry.zoomOriginX = value;
      zoomIframe.style.transformOrigin = `${value}% ${videoEntry.zoomOriginY ?? 30}%`;
      persistVideos();
    });
    addSlider('Y', 0, 100, 1, originY, (value) => {
      videoEntry.zoomOriginY = value;
      zoomIframe.style.transformOrigin = `${videoEntry.zoomOriginX ?? 50}% ${value}%`;
      persistVideos();
    });
    addSlider('\u500D', 1.5, 6, 0.5, scale, (value) => {
      videoEntry.zoomScale = value;
      zoomIframe.style.transform = `scale(${value})`;
      persistVideos();
    });

    const shapeRow = document.createElement('div');
    shapeRow.className = 'zoom-loupe-shape-row';
    const shapeLabel = document.createElement('label');
    shapeLabel.textContent = 'Shape';
    const shapeSelect = document.createElement('select');
    [
      { value: 'circle', label: 'Circle' },
      { value: 'rounded', label: 'Rounded' },
      { value: 'square', label: 'Square' },
    ].forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      shapeSelect.appendChild(option);
    });
    shapeSelect.value = shape;
    shapeSelect.addEventListener('input', (event) => {
      event.stopPropagation();
      const nextShape = event.target.value;
      loupe.dataset.shape = nextShape;
      videoEntry.zoomShape = nextShape;
      persistVideos();
    });
    shapeSelect.addEventListener('mousedown', (event) => event.stopPropagation());
    shapeRow.appendChild(shapeLabel);
    shapeRow.appendChild(shapeSelect);
    tray.appendChild(shapeRow);
    loupe.appendChild(tray);

    document.body.appendChild(loupe);
    videoEntry.zoomPanel = loupe;

    setupZoomLoupeDrag(loupe, videoEntry);

    loupe.addEventListener('wheel', (event) => {
      event.preventDefault();
      const currentSize = videoEntry.zoomDiameter ?? 250;
      const nextSize = Math.max(100, Math.min(600, currentSize - Math.sign(event.deltaY) * 30));
      videoEntry.zoomDiameter = nextSize;
      loupe.style.width = nextSize + 'px';
      loupe.style.height = nextSize + 'px';
      persistVideos();
    });

    syncZoomIframe(videoEntry, zoomIframe);
  }

  function destroyZoomPanel(videoEntry) {
    if (videoEntry._zoomSyncInterval) {
      clearInterval(videoEntry._zoomSyncInterval);
      videoEntry._zoomSyncInterval = null;
    }
    const zoomWindow = videoEntry.zoomPanel?.querySelector('iframe')?.contentWindow;
    if (zoomWindow) {
      playerStates.delete(zoomWindow);
    }
    if (videoEntry.zoomPanel) {
      videoEntry.zoomPanel.remove();
      videoEntry.zoomPanel = null;
    }
  }

  function setupZoomLoupeDrag(loupe, videoEntry) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    loupe.addEventListener('mousedown', (event) => {
      if (event.target.closest('.zoom-loupe-close') || event.target.closest('input')) {
        return;
      }
      event.preventDefault();
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = loupe.offsetLeft;
      startTop = loupe.offsetTop;
      loupe.style.cursor = 'grabbing';

      const onMove = (moveEvent) => {
        if (!isDragging) {
          return;
        }
        loupe.style.left = startLeft + moveEvent.clientX - startX + 'px';
        loupe.style.top = startTop + moveEvent.clientY - startY + 'px';
      };

      const onUp = () => {
        if (!isDragging) {
          return;
        }
        isDragging = false;
        loupe.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        videoEntry.zoomPanelX = loupe.offsetLeft;
        videoEntry.zoomPanelY = loupe.offsetTop;
        persistVideos();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function syncZoomIframe(videoEntry, zoomIframe) {
    zoomIframe.addEventListener(
      'load',
      () => {
        setTimeout(() => {
          const zoomWin = zoomIframe.contentWindow;
          if (!zoomWin) {
            return;
          }
          try {
            zoomWin.postMessage(JSON.stringify({ event: 'listening' }), ALLOWED_ORIGIN);
          } catch (_) {
            // ignore
          }

          const mainWin = videoEntry.iframe?.contentWindow;
          const mainRec = mainWin ? playerStates.get(mainWin) : null;
          if (mainRec && typeof mainRec.time === 'number') {
            zoomWin.postMessage(
              JSON.stringify({ event: 'command', func: 'seekTo', args: [mainRec.time, true] }),
              ALLOWED_ORIGIN
            );
            if (mainRec.state === 1) {
              zoomWin.postMessage(
                JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
                ALLOWED_ORIGIN
              );
            }
          }
          zoomWin.postMessage(
            JSON.stringify({ event: 'command', func: 'mute', args: [] }),
            ALLOWED_ORIGIN
          );
        }, 500);
      },
      { once: true }
    );

    videoEntry._zoomSyncInterval = setInterval(() => {
      if (!videoEntry.zoomPanel) {
        clearInterval(videoEntry._zoomSyncInterval);
        videoEntry._zoomSyncInterval = null;
        return;
      }
      const zoomWin = zoomIframe.contentWindow;
      const mainWin = videoEntry.iframe?.contentWindow;
      if (!zoomWin || !mainWin) {
        return;
      }
      const mainRec = playerStates.get(mainWin);
      if (!mainRec || typeof mainRec.time !== 'number') {
        return;
      }

      const zoomRec = playerStates.get(zoomWin);
      const drift = typeof zoomRec?.time === 'number' ? Math.abs(zoomRec.time - mainRec.time) : 999;
      if (drift > 0.25) {
        zoomWin.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [mainRec.time, true] }),
          ALLOWED_ORIGIN
        );
      }
      if (mainRec.state === 1) {
        zoomWin.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          ALLOWED_ORIGIN
        );
      } else if (mainRec.state === 2) {
        zoomWin.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          ALLOWED_ORIGIN
        );
      }
      zoomWin.postMessage(
        JSON.stringify({ event: 'command', func: 'mute', args: [] }),
        ALLOWED_ORIGIN
      );
      requestPlayerSnapshot(zoomWin);
    }, 1000);
  }

  return {
    toggleZoomPanel,
    destroyZoomPanel,
  };
}
