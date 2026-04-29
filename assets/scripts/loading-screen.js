function loadFont(scene, fontName, fontData) {
  const texture = scene.textures.get(fontName);
  const image = texture.source[0];
  const imageWidth = image.width;
  const imageHeight = image.height;
  const fontConfig = {
    font: fontName,
    size: 0,
    lineHeight: 0,
    chars: {}
  };
  const kerningPairs = [];
  for (const line of fontData.split("\n")) {
    const lineParts = line.trim().split(/\s+/);
    if (!lineParts.length) {
      continue;
    }
    const lineType = lineParts[0];
    const properties = {};
    for (let i = 1; i < lineParts.length; i++) {
      const equalIndex = lineParts[i].indexOf("=");
      if (equalIndex >= 0) {
        properties[lineParts[i].slice(0, equalIndex)] = lineParts[i].slice(equalIndex + 1).replace(/^"|"$/g, "");
      }
    }
    if (lineType === "info") {
      fontConfig.size = parseInt(properties.size, 10);
    } else if (lineType === "common") {
      fontConfig.lineHeight = parseInt(properties.lineHeight, 10);
    } else if (lineType === "char") {
      const charId = parseInt(properties.id, 10);
      const charX = parseInt(properties.x, 10);
      const charY = parseInt(properties.y, 10);
      const charWidth = parseInt(properties.width, 10);
      const charHeight = parseInt(properties.height, 10);
      const u0 = charX / imageWidth;
      const v0 = charY / imageHeight;
      const u1 = (charX + charWidth) / imageWidth;
      const v1 = (charY + charHeight) / imageHeight;
      fontConfig.chars[charId] = {
        x: charX,
        y: charY,
        width: charWidth,
        height: charHeight,
        centerX: Math.floor(charWidth / 2),
        centerY: Math.floor(charHeight / 2),
        xOffset: parseInt(properties.xoffset, 10),
        yOffset: parseInt(properties.yoffset, 10),
        xAdvance: parseInt(properties.xadvance, 10),
        data: {},
        kerning: {},
        u0: u0,
        v0: v0,
        u1: u1,
        v1: v1
      };
      if (charWidth !== 0 && charHeight !== 0) {
        const charCode = String.fromCharCode(charId);
        const frame = texture.add(charCode, 0, charX, charY, charWidth, charHeight);
        if (frame) {
          frame.setUVs(charWidth, charHeight, u0, v0, u1, v1);
        }
      }
    } else if (lineType === "kerning") {
      kerningPairs.push({
        first: parseInt(properties.first, 10),
        second: parseInt(properties.second, 10),
        amount: parseInt(properties.amount, 10)
      });
    }
  }
  for (const kerningPair of kerningPairs) {
    if (fontConfig.chars[kerningPair.second]) {
      fontConfig.chars[kerningPair.second].kerning[kerningPair.first] = kerningPair.amount;
    }
  }
  scene.cache.bitmapFont.add(fontName, {
    data: fontConfig,
    texture: fontName,
    frame: null
  });
}

class A extends Phaser.Scene {
  constructor() {
    super({
      key: "BootScene"
    });
  }
preload() {
	if (window.gameCache) window.gameCache.init();
    (function (game) {
      if (game.renderer.type === Phaser.WEBGL) {
        let gl = game.renderer.gl;
        S = game.renderer.addBlendMode([gl.SRC_ALPHA, gl.ONE], gl.FUNC_ADD);
        E = game.renderer.addBlendMode([gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA], gl.FUNC_ADD);
      }
    })(this.game);
 
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const cy = H / 2;
 
    this.add.rectangle(cx, cy, W, H, 0x000000);
 
    const barW = W * 0.55;
    const barH = 18;
    const barX = cx - barW / 2;
    const barY = cy + 20;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x111133, 1);
    barBg.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 10);
    barBg.fillStyle(0x001133, 1);
    barBg.fillRoundedRect(barX, barY, barW, barH, 8);
 
    const barFill = this.add.graphics();
 
    const pctText = this.add.text(cx, barY + barH + 18, '0%', {
      fontSize: '14px', fontFamily: 'Arial', color: '#6699ff'
    }).setOrigin(0.5, 0);
 
    const loadingText = this.add.text(cx, barY - 24, 'Loading...', {
      fontSize: '15px', fontFamily: 'Arial', color: '#445588'
    }).setOrigin(0.5, 1);
 
    const consoleX = cx - barW / 2;
    const consoleY = barY + barH + 44;
    const consoleW = barW;
    const consoleH = 120;
    const consoleBg = this.add.graphics();
    consoleBg.fillStyle(0x000811, 1);
    consoleBg.fillRoundedRect(consoleX, consoleY, consoleW, consoleH, 6);
    consoleBg.lineStyle(1, 0x112244, 1);
    consoleBg.strokeRoundedRect(consoleX, consoleY, consoleW, consoleH, 6);
    const consoleText = this.add.text(consoleX + 8, consoleY + 8, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#3366aa',
      wordWrap: { width: consoleW - 16 }, lineSpacing: 3
    });
 
    const consoleLines = [];
    const fileBytesMap = {};
    let totalLoadedBytes = 0;
    let totalExpectedBytes = 0;
 
    const pushLine = (line) => {
      consoleLines.push(line);
      if (consoleLines.length > 8) consoleLines.shift();
      consoleText.setText(consoleLines.join('\n'));
    };
 
    this.load.on('fileprogress', (file) => {
      const prev = fileBytesMap[file.key] || { loaded: 0, total: 0 };
      const nowLoaded = file.bytesLoaded || 0;
      const nowTotal = file.bytesTotal || 0;
      totalLoadedBytes += nowLoaded - prev.loaded;
      if (nowTotal > prev.total) totalExpectedBytes += nowTotal - prev.total;
      fileBytesMap[file.key] = { loaded: nowLoaded, total: nowTotal };
      const remaining = Math.max(0, totalExpectedBytes - totalLoadedBytes);
      const remMB = (remaining / (1024 * 1024)).toFixed(2);
      const name = (file.url || file.key).split('/').pop();
      if (consoleLines.length === 0) consoleLines.push('');
      consoleLines[consoleLines.length - 1] = `> ${name}  (${remMB} MB left)`;
      consoleText.setText(consoleLines.join('\n'));
    });
 
    this.load.on('filecomplete', (key, type) => {
      const entry = fileBytesMap[key] || { loaded: 0, total: 0 };
      const sizeMB = (entry.total / (1024 * 1024)).toFixed(2);
      if (consoleLines.length > 0) consoleLines[consoleLines.length - 1] = `  ${key}  [${sizeMB} MB]`;
      pushLine('');
    });
 
    this.load.on("progress", (value) => {
      barFill.clear();
      const fillW = Math.max(0, barW * value);
      barFill.fillStyle(0x0044cc, 1);
      barFill.fillRoundedRect(barX, barY, fillW, barH, 8);
      barFill.fillStyle(0x4488ff, 0.5);
      barFill.fillRoundedRect(barX, barY, fillW, barH / 2, { tl: 8, tr: 8, bl: 0, br: 0 });
      pctText.setText(Math.floor(value * 100) + '%');
      loadingText.setText(value < 1 ? 'Loading...' : 'Launching (can take a second)!');
    });
    this.load.on("loaderror", error => {});
    if (window.gameCache) {
      const originalXhr = this.load.xhrLoader;
      this.load.xhrLoader = (file) => {
        const url = file.url;
        if (window.gameCache.isFileCached(url)) {
          const cached = window.gameCache.getCachedFile(url);
          if (cached) {
            return new Promise((resolve) => {
              setTimeout(() => {
                file.data = cached;
                resolve(file);
              }, 1);
            });
          }
        }
        return originalXhr.call(this.load, file).then((result) => {
          if (result && result.data) {
            window.gameCache.cacheFile(url, result.data);
          }
          return result;
        });
      };
    }
    this.load.atlas("GJ_WebSheet", "assets/sheets/GJ_WebSheet.png", "assets/sheets/GJ_WebSheet.json");
    this.load.once('filecomplete', (key) => {
      if (key === 'GJ_WebSheet') {
        this.add.image(cx, barY - 120, "GJ_WebSheet", "GJ_logo_001.png")
      }
    });
    this.load.atlas("GJ_GameSheet", "assets/sheets/GJ_GameSheet.png", "assets/sheets/GJ_GameSheet.json");
    this.load.atlas("GJ_GameSheet02", "assets/sheets/GJ_GameSheet02.png", "assets/sheets/GJ_GameSheet02.json");
    this.load.atlas("GJ_GameSheet03", "assets/sheets/GJ_GameSheet03.png", "assets/sheets/GJ_GameSheet03.json");
    this.load.atlas("GJ_GameSheet04", "assets/sheets/GJ_GameSheet04.png", "assets/sheets/GJ_GameSheet04.json");
    this.load.atlas("GJ_GameSheetEditor", "assets/sheets/GJ_GameSheetEditor.png", "assets/sheets/GJ_GameSheetEditor.json");
    this.load.atlas("GJ_GameSheetGlow", "assets/sheets/GJ_GameSheetGlow.png", "assets/sheets/GJ_GameSheetGlow.json");
    this.load.atlas("GJ_GameSheetIcons", "assets/sheets/GJ_GameSheetIcons.png", "assets/sheets/GJ_GameSheetIcons.json");
    this.load.atlas("GJ_LaunchSheet", "assets/sheets/GJ_LaunchSheet.png", "assets/sheets/GJ_LaunchSheet.json");
    this.load.atlas("player_ball_00", "assets/sheets/player_ball_00.png", "assets/sheets/player_ball_00.json");
    this.load.atlas("player_dart_00", "assets/sheets/player_dart_00.png", "assets/sheets/player_dart_00.json");
    this.load.image("bigFont", "assets/fonts/bigFont.png");
    this.load.text("bigFontFnt", "assets/fonts/bigFont.fnt");
    this.load.image("goldFont", "assets/fonts/goldFont.png");
    this.load.text("goldFontFnt", "assets/fonts/goldFont.fnt");
    this.load.image("game_bg_01", "assets/sprites/game_bg_01_001.png");
    this.load.image("sliderBar", "assets/sprites/sliderBar.png");
    this.load.image("square04_001", "assets/sprites/square04_001.png");
    this.load.image("GJ_square02", "assets/sprites/GJ_square02.png");
 
    for (let i = 1; i < 23; i++) {
      let index = i-1;
      i = String(i);
      if (i.length < 2) {
        i = "0"+i;
      }
      let paddedIndex = String(index);
      if (paddedIndex.length < 2) {
        paddedIndex = "0"+paddedIndex;
      }
      this.load.image("groundSquare_"+paddedIndex+"_001.png", "assets/game-ground/groundSquare_"+i+"_001.png");
    }
    
    for (let i = 1; i < 60; i++) {
      let index = i-1;
      i = String(i);
      if (i.length < 2) {
        i = "0"+i;
      }
      this.load.image("game_bg_"+index, "assets/game-bg/game_bg_"+i+"_001-hd.png");
    }
 
    this.load.audio("menu_music", "assets/music/menuLoop.mp3");
    this.load.audio("StayInsideMe", "assets/music/StayInsideMe.mp3");

    for (const lvlarray of window.allLevels){
      this.load.text(lvlarray[2], "assets/levels/"+lvlarray[2].split("_")[1]+".txt");
      this.load.audio(lvlarray[0], "assets/music/"+(lvlarray[4] ? lvlarray[4] : lvlarray[1].replaceAll(" ", ""))+".mp3");
    }
 
    this.load.audio("explode_11", "assets/sfx/explode_11.ogg");
    this.load.audio("endStart_02", "assets/sfx/endStart_02.ogg");
    this.load.audio("playSound_01", "assets/sfx/playSound_01.ogg");
    this.load.audio("quitSound_01", "assets/sfx/quitSound_01.ogg");
    this.load.audio("highscoreGet02", "assets/sfx/highscoreGet02.ogg");
  }
  create() {
    this.cache.text.get(window.currentlevel[2]);
    const bigFontData = this.cache.text.get("bigFontFnt");
    if (bigFontData) {
      loadFont(this, "bigFont", bigFontData);
    }
    const goldFontData = this.cache.text.get("goldFontFnt");
    if (goldFontData) {
      loadFont(this, "goldFont", goldFontData);
    }
    if (window.gameCache) {
      const stats = window.gameCache.getCacheStats();
      console.log('stats:', stats);
    }
    localStorage.setItem('webdash_assets_loaded', 'true');
    localStorage.setItem('webdash_last_load_time', Date.now().toString());
    this.scene.start("GameScene");
  }
}