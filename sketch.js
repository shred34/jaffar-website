// Variables globales
let currentProjectIndex = 2;
let projects = [];

// Configuration des projets (l'ordre détermine la disposition dans le carousel)
const projectsData = [
  {
    id: 1,
    title: "L'étoile de Mer",
    subtitle: "",
    file: "etoile-de-mer.html",
    image: "image/couv_etoile.jpg",
  },
  {
    id: 5,
    title: "Plus ou moins concret",
    subtitle: "5 projets",
    file: "concret.html",
    image: "image/couv_concret.jpg",
  },
  {
    id: 3,
    title: "Rural",
    subtitle: "",
    file: "rural.html",
    image: "image/couv_rural.jpg",
  },
  {
    id: 4,
    title: "Plus ou moins abstrait",
    subtitle: "6 projets",
    file: "abstrait.html",
    image: "image/couv_abstrait.jpg",
  },
  {
    id: 2,
    title: "La Plage",
    subtitle: "",
    file: "la-plage.html",
    image: "image/couv_plage.jpg",
  },
  {
    id: 6,
    title: "Portraits",
    subtitle: "11 projets",
    file: "portrait.html",
    image: "image/couv_portrait.jpg",
  },
];

// Éléments DOM
let projectsContainer,
  projectsScrollZone,
  bottomSection,
  mainContainer,
  navigationDots;
let video,
  videoThumbnail,
  playButton,
  playPauseBtn,
  timeline,
  timelineFilled,
  timeDisplay,
  fullscreenBtn,
  videoControls;

// Variables glitch
let currentGlitchState = "tristan";
let isGlitching = false;

// Variables UX
let dragHint,
  hintTimeout,
  hasScrolledDown = false;

// Séquence mobile : flèche → message → flèche
let mobileSequenceActive = false;
let mobileSequenceTimeouts = [];

// Variables mini-flèches - SIMPLE
let isDraggingGlobal = false;

// Variable pour l'animation d'entrée de la flèche
let arrowWasHidden = false;

// Boucle infinie scroll
let jaffarSectionEl = null;
let jaffarArrowTimeout = null;
let jaffarVisible = false;

// Constantes de configuration
const MOBILE_SEQUENCE_TIMING = {
  ARROW_DISPLAY: 2000, // Durée d'affichage de la flèche (ms)
  MESSAGE_DISPLAY: 2000, // Durée d'affichage du message (ms)
  FADE_TRANSITION: 300, // Durée des transitions fade (ms)
  INIT_DELAY: 500, // Délai avant démarrage séquence (ms)
  TRANSITION_DELAY: 100, // Délai entre flèche et message (ms)
};

// Fonctions utilitaires
let _isMobileCached = null;
function isMobileDevice() {
  if (_isMobileCached === null) {
    _isMobileCached =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  }
  return _isMobileCached;
}

function getMobileBottomPosition() {
  let bottomPx = 24;
  if (window.visualViewport) {
    const viewportHeight = window.visualViewport.height;
    const windowHeight = window.innerHeight;
    bottomPx = windowHeight - viewportHeight + 24;
    if (bottomPx < 24) bottomPx = 24;
  }
  return bottomPx;
}

function positionElementAtBottom(element, offset = 0) {
  if (!element) return;
  const bottomPx = getMobileBottomPosition() + offset;
  element.style.position = "fixed";
  element.style.left = "50%";
  element.style.bottom = bottomPx + "px";
  element.style.transform = "translateX(-50%)";
}

// Initialisation
document.addEventListener("DOMContentLoaded", function () {
  initializeElements();
  createProjects();
  createNavigationDots();
  setupEventListeners();
  setupNavigationClicks();
  updateProjectsDisplay();

  // Sur mobile : lancer la séquence flèche → message → flèche
  // Sur desktop : afficher le message drag normal
  if (isMobileDevice()) {
    setTimeout(() => {
      startMobileReturnSequence();
    }, MOBILE_SEQUENCE_TIMING.INIT_DELAY);
  } else {
    // Sur desktop, la flèche est déjà visible via CSS (opacity: 1)
    createDragHint();
  }

  createMiniArrows();
  setupVideoPlayer();
  setupMouseTracking();
  setInterval(forceNavigationClickable, 500);

  // --- Interaction desktop : clic sur la moitié droite/gauche de la page pour tourner le carousel ---
  if (!isMobileDevice()) {
    document.addEventListener("click", function (e) {
      // Ne rien faire si clic sur un bouton, un lien, ou un élément interactif
      let el = e.target;
      while (el) {
        if (
          el.tagName === "BUTTON" ||
          el.tagName === "A" ||
          el.classList.contains("nav-item") ||
          el.classList.contains("nav-dot") ||
          el.classList.contains("project-item") ||
          el.classList.contains("drag-hint") ||
          el.classList.contains("bottom-section") ||
          el.classList.contains("scroll-arrow") ||
          (el.closest &&
            el.closest(
              ".nav-fixed, .video-controls, .project-item, .drag-hint",
            ))
        ) {
          return;
        }
        el = el.parentElement;
      }
      // Ligne imaginaire au centre
      const x = e.clientX;
      const center = window.innerWidth / 2;
      if (x > center) {
        // Tourner à droite
        goToProject((currentProjectIndex + 1) % projectsData.length);
      } else {
        // Tourner à gauche
        goToProject(
          (currentProjectIndex - 1 + projectsData.length) % projectsData.length,
        );
      }
    });
  }
});

function initializeElements() {
  projectsContainer = document.getElementById("projectsContainer");
  projectsScrollZone = document.getElementById("projectsScrollZone");
  bottomSection = document.getElementById("bottomSection");
  mainContainer = document.querySelector(".main-container");
  navigationDots = document.getElementById("navigationDots");
  video = document.getElementById("mainVideo");
  videoThumbnail = document.getElementById("videoThumbnail");
  playButton = document.getElementById("playButton");
  playPauseBtn = document.getElementById("playPauseBtn");
  timeline = document.getElementById("timeline");
  timelineFilled = document.getElementById("timelineFilled");
  timeDisplay = document.getElementById("timeDisplay");
  fullscreenBtn = document.getElementById("fullscreenBtn");
  videoControls = document.getElementById("videoControls");

  // Pré-créer l'overlay gradient pour éviter le saut visuel au premier scroll
  if (mainContainer && !document.querySelector(".gradient-overlay")) {
    const gradientOverlay = document.createElement("div");
    gradientOverlay.className = "gradient-overlay";
    gradientOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 150;
      pointer-events: none;
      opacity: 1;
      background: linear-gradient(to bottom,
        transparent 0%,
        transparent 95%,
        rgba(204,204,204,0.3) 97%,
        rgba(102,102,102,0.6) 98.5%,
        rgba(0,0,0,0.9) 99.5%,
        rgba(0,0,0,1) 100%);
    `;
    mainContainer.appendChild(gradientOverlay);
  }
}

// MINI-FLÈCHES : Créer les flèches
function createMiniArrows() {
  // Ne jamais créer les flèches sur mobile
  if (isMobileDevice()) {
    return;
  }
  // Créer flèche gauche — SVG custom
  const leftArrow = document.createElement("div");
  leftArrow.innerHTML =
    '<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5L2 9L8 16.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  leftArrow.id = "leftArrow";
  leftArrow.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 999999;
    color: #000;
    left: 100px;
    top: 100px;
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.15));
    line-height: 0;
  `;
  document.body.appendChild(leftArrow);

  // Créer flèche droite — SVG custom
  const rightArrow = document.createElement("div");
  rightArrow.innerHTML =
    '<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5L8 9L2 16.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  rightArrow.id = "rightArrow";
  rightArrow.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 999999;
    color: #000;
    left: 140px;
    top: 100px;
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.15));
    line-height: 0;
  `;
  document.body.appendChild(rightArrow);

  // Cacher les flèches tant que la souris n'a pas bougé
  window.__arrowsShownOnce = false;
  function onFirstMouseMove(e) {
    if (!window.__arrowsShownOnce) {
      window.__arrowsShownOnce = true;
      // Positionner instantanément sur le curseur
      leftArrow.style.left = e.clientX - 25 + "px";
      leftArrow.style.top = e.clientY - 10 + "px";
      rightArrow.style.left = e.clientX + 15 + "px";
      rightArrow.style.top = e.clientY - 10 + "px";
      leftArrow.style.opacity = "1";
      rightArrow.style.opacity = "1";
    }
  }
  document.addEventListener("mousemove", onFirstMouseMove, { once: true });
  // Les flèches restent cachées tant que la souris n'a pas bougé
  leftArrow.style.opacity = "0";
  rightArrow.style.opacity = "0";
  // Elles seront gérées ensuite par showArrows/hideArrows
  console.log("🎯 FLÈCHES CRÉÉES !");

  // --- Desktop uniquement : cacher/afficher les flèches quand la souris quitte/revient sur le document ---
  if (!isMobileDevice()) {
    let arrowsTemporarilyHidden = false;
    document.body.addEventListener("mouseleave", function () {
      const leftArrow = document.getElementById("leftArrow");
      const rightArrow = document.getElementById("rightArrow");
      if (leftArrow && rightArrow) {
        leftArrow.style.opacity = "0";
        rightArrow.style.opacity = "0";
        arrowsTemporarilyHidden = true;
      }
    });
    document.body.addEventListener("mouseenter", function () {
      const leftArrow = document.getElementById("leftArrow");
      const rightArrow = document.getElementById("rightArrow");
      if (
        leftArrow &&
        rightArrow &&
        window.__arrowsShownOnce &&
        typeof dragHint !== "undefined" &&
        dragHint &&
        dragHint.style.opacity === "1" &&
        arrowsTemporarilyHidden
      ) {
        leftArrow.style.opacity = "1";
        rightArrow.style.opacity = "1";
        arrowsTemporarilyHidden = false;
      }
    });
  }

  // --- Ajout listeners desktop pour cacher/afficher les flèches quand la souris quitte/revient ---
  if (!isMobileDevice()) {
    window.addEventListener("mouseleave", function () {
      const leftArrow = document.getElementById("leftArrow");
      const rightArrow = document.getElementById("rightArrow");
      if (leftArrow && rightArrow) {
        leftArrow.style.opacity = "0";
        rightArrow.style.opacity = "0";
      }
    });
    window.addEventListener("mouseenter", function () {
      const leftArrow = document.getElementById("leftArrow");
      const rightArrow = document.getElementById("rightArrow");
      // dragHint existe et est visible (opacité 1)
      if (
        leftArrow &&
        rightArrow &&
        window.__arrowsShownOnce &&
        typeof dragHint !== "undefined" &&
        dragHint &&
        dragHint.style.opacity === "1"
      ) {
        leftArrow.style.opacity = "1";
        rightArrow.style.opacity = "1";
      }
    });
  }
}

// MINI-FLÈCHES : Suivre la souris
function setupMouseTracking() {
  let mouseXGlobal = 0;
  let mouseYGlobal = 0;

  document.addEventListener("mousemove", function (e) {
    mouseXGlobal = e.clientX;
    mouseYGlobal = e.clientY;
  });

  // Animation fluide des flèches
  function updateArrowsPosition() {
    const leftArrow = document.getElementById("leftArrow");
    const rightArrow = document.getElementById("rightArrow");

    if (leftArrow && rightArrow) {
      leftArrow.style.left = mouseXGlobal - 25 + "px";
      leftArrow.style.top = mouseYGlobal - 10 + "px";
      rightArrow.style.left = mouseXGlobal + 15 + "px";
      rightArrow.style.top = mouseYGlobal - 10 + "px";
    }

    requestAnimationFrame(updateArrowsPosition);
  }
  updateArrowsPosition();
}

// MINI-FLÈCHES : Afficher (quand le texte est visible)
function showArrows() {
  const leftArrow = document.getElementById("leftArrow");
  const rightArrow = document.getElementById("rightArrow");

  if (leftArrow && rightArrow && window.__arrowsShownOnce) {
    leftArrow.style.opacity = "1";
    rightArrow.style.opacity = "1";
  }
}

// MINI-FLÈCHES : Cacher (quand le texte disparaît)
function hideArrows() {
  const leftArrow = document.getElementById("leftArrow");
  const rightArrow = document.getElementById("rightArrow");

  if (leftArrow && rightArrow) {
    leftArrow.style.opacity = "0";
    rightArrow.style.opacity = "0";
  }
}

function createDragHintWithDuration(duration) {
  dragHint = document.createElement("div");
  dragHint.className = "drag-hint";
  dragHint.textContent = "Maintenez appuyé et faites glisser horizontalement";
  dragHint.style.cssText = `
    position: absolute;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: white;
    padding: 6px 12px;
    border-radius: 15px;
    z-index: 250;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
    font-weight: 400;
    letter-spacing: 0.3px;
    white-space: nowrap;
    background: transparent;
  `;

  // Sur mobile, positionner dynamiquement le message drag en bas
  if (isMobileDevice()) {
    positionElementAtBottom(dragHint, 5);
    dragHint.style.zIndex = 250;
    // Cacher la flèche verticale tant que le message drag est visible
    if (bottomSection) {
      bottomSection.style.opacity = 0;
      bottomSection.style.pointerEvents = "none";
    }
    document.body.appendChild(dragHint);
  } else {
    mainContainer.appendChild(dragHint);
  }

  setTimeout(() => {
    dragHint.style.opacity = "1";
    dragHint.style.textShadow =
      "0 0 8px rgba(0, 0, 0, 0.8), 0 0 16px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 0, 0, 0.4)";

    // AFFICHER LES FLÈCHES en même temps que le texte
    showArrows();
  }, 100);

  hintTimeout = setTimeout(() => {
    hideHint();
  }, duration);
}

function hideHint() {
  if (dragHint) {
    dragHint.style.textShadow = "none";
    dragHint.style.opacity = "0";

    // CACHER LES FLÈCHES en même temps que le texte
    hideArrows();

    setTimeout(() => {
      if (dragHint && dragHint.parentNode) {
        dragHint.parentNode.removeChild(dragHint);
        dragHint = null;
      }
      // Sur mobile, afficher la flèche verticale après disparition du message drag
      if (isMobileDevice() && bottomSection) {
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const scrollProgress = Math.min(scrollTop / (windowHeight * 0.2), 1);
        if (scrollProgress < 0.1) {
          positionElementAtBottom(bottomSection);
          bottomSection.style.opacity = "1";
          bottomSection.style.pointerEvents = "auto";
        }
      }
    }, 200);
  }
}

function createDragHint() {
  createDragHintWithDuration(4000);
}

function createProjects() {
  projects = [...projectsData, ...projectsData, ...projectsData];
  projectsContainer.innerHTML = "";

  projects.forEach((project, index) => {
    const projectElement = document.createElement("div");
    projectElement.className = "project-item";
    projectElement.setAttribute("data-project", project.id);
    projectElement.setAttribute("data-index", index);

    const subtitleHtml = project.subtitle
      ? `<div class="project-subtitle">(${project.subtitle})</div>`
      : "";
    projectElement.innerHTML = `
      <img src="${project.image}" alt="${project.title}" class="project-image" 
           onerror="this.src='image/GREY.jpg'">
      <div class="project-title">${project.title}</div>
      ${subtitleHtml}
    `;

    projectElement.addEventListener("click", function () {
      if (this.classList.contains("center")) {
        showProject(project.id);
      } else if (
        this.classList.contains("left") ||
        this.classList.contains("right") ||
        this.classList.contains("far-left") ||
        this.classList.contains("far-right")
      ) {
        const projectIndex = parseInt(this.getAttribute("data-index"));
        const targetProjectIndex = projectIndex % projectsData.length;
        goToProject(targetProjectIndex);

        if (dragHint) {
          clearTimeout(hintTimeout);
          hideHint();
        }
      }
    });

    projectsContainer.appendChild(projectElement);
  });

  currentProjectIndex = projectsData.length + 2;
}

function createNavigationDots() {
  if (!navigationDots) return;

  navigationDots.innerHTML = "";

  projectsData.forEach((project, index) => {
    const dot = document.createElement("div");
    dot.className = "nav-dot";
    dot.setAttribute("data-project-index", index);
    dot.setAttribute("title", project.title);

    dot.addEventListener("click", function () {
      goToProject(index);
      if (dragHint) {
        clearTimeout(hintTimeout);
        hideHint();
      }
    });
    // Sur mobile, rendre le dot cliquable au toucher
    dot.addEventListener(
      "touchend",
      function (e) {
        e.preventDefault();
        goToProject(index);
        if (dragHint) {
          clearTimeout(hintTimeout);
          hideHint();
        }
      },
      { passive: false },
    );

    setupDotDrag(dot, index);
    navigationDots.appendChild(dot);
  });

  updateActiveDot();
}

function setupDotDrag(dot, index) {
  let isDragging = false;
  let startX = 0;
  let startIndex = index;

  dot.addEventListener("mousedown", function (e) {
    isDragging = true;
    isDraggingGlobal = true;
    startX = e.clientX;
    startIndex = index;
    dot.classList.add("dragging");
    e.preventDefault();

    if (dragHint) {
      clearTimeout(hintTimeout);
      hideHint();
    }
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const sensitivity = 30;

    if (Math.abs(deltaX) > sensitivity) {
      const direction = deltaX > 0 ? 1 : -1;
      const newIndex = startIndex + direction;

      if (newIndex >= 0 && newIndex < projectsData.length) {
        goToProject(newIndex);
        startX = e.clientX;
        startIndex = newIndex;
      }
    }
  });

  document.addEventListener("mouseup", function () {
    if (isDragging) {
      isDragging = false;
      isDraggingGlobal = false;
      dot.classList.remove("dragging");
    }
  });

  dot.addEventListener(
    "touchstart",
    function (e) {
      isDragging = true;
      isDraggingGlobal = true;
      startX = e.touches[0].clientX;
      startIndex = index;
      dot.classList.add("dragging");
      e.preventDefault();

      if (dragHint) {
        clearTimeout(hintTimeout);
        hideHint();
      }
    },
    { passive: false },
  );

  document.addEventListener(
    "touchmove",
    function (e) {
      if (!isDragging) return;

      const deltaX = e.touches[0].clientX - startX;
      const sensitivity = 20;

      if (Math.abs(deltaX) > sensitivity) {
        const direction = deltaX > 0 ? 1 : -1;
        const newIndex = startIndex + direction;

        if (newIndex >= 0 && newIndex < projectsData.length) {
          goToProject(newIndex);
          startX = e.touches[0].clientX;
          startIndex = newIndex;
        }
      }
    },
    { passive: false },
  );

  document.addEventListener("touchend", function () {
    if (isDragging) {
      isDragging = false;
      isDraggingGlobal = false;
      dot.classList.remove("dragging");
    }
  });
}

function goToProject(targetIndex) {
  currentProjectIndex = projectsData.length + targetIndex;
  updateProjectsDisplay();
  updateActiveDot();
  // Sur mobile, scroll horizontal jusqu'au projet
  if (isMobileDevice() && projectsContainer) {
    const projectEls = projectsContainer.querySelectorAll(".project-item");
    if (projectEls[targetIndex]) {
      projectEls[targetIndex].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }
}

function updateActiveDot() {
  if (!navigationDots) return;

  const dots = navigationDots.querySelectorAll(".nav-dot");
  const realProjectIndex = getCurrentRealProjectIndex();

  dots.forEach((dot, index) => {
    if (index === realProjectIndex) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
}

function getCurrentRealProjectIndex() {
  return currentProjectIndex % projectsData.length;
}

function nextProject() {
  currentProjectIndex++;

  if (currentProjectIndex >= projects.length - projectsData.length / 2) {
    setTimeout(() => {
      currentProjectIndex = projectsData.length;
      updateProjectsDisplayInstant();
    }, 100);
  }

  updateProjectsDisplay();
  updateActiveDot();
}

function prevProject() {
  currentProjectIndex--;

  if (currentProjectIndex < projectsData.length / 2) {
    setTimeout(() => {
      currentProjectIndex = projects.length - projectsData.length - 1;
      updateProjectsDisplayInstant();
    }, 100);
  }

  updateProjectsDisplay();
  updateActiveDot();
}

function updateProjectsDisplay() {
  const projectItems = document.querySelectorAll(".project-item");

  projectItems.forEach((item, index) => {
    item.classList.remove(
      "center",
      "left",
      "right",
      "far-left",
      "far-right",
      "hidden",
    );

    const relativePosition = index - currentProjectIndex;

    if (relativePosition === 0) {
      item.classList.add("center");
    } else if (relativePosition === -1) {
      item.classList.add("left");
    } else if (relativePosition === 1) {
      item.classList.add("right");
    } else if (relativePosition === -2) {
      item.classList.add("far-left");
    } else if (relativePosition === 2) {
      item.classList.add("far-right");
    } else {
      item.classList.add("hidden");
    }
  });
}

function updateProjectsDisplayInstant() {
  const projectItems = document.querySelectorAll(".project-item");

  projectItems.forEach((item) => {
    item.style.transition = "none";
  });

  projectItems.forEach((item, index) => {
    item.classList.remove(
      "center",
      "left",
      "right",
      "far-left",
      "far-right",
      "hidden",
    );

    const relativePosition = index - currentProjectIndex;

    if (relativePosition === 0) {
      item.classList.add("center");
    } else if (relativePosition === -1) {
      item.classList.add("left");
    } else if (relativePosition === 1) {
      item.classList.add("right");
    } else if (relativePosition === -2) {
      item.classList.add("far-left");
    } else if (relativePosition === 2) {
      item.classList.add("far-right");
    } else {
      item.classList.add("hidden");
    }
  });

  requestAnimationFrame(() => {
    projectItems.forEach((item) => {
      item.style.transition = "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    });
  });

  updateActiveDot();
}

let _scrollRafPending = false;
function _throttledScroll() {
  if (_scrollRafPending) return;
  _scrollRafPending = true;
  requestAnimationFrame(() => {
    handleVerticalScroll();
    _scrollRafPending = false;
  });
}

function setupEventListeners() {
  window.addEventListener("scroll", _throttledScroll, { passive: true });

  if (bottomSection) {
    bottomSection.addEventListener("click", function () {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevProject();

      if (dragHint) {
        clearTimeout(hintTimeout);
        hideHint();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextProject();

      if (dragHint) {
        clearTimeout(hintTimeout);
        hideHint();
      }
    }
  });

  setupGlobalDrag();
}

function setupGlobalDrag() {
  let isDragging = false;
  let dragStarted = false;
  let startX = 0;
  let startY = 0;
  let touchDirectionLocked = null;
  let dragThreshold = 10; // Seuil pour distinguer clic et drag

  document.addEventListener("mousedown", function (e) {
    // Ignorer navigation
    if (
      e.target.closest(".nav-fixed") ||
      e.target.classList.contains("nav-item") ||
      e.target.classList.contains("nav-artist")
    ) {
      return;
    }

    // Ignorer autres éléments interactifs (sauf projets)
    if (isInteractiveElement(e.target) && !e.target.closest(".project-item")) {
      return;
    }

    isDragging = true;
    dragStarted = false;
    startX = e.clientX;
    e.preventDefault();

    if (dragHint) {
      clearTimeout(hintTimeout);
      hideHint();
    }
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;

    // Démarrer le drag seulement après un certain seuil
    if (!dragStarted && Math.abs(deltaX) > dragThreshold) {
      dragStarted = true;
      isDraggingGlobal = true;
      document.body.style.cursor = "grabbing";
    }

    if (dragStarted) {
      const sensitivity = 50;

      if (Math.abs(deltaX) > sensitivity) {
        if (deltaX > 0) {
          prevProjectInfinite();
        } else {
          nextProjectInfinite();
        }

        startX = e.clientX;
      }
    }
  });

  document.addEventListener("mouseup", function (e) {
    if (isDragging) {
      // Si c'était juste un clic (pas de drag)
      if (!dragStarted) {
        // Laisser les événements click normaux se déclencher
        const target = e.target.closest(".project-item");
        if (target && target.classList.contains("center")) {
          // Clic simple sur projet central = ouvrir
          const projectId = target.getAttribute("data-project");
          setTimeout(() => showProject(projectId), 0);
        }
      }

      isDragging = false;
      dragStarted = false;
      isDraggingGlobal = false;
      document.body.style.cursor = "";
    }
  });

  // Touch events
  document.addEventListener(
    "touchstart",
    function (e) {
      if (
        e.target.closest(".nav-fixed") ||
        e.target.classList.contains("nav-item") ||
        e.target.classList.contains("nav-artist")
      ) {
        return;
      }

      if (
        isInteractiveElement(e.target) &&
        !e.target.closest(".project-item")
      ) {
        return;
      }

      isDragging = true;
      isDraggingGlobal = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      touchDirectionLocked = null;

      if (dragHint) {
        clearTimeout(hintTimeout);
        hideHint();
      }
    },
    { passive: false },
  );

  document.addEventListener(
    "touchmove",
    function (e) {
      if (!isDragging) return;

      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      const sensitivity = 30;

      // Verrouiller la direction au premier mouvement significatif
      if (
        !touchDirectionLocked &&
        (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)
      ) {
        touchDirectionLocked =
          Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical";
      }

      // Si horizontal : bloquer le scroll vertical immédiatement
      if (touchDirectionLocked === "horizontal") {
        e.preventDefault();

        if (Math.abs(deltaX) > sensitivity) {
          if (deltaX > 0) {
            prevProjectInfinite();
          } else {
            nextProjectInfinite();
          }
          startX = e.touches[0].clientX;
        }
      }
    },
    { passive: false },
  );

  document.addEventListener("touchend", function () {
    if (isDragging) {
      isDragging = false;
      isDraggingGlobal = false;
      touchDirectionLocked = null;
    }
  });
}

function isInteractiveElement(element) {
  let current = element;
  while (current && current !== document.body) {
    if (
      current.classList.contains("nav-fixed") ||
      current.classList.contains("nav-item") ||
      current.classList.contains("nav-artist")
    ) {
      return false;
    }

    if (
      current.classList.contains("nav-dot") ||
      current.classList.contains("navigation-dots")
    ) {
      return true;
    }

    if (
      current.tagName === "BUTTON" ||
      current.tagName === "A" ||
      current.classList.contains("video-player") ||
      current.classList.contains("video-controls") ||
      current.classList.contains("back-button") ||
      current.classList.contains("page") ||
      current.classList.contains("scroll-arrow") ||
      current.classList.contains("bottom-section")
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function nextProjectInfinite() {
  currentProjectIndex++;

  if (currentProjectIndex >= projects.length) {
    currentProjectIndex = 0;
  }

  updateProjectsDisplay();
  updateActiveDot();
}

function prevProjectInfinite() {
  currentProjectIndex--;

  if (currentProjectIndex < 0) {
    currentProjectIndex = projects.length - 1;
  }

  updateProjectsDisplay();
  updateActiveDot();
}

// Annuler la séquence mobile en cours
function cancelMobileSequence() {
  mobileSequenceActive = false;
  mobileSequenceTimeouts.forEach((timeout) => clearTimeout(timeout));
  mobileSequenceTimeouts = [];

  if (dragHint) {
    clearTimeout(hintTimeout);
    hideHint();
  }
}

// Séquence sur mobile : flèche → message → flèche (jamais les 2 ensemble)
// SANS animation de montée (fade in/out simple)
function startMobileReturnSequence() {
  if (!isMobileDevice()) return;

  // Annuler toute séquence en cours
  cancelMobileSequence();
  mobileSequenceActive = true;

  // ÉTAPE 1 : Afficher la flèche - FADE IN simple
  positionElementAtBottom(bottomSection);
  bottomSection.style.opacity = "1";
  bottomSection.style.pointerEvents = "auto";

  // ÉTAPE 2 : Après délai, cacher la flèche (fade out)
  const timeout1 = setTimeout(() => {
    if (!mobileSequenceActive) return;

    bottomSection.style.opacity = "0";
    bottomSection.style.pointerEvents = "none";

    // ÉTAPE 3 : Après le fade out, afficher le message
    const timeout2 = setTimeout(() => {
      if (!mobileSequenceActive) return;

      createDragHintWithDuration(MOBILE_SEQUENCE_TIMING.MESSAGE_DISPLAY);

      // ÉTAPE 4 : Après durée message, le message disparaît et la flèche revient
      const timeout3 = setTimeout(() => {
        if (!mobileSequenceActive) return;

        if (dragHint) {
          hideHint();
        }

        mobileSequenceActive = false;
      }, MOBILE_SEQUENCE_TIMING.MESSAGE_DISPLAY);

      mobileSequenceTimeouts.push(timeout3);
    }, MOBILE_SEQUENCE_TIMING.TRANSITION_DELAY);

    mobileSequenceTimeouts.push(timeout2);
  }, MOBILE_SEQUENCE_TIMING.ARROW_DISPLAY);

  mobileSequenceTimeouts.push(timeout1);
}

function handleVerticalScroll() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const scrollProgress = Math.min(scrollTop / (windowHeight * 0.85), 1);
  const isMobile = isMobileDevice();

  // --- Drag hint: cacher dès qu'on scroll ---
  if (scrollTop > 2 && !hasScrolledDown) {
    hasScrolledDown = true;

    if (isMobile && mobileSequenceActive) {
      cancelMobileSequence();
    }

    if (dragHint) {
      clearTimeout(hintTimeout);
      hideHint();
    }
  } else if (scrollTop <= 2 && hasScrolledDown) {
    hasScrolledDown = false;

    if (isMobile) {
      setTimeout(() => {
        startMobileReturnSequence();
      }, 200);
    } else {
      setTimeout(() => {
        if (!dragHint) {
          createDragHintWithDuration(3000);
        }
      }, 200);
    }
  }

  updateGradientOnScroll(scrollProgress);

  // --- Flèche du bas : logique SIMPLE ---
  // Visible quand on est en haut, cachée sinon. C'est tout.
  if (bottomSection) {
    if (scrollProgress > 0.02) {
      bottomSection.style.opacity = "0";
      bottomSection.style.pointerEvents = "none";
    } else {
      // Ne pas forcer l'affichage si la séquence mobile est en cours et a caché la flèche
      if (
        !(
          isMobile &&
          mobileSequenceActive &&
          bottomSection.style.opacity === "0"
        )
      ) {
        bottomSection.style.opacity = "1";
        bottomSection.style.pointerEvents = "auto";
      }
    }

    // Positionnement mobile
    if (scrollProgress < 0.15 && isMobile) {
      positionElementAtBottom(bottomSection);
    }
  }

  // --- Dots navigation ---
  if (navigationDots) {
    if (scrollProgress >= 0.25) {
      const dotOpacity = Math.max(0, 1 - (scrollProgress - 0.25) / 0.15);
      navigationDots.style.opacity = dotOpacity;
    } else {
      navigationDots.style.opacity = 1;
    }
  }

  if (dragHint && scrollProgress > 0.05) {
    clearTimeout(hintTimeout);
    hideHint();
  }

  if (scrollProgress >= 0.35) {
    createOrShowVideo(scrollProgress);
  } else {
    hideVideo();
  }

  // Section Jaffar sous la vidéo
  updateJaffarSection(scrollProgress);

  handleNavigationTransition(scrollProgress);
}

// Cache DOM refs pour le scroll handler
let _cachedNavFixed = null;
let _cachedArtistNav = null;
let _cachedNavItems = null;
let _cachedGradientOverlay = null;

function handleNavigationTransition(scrollProgress) {
  if (!_cachedNavFixed) _cachedNavFixed = document.querySelector(".nav-fixed");
  if (!_cachedArtistNav)
    _cachedArtistNav = document.querySelector(".nav-artist");
  const navFixed = _cachedNavFixed;
  const artistNav = _cachedArtistNav;

  if (!navFixed || !artistNav) return;

  navFixed.style.zIndex = "999999";
  navFixed.style.pointerEvents = "auto";
  navFixed.style.position = "fixed";

  if (!_cachedNavItems)
    _cachedNavItems = navFixed.querySelectorAll(".nav-item");
  const navItems = _cachedNavItems;
  navItems.forEach((item) => {
    item.style.pointerEvents = "auto";
    item.style.cursor = "pointer";
    item.style.zIndex = "999999";
  });

  if (scrollProgress >= 0.3) {
    const whiteness = Math.min(255, ((scrollProgress - 0.3) / 0.7) * 255);
    navFixed.style.color = `rgb(${whiteness}, ${whiteness}, ${whiteness})`;

    navItems.forEach((item) => {
      item.style.textShadow = "0 0 3px rgba(0,0,0,0.8)";
    });
  } else {
    navFixed.style.color = "#333";
    navItems.forEach((item) => {
      item.style.textShadow = "none";
    });
  }

  const glitchZoneStart = 0.4;
  const glitchZoneEnd = 0.8;

  if (scrollProgress >= glitchZoneStart && scrollProgress <= glitchZoneEnd) {
    const glitchProgressLocal =
      (scrollProgress - glitchZoneStart) / (glitchZoneEnd - glitchZoneStart);

    if (glitchProgressLocal > 0.5 && currentGlitchState === "tristan") {
      startFluidGlitch(artistNav, "tristan", "jaffar");
      currentGlitchState = "jaffar";
    } else if (glitchProgressLocal < 0.5 && currentGlitchState === "jaffar") {
      startFluidGlitch(artistNav, "jaffar", "tristan");
      currentGlitchState = "tristan";
    }
  } else if (scrollProgress < glitchZoneStart) {
    if (currentGlitchState !== "tristan") {
      artistNav.textContent = "Tristan Linder";
      currentGlitchState = "tristan";
      isGlitching = false;
      forceNavigationEvents(artistNav);
    }
  } else if (scrollProgress > glitchZoneEnd) {
    if (currentGlitchState !== "jaffar") {
      artistNav.textContent = "Jaffar Ulmuton";
      currentGlitchState = "jaffar";
      isGlitching = false;
      forceNavigationEvents(artistNav);
    }
  }
}

function startFluidGlitch(element, fromText, toText) {
  if (isGlitching) return;

  isGlitching = true;

  const texts = {
    tristan: "Tristan Linder",
    jaffar: "Jaffar Ulmuton",
  };

  const originalText = texts[fromText];
  const targetText = texts[toText];
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  let currentText = originalText.split("");
  let iterations = 0;
  const maxIterations = 15;

  const glitchInterval = setInterval(() => {
    const progress = iterations / maxIterations;

    for (let i = 0; i < Math.max(originalText.length, targetText.length); i++) {
      if (progress > i / Math.max(originalText.length, targetText.length)) {
        if (i < targetText.length) {
          currentText[i] = targetText[i];
        } else {
          currentText[i] = "";
        }
      } else {
        if (Math.random() < 0.7) {
          currentText[i] = chars[Math.floor(Math.random() * chars.length)];
        }
      }
    }

    element.textContent = currentText.join("").substring(0, targetText.length);
    forceNavigationEvents(element);

    iterations++;

    if (iterations >= maxIterations) {
      clearInterval(glitchInterval);
      element.textContent = targetText;
      forceNavigationEvents(element);
      isGlitching = false;
    }
  }, 40);
}

function forceNavigationEvents(element) {
  if (!element) return;

  element.style.pointerEvents = "auto";
  element.style.cursor = "pointer";
  element.style.zIndex = "999999";

  if (element.classList.contains("nav-artist")) {
    element.removeEventListener("click", navigateToBio);
    element.addEventListener("click", navigateToBio, true);
  }
}

function navigateToBio(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  window.location.href = "bio.html";
}

function navigateToContact(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  window.location.href = "contact.html";
}

function updateGradientOnScroll(scrollProgress) {
  if (!_cachedGradientOverlay)
    _cachedGradientOverlay = document.querySelector(".gradient-overlay");
  const gradientOverlay = _cachedGradientOverlay;
  if (!gradientOverlay) return;

  const intensity = Math.max(0, scrollProgress);
  const blackProgress = intensity * 100;

  const gradientStart = Math.max(0, 95 - blackProgress * 0.95);
  const gradientMid = Math.max(0, 97 - blackProgress * 0.97);
  const gradientEnd = Math.max(0, 98.5 - blackProgress * 0.985);

  gradientOverlay.style.background = `linear-gradient(to bottom,
    transparent 0%,
    transparent ${gradientStart}%,
    rgba(204,204,204,0.4) ${gradientMid}%,
    rgba(102,102,102,0.8) ${gradientEnd}%,
    rgba(0,0,0,0.98) ${Math.min(gradientEnd + 3, 100)}%,
    rgba(0,0,0,1) 100%)`;
  gradientOverlay.style.opacity = 1;
}

// Crée l'élément Jaffar UNE SEULE FOIS (lazy), puis le garde dans le DOM
function ensureJaffarSection() {
  if (jaffarSectionEl) return;

  jaffarSectionEl = document.createElement("div");
  jaffarSectionEl.id = "jaffar-end-section";
  jaffarSectionEl.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: auto;
    background: transparent;
    z-index: 1000001;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: 0 24px 36px 24px;
    box-sizing: border-box;
    transform: translateY(100%);
    pointer-events: none;
    will-change: transform, opacity;
  `;

  jaffarSectionEl.innerHTML = `
    <p id="jaffar-end-text" style="
      color: white;
      font-family: 'Rebond Grotesque', sans-serif;
      font-weight: 200;
      font-size: 13px;
      line-height: 1.9;
      letter-spacing: 0.3px;
      text-align: center;
      margin: 0 0 18px 0;
      padding: 0 16px;
    ">
      Jaffar, c'est un alter-ego, un personnage focalisé sur l'instanté,${isMobileDevice() ? "" : "<br>"}encore en évolution. Affaire à suivre...
    </p>
    <button id="jaffar-return-btn" style="
      background: none;
      border: none;
      cursor: pointer;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="22" height="12" viewBox="0 0 22 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="transition: transform 0.3s ease;">
        <path d="M1 11L11 1L21 11" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  document.body.appendChild(jaffarSectionEl);

  // Événements sur le bouton retour
  const btn = document.getElementById("jaffar-return-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      // Simplement scroll vers le haut — le scroll handler gère tout le reste
      smoothScrollToTop();
    });
    const svg = btn.querySelector("svg");
    btn.addEventListener("mouseenter", () => {
      if (svg) svg.style.transform = "scale(1.15)";
    });
    btn.addEventListener("mouseleave", () => {
      if (svg) svg.style.transform = "scale(1)";
    });
  }
}

// Met à jour la position du texte Jaffar directement en fonction du scroll (scroll-linked)
function updateJaffarSection(scrollProgress) {
  // Utiliser le vrai ratio de scroll (0→1 sur toute la hauteur scrollable)
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const realProgress = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;

  // Zone d'animation du texte : realProgress 0.65 → 0.85 (finit avant la fin du scroll)
  const textStart = 0.65;
  const textEnd = 0.9;

  if (realProgress < textStart) {
    // Pas encore dans la zone → cacher complètement
    if (jaffarSectionEl) {
      jaffarSectionEl.style.transform = "translateY(100%)";
      jaffarSectionEl.style.opacity = "0";
      jaffarSectionEl.style.pointerEvents = "none";
    }
    return;
  }

  // Créer l'élément si nécessaire
  ensureJaffarSection();

  // Progression locale 0→1 dans la zone textStart→textEnd
  const t = Math.min(
    1,
    Math.max(0, (realProgress - textStart) / (textEnd - textStart)),
  );

  // translateY : 100% → 0% (vient d'en bas, repart en bas)
  const translateY = (1 - t) * 100;
  jaffarSectionEl.style.transform = `translateY(${translateY}%)`;
  jaffarSectionEl.style.opacity = String(t);
  jaffarSectionEl.style.pointerEvents = t > 0.8 ? "auto" : "none";
}

function createOrShowVideo(scrollProgress) {
  let videoContainer = document.getElementById("forced-video-container");

  if (!videoContainer) {
    videoContainer = document.createElement("div");
    videoContainer.id = "forced-video-container";
    videoContainer.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: transparent !important;
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: auto !important;
    `;

    const originalVideoPlayer = document.querySelector(".video-player");
    if (originalVideoPlayer) {
      const videoClone = originalVideoPlayer.cloneNode(true);
      videoClone.style.cssText = `
        width: 900px !important;
        max-width: 90vw !important;
        background: #000 !important;
        border-radius: 12px !important;
        position: relative !important;
        z-index: 1000000 !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8) !important;
        aspect-ratio: 16 / 9 !important;
      `;
      videoContainer.appendChild(videoClone);
      setupVideoPlayerForClone(videoClone);
    }

    document.body.appendChild(videoContainer);
  }

  const videoOpacity = Math.min(1, (scrollProgress - 0.35) / 0.35);
  videoContainer.style.opacity = videoOpacity;
  videoContainer.style.display = "flex";

  // Parallax : appliqué sur la vidéo elle-même, monte de +30px à -150px
  const t = Math.min(1, Math.max(0, (scrollProgress - 0.35) / 0.35));
  const parallaxY = Math.round(120 - 170 * t);
  const innerVideo = videoContainer.firstElementChild;
  if (innerVideo) innerVideo.style.transform = `translateY(${parallaxY}px)`;
}

function hideVideo() {
  const videoContainer = document.getElementById("forced-video-container");
  if (videoContainer) {
    videoContainer.style.opacity = 0;
    videoContainer.style.display = "none";
  }
}

function setupVideoPlayerForClone(videoPlayerClone) {
  const video = videoPlayerClone.querySelector("video");
  const videoThumbnail = videoPlayerClone.querySelector(".video-thumbnail");
  const playButton = videoPlayerClone.querySelector(".play-button");
  const playPauseBtn = videoPlayerClone.querySelector(".play-pause-btn");
  const timeline = videoPlayerClone.querySelector(".timeline");
  const timelineFilled = videoPlayerClone.querySelector(".timeline-filled");
  const timeDisplay = videoPlayerClone.querySelector(".time-display");
  const fullscreenBtn = videoPlayerClone.querySelector(".fullscreen-btn");
  const videoControls = videoPlayerClone.querySelector(".video-controls");

  if (!video || !playButton) return;

  playButton.addEventListener("click", function () {
    videoThumbnail.style.display = "none";
    video.style.display = "block";
    videoControls.style.display = "flex";
    video.play();
  });

  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", function () {
      if (video.paused) {
        video.play();
        this.textContent = "⏸";
      } else {
        video.pause();
        this.textContent = "▶";
      }
    });
  }

  if (timeline) {
    timeline.addEventListener("click", function (e) {
      const rect = this.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      video.currentTime = pos * video.duration;
    });
  }

  if (timelineFilled && timeDisplay) {
    video.addEventListener("timeupdate", function () {
      if (video.duration) {
        const progress = (video.currentTime / video.duration) * 100;
        timelineFilled.style.width = progress + "%";

        const current = formatTime(video.currentTime);
        const duration = formatTime(video.duration);
        timeDisplay.textContent = `${current} / ${duration}`;
      }
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", function () {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
      }
    });
  }

  video.addEventListener("loadedmetadata", function () {
    if (timeDisplay) {
      timeDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
    }
  });

  video.addEventListener("ended", function () {
    // When clone's video ends, restore its thumbnail and hide the clone's controls
    if (playPauseBtn) {
      playPauseBtn.textContent = "▶";
    }
    if (videoThumbnail) videoThumbnail.style.display = "block";
    if (video) video.style.display = "none";
    if (videoControls) videoControls.style.display = "none";
    try {
      video.currentTime = 0;
    } catch (e) {}
  });
}

function setupVideoPlayer() {
  if (!video || !videoThumbnail || !playButton) return;

  playButton.addEventListener("click", function () {
    videoThumbnail.style.display = "none";
    video.style.display = "block";
    videoControls.style.display = "flex";
    video.play();
  });

  playPauseBtn.addEventListener("click", function () {
    if (video.paused) {
      video.play();
      this.textContent = "⏸";
    } else {
      video.pause();
      this.textContent = "▶";
    }
  });

  timeline.addEventListener("click", function (e) {
    const rect = this.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  });

  video.addEventListener("timeupdate", function () {
    if (video.duration) {
      const progress = (video.currentTime / video.duration) * 100;
      timelineFilled.style.width = progress + "%";

      const current = formatTime(video.currentTime);
      const duration = formatTime(video.duration);
      timeDisplay.textContent = `${current} / ${duration}`;
    }
  });

  fullscreenBtn.addEventListener("click", function () {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.mozRequestFullScreen) {
      video.mozRequestFullScreen();
    }
  });

  video.addEventListener("loadedmetadata", function () {
    timeDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
  });

  video.addEventListener("ended", function () {
    // Reset controls and show thumbnail again when the video ends
    playPauseBtn.textContent = "▶";
    if (videoThumbnail) videoThumbnail.style.display = "block";
    if (video) video.style.display = "none";
    if (videoControls) videoControls.style.display = "none";
    try {
      video.currentTime = 0;
    } catch (e) {}
  });
}

// Scroll vers le haut — natif navigateur
function smoothScrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function showProject(projectId) {
  const project = projectsData.find((p) => p.id === parseInt(projectId));
  if (project) {
    window.location.href = project.file;
  }
}

function hidePage() {
  const pages = document.querySelectorAll(".page");
  pages.forEach((page) => {
    page.classList.remove("active");
  });
}

function setupNavigationClicks() {
  const artistNav = document.querySelector(".nav-artist");
  const contactNav = document.querySelector(".nav-item:not(.nav-artist)");

  if (artistNav) {
    artistNav.removeAttribute("onclick");
    artistNav.addEventListener("click", navigateToBio, true);
    artistNav.addEventListener(
      "mousedown",
      function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      },
      true,
    );
    artistNav.style.pointerEvents = "auto";
    artistNav.style.cursor = "pointer";
    artistNav.style.zIndex = "999999";
  }

  if (contactNav) {
    contactNav.removeAttribute("onclick");
    contactNav.addEventListener("click", navigateToContact, true);
    contactNav.addEventListener(
      "mousedown",
      function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      },
      true,
    );
    contactNav.style.pointerEvents = "auto";
    contactNav.style.cursor = "pointer";
    contactNav.style.zIndex = "999999";
  }
}

function forceNavigationClickable() {
  const navFixed = document.querySelector(".nav-fixed");
  const artistNav = document.querySelector(".nav-artist");
  const contactNav = document.querySelector(".nav-item:not(.nav-artist)");

  if (navFixed) {
    navFixed.style.pointerEvents = "auto";
    navFixed.style.zIndex = "999999";
  }

  if (artistNav) {
    artistNav.style.pointerEvents = "auto";
    artistNav.style.cursor = "pointer";
    artistNav.style.zIndex = "999999";
  }

  if (contactNav) {
    contactNav.style.pointerEvents = "auto";
    contactNav.style.cursor = "pointer";
    contactNav.style.zIndex = "999999";
  }
}
