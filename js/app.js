(() => {
  "use strict";

  const config = window.BIO_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const preloader = $("#preloader");
  const loaderFill = $("#loader-fill");
  const loaderPercent = $("#loader-percent");
  const avatar = $("#avatar");
  const linksList = $("#links-list");
  const audio = $("#audio-player");
  const playButton = $("#play-button");
  const playIcon = $(".play-icon");
  const progressFill = $("#progress-fill");
  const seekControl = $("#seek-control");
  const currentTimeLabel = $("#current-time");
  const durationLabel = $("#duration");
  const musicCard = $(".music-card");
  const snowCanvas = $("#snowfall");

  function setupSnow() {
    if (!snowCanvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = snowCanvas.getContext("2d");
    if (!context) return;

    const flakes = [];
    let width = 0;
    let height = 0;
    let frameId = 0;
    const random = (min, max) => Math.random() * (max - min) + min;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      snowCanvas.width = Math.round(width * pixelRatio);
      snowCanvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const count = Math.min(70, Math.max(30, Math.round(width / 20)));
      flakes.length = 0;
      for (let index = 0; index < count; index += 1) {
        flakes.push({
          x: random(0, width),
          y: random(0, height),
          radius: random(0.7, 2.2),
          speed: random(0.35, 1.15),
          drift: random(-0.3, 0.3),
          phase: random(0, Math.PI * 2),
          opacity: random(0.25, 0.8)
        });
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      flakes.forEach((flake) => {
        flake.phase += 0.012;
        flake.y += flake.speed;
        flake.x += flake.drift + Math.sin(flake.phase) * 0.25;
        if (flake.y > height + flake.radius) {
          flake.y = -flake.radius;
          flake.x = random(0, width);
        }
        if (flake.x < -flake.radius) flake.x = width + flake.radius;
        if (flake.x > width + flake.radius) flake.x = -flake.radius;

        context.beginPath();
        context.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        context.fill();
      });
      frameId = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (!document.hidden && !frameId) frameId = window.requestAnimationFrame(draw);
    };
    const stop = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
    start();
  }

  const setText = (selector, value) => {
    const element = $(selector);
    if (element && typeof value === "string") element.textContent = value;
  };

  function safeUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function setupProfile() {
    setText("#profile-eyebrow", config.profileEyebrow || "OFFICIAL PROFILE");
    setText("#profile-name", config.profileName || "NX OFFICIAL");
    setText("#profile-description", config.profileDescription || "");
    setText("#site-footer", config.footerText || "");
    avatar.src = safeUrl(config.avatarUrl) || config.fallbackAvatarUrl || "";
    avatar.addEventListener("error", () => {
      const fallback = safeUrl(config.fallbackAvatarUrl);
      if (fallback && avatar.src !== fallback) avatar.src = fallback;
    }, { once: true });
  }

  function renderLinks() {
    const links = Array.isArray(config.links) ? config.links.slice(0, 6) : [];
    linksList.replaceChildren();
    links.forEach((item) => {
      const href = safeUrl(item.url);
      if (!href) return;
      const anchor = document.createElement("a");
      anchor.className = "link-button";
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";

      const icon = document.createElement("span");
      icon.className = "link-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = item.icon || "↗";

      const label = document.createElement("span");
      label.className = "link-label";
      label.textContent = item.label || "OPEN LINK";

      const arrow = document.createElement("span");
      arrow.className = "link-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";

      anchor.append(icon, label, arrow);
      anchor.addEventListener("click", () => {
        anchor.classList.add("is-active");
        window.setTimeout(() => anchor.classList.remove("is-active"), 650);
      });
      linksList.append(anchor);
    });
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function setupMusic() {
    const music = config.music || {};
    setText("#track-title", music.title || "No track selected");
    const source = safeUrl(music.url);
    if (source) audio.src = source;

    const updateProgress = () => {
      const duration = audio.duration;
      const current = audio.currentTime || 0;
      const percent = Number.isFinite(duration) && duration > 0 ? (current / duration) * 100 : 0;
      progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      currentTimeLabel.textContent = formatTime(current);
      durationLabel.textContent = formatTime(duration);
    };

    const setPlaying = (playing) => {
      musicCard.classList.toggle("is-playing", playing);
      playButton.setAttribute("aria-pressed", String(playing));
      playButton.setAttribute("aria-label", playing ? "Jeda lagu" : "Putar lagu");
      playIcon.textContent = playing ? "Ⅱ" : "▶";
    };

    playButton.addEventListener("click", async () => {
      if (!audio.src) return;
      if (audio.paused) {
        try { await audio.play(); } catch (error) { console.warn("Audio tidak dapat diputar:", error); }
      } else {
        audio.pause();
      }
    });

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", () => { setPlaying(false); updateProgress(); });
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("durationchange", updateProgress);
    seekControl.addEventListener("click", (event) => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const rect = seekControl.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
      updateProgress();
    });
    updateProgress();
  }

  function runPreloader() {
    const minimum = Math.max(300, Number(config.preloaderDuration) || 1800);
    const start = performance.now();
    let displayed = 0;

    const update = () => {
      const elapsed = performance.now() - start;
      const timeProgress = Math.min(1, elapsed / minimum);
      const assetsReady = document.readyState === "complete";
      const target = assetsReady ? Math.min(100, Math.round(timeProgress * 100)) : Math.min(92, Math.round(timeProgress * 92));
      displayed += (target - displayed) * 0.12;
      const value = Math.floor(displayed);
      loaderFill.style.width = `${value}%`;
      loaderPercent.textContent = String(value);

      if (assetsReady && elapsed >= minimum && displayed >= 99.5) {
        loaderFill.style.width = "100%";
        loaderPercent.textContent = "100";
        window.setTimeout(() => {
          preloader.classList.add("is-hidden");
          document.body.classList.add("is-ready");
          preloader.setAttribute("aria-hidden", "true");
        }, 180);
      } else {
        window.requestAnimationFrame(update);
      }
    };
    window.requestAnimationFrame(update);
  }

  setupProfile();
  renderLinks();
  setupMusic();
  setupSnow();
  runPreloader();
})();
